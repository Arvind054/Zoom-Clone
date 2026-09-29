from __future__ import annotations

import random
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from database import get_db
from models import Base, Meeting, MeetingStatus, Participant, ParticipantRole, User


router = APIRouter(prefix="/meetings", tags=["meetings"])
DEFAULT_HOST_NAME = "Arvind Choudhary"
MEETING_CODE_ATTEMPTS = 100


class MeetingCreate(BaseModel):
    title: str = Field(default="Instant meeting", min_length=1, max_length=200)
    description: str | None = None
    duration_min: int = Field(default=60, gt=0)
    scheduled_start: datetime | None = None


class JoinMeetingRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)


class ParticipantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str
    role: ParticipantRole
    is_muted: bool
    joined_at: datetime
    left_at: datetime | None


class MeetingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_code: str
    title: str
    description: str | None
    host_id: int
    scheduled_start: datetime | None
    duration_min: int
    status: MeetingStatus
    created_at: datetime
    participants: list[ParticipantResponse] = Field(default_factory=list)


class ParticipantListResponse(BaseModel):
    participants: list[ParticipantResponse]


def generate_unique_meeting_code(
    db: Session, attempts: int = MEETING_CODE_ATTEMPTS
) -> str:
    """Generate a 123-456-7890 code, retrying candidates already in the database."""
    for _ in range(attempts):
        code = f"{random.randint(0, 999):03d}-{random.randint(0, 999):03d}-{random.randint(0, 9999):04d}"
        if db.scalar(select(Meeting.id).where(Meeting.meeting_code == code)) is None:
            return code
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Could not generate a unique meeting code",
    )


def get_or_create_default_host(db: Session) -> User:
    host = db.scalar(select(User).where(User.display_name == DEFAULT_HOST_NAME))
    if host is None:
        host = User(display_name=DEFAULT_HOST_NAME)
        db.add(host)
        db.flush()
    return host


def get_meeting_query(code: str):
    return (
        select(Meeting)
        .options(selectinload(Meeting.participants))
        .where(Meeting.meeting_code == code)
    )


def get_meeting_or_404(db: Session, code: str) -> Meeting:
    meeting = db.scalar(get_meeting_query(code))
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


def create_meeting(
    db: Session, payload: MeetingCreate, meeting_status: MeetingStatus
) -> Meeting:
    host = get_or_create_default_host(db)
    meeting = Meeting(
        meeting_code=generate_unique_meeting_code(db),
        title=payload.title,
        description=payload.description,
        host=host,
        scheduled_start=payload.scheduled_start or datetime.now(UTC).replace(tzinfo=None),
        duration_min=payload.duration_min,
        status=meeting_status,
    )
    db.add(meeting)
    db.commit()
    return get_meeting_or_404(db, meeting.meeting_code)


@router.post("/instant", response_model=MeetingResponse, status_code=201)
def create_instant_meeting(
    payload: MeetingCreate = MeetingCreate(), db: Session = Depends(get_db)
) -> Meeting:
    return create_meeting(db, payload, MeetingStatus.LIVE)


@router.post("/schedule", response_model=MeetingResponse, status_code=201)
def schedule_meeting(payload: MeetingCreate, db: Session = Depends(get_db)) -> Meeting:
    if payload.scheduled_start is None:
        raise HTTPException(status_code=422, detail="scheduled_start is required")
    return create_meeting(db, payload, MeetingStatus.SCHEDULED)


@router.get("/upcoming", response_model=list[MeetingResponse])
def list_upcoming_meetings(db: Session = Depends(get_db)) -> list[Meeting]:
    now = datetime.now(UTC).replace(tzinfo=None)
    return list(
        db.scalars(
            select(Meeting)
            .options(selectinload(Meeting.participants))
            .where(
                Meeting.status == MeetingStatus.SCHEDULED,
                Meeting.scheduled_start >= now,
            )
            .order_by(Meeting.scheduled_start)
        ).all()
    )


@router.get("/recent", response_model=list[MeetingResponse])
def list_recent_meetings(db: Session = Depends(get_db)) -> list[Meeting]:
    return list(
        db.scalars(
            select(Meeting)
            .options(selectinload(Meeting.participants))
            .where(Meeting.status == MeetingStatus.ENDED)
            .order_by(Meeting.scheduled_start.desc())
        ).all()
    )


@router.get("/{code}", response_model=MeetingResponse)
def get_meeting(code: str, db: Session = Depends(get_db)) -> Meeting:
    return get_meeting_or_404(db, code)


@router.post("/{code}/join", response_model=ParticipantResponse, status_code=201)
def join_meeting(
    code: str, payload: JoinMeetingRequest, db: Session = Depends(get_db)
) -> Participant:
    meeting = get_meeting_or_404(db, code)
    active_participant = db.scalar(
        select(Participant).where(
            Participant.meeting_id == meeting.id,
            Participant.display_name == payload.display_name,
            Participant.left_at.is_(None),
        )
    )
    if active_participant is not None:
        return active_participant

    participant = Participant(
        meeting=meeting,
        display_name=payload.display_name,
        role=ParticipantRole.PARTICIPANT,
        joined_at=datetime.now(UTC).replace(tzinfo=None),
    )
    meeting.status = MeetingStatus.LIVE
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


@router.post("/{code}/leave", response_model=MeetingResponse)
def leave_meeting(code: str, db: Session = Depends(get_db)) -> Meeting:
    meeting = get_meeting_or_404(db, code)
    now = datetime.now(UTC).replace(tzinfo=None)
    db.execute(
        update(Participant)
        .where(Participant.meeting_id == meeting.id, Participant.left_at.is_(None))
        .values(left_at=now)
    )
    meeting.status = MeetingStatus.ENDED
    db.commit()
    return get_meeting_or_404(db, code)


@router.get("/{code}/participants", response_model=ParticipantListResponse)
def list_participants(code: str, db: Session = Depends(get_db)) -> ParticipantListResponse:
    meeting = get_meeting_or_404(db, code)
    participants = list(
        db.scalars(
            select(Participant)
            .where(Participant.meeting_id == meeting.id)
            .order_by(Participant.joined_at)
        ).all()
    )
    return ParticipantListResponse(participants=participants)