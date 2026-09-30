from __future__ import annotations

import random
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from database import get_db
from auth import get_current_user
from models import Meeting, MeetingStatus, Participant, ParticipantRole, User

router = APIRouter(prefix="/meetings", tags=["meetings"])
MEETING_CODE_ATTEMPTS = 100


class MeetingCreate(BaseModel):
    title: str = Field(default="Instant meeting", min_length=1, max_length=200)
    description: str | None = None
    duration_min: int = Field(default=60, gt=0)
    scheduled_start: datetime | None = None
    host_id: int | None = None
    host_email: str | None = None


class JoinMeetingRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)
    user_id: int | None = None


class ParticipantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None
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


def get_host_user(db: Session, host_id: int | None = None, host_email: str | None = None) -> User:
    """Get the authenticated host user for meeting creation."""
    user = None
    if host_id is not None:
        user = db.scalar(select(User).where(User.id == host_id))
    elif host_email is not None:
        user = db.scalar(select(User).where(func.lower(User.email) == host_email.strip().lower()))

    if user is None:
        # Check if any user exists in DB, or get first user
        user = db.scalar(select(User).order_by(User.id))
        if user is None:
            # Create default host if DB is empty
            user = User(
                display_name="Arvind Choudhary",
                email="arvind@example.com",
                password_hash="default_hash",
            )
            db.add(user)
            db.flush()

    return user


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
    db: Session, payload: MeetingCreate, meeting_status: MeetingStatus, host: User
) -> Meeting:
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

    # Automatically add host as initial participant
    host_participant = Participant(
        meeting=meeting,
        user=host,
        display_name=f"{host.display_name} (Host)",
        role=ParticipantRole.HOST,
        joined_at=datetime.now(UTC).replace(tzinfo=None),
    )
    db.add(host_participant)

    db.commit()
    return get_meeting_or_404(db, meeting.meeting_code)


@router.post("/instant", response_model=MeetingResponse, status_code=201)
def create_instant_meeting(
    payload: MeetingCreate = MeetingCreate(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Meeting:
    return create_meeting(db, payload, MeetingStatus.LIVE, current_user)


@router.post("/schedule", response_model=MeetingResponse, status_code=201)
def schedule_meeting(
    payload: MeetingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Meeting:
    if payload.scheduled_start is None:
        raise HTTPException(status_code=422, detail="scheduled_start is required")
    return create_meeting(db, payload, MeetingStatus.SCHEDULED, current_user)


@router.get("/upcoming", response_model=list[MeetingResponse])
def list_upcoming_meetings(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[Meeting]:
    now = datetime.now(UTC).replace(tzinfo=None)
    return list(
        db.scalars(
            select(Meeting)
            .options(selectinload(Meeting.participants))
            .where(
                Meeting.status == MeetingStatus.SCHEDULED,
                Meeting.scheduled_start >= now,
                Meeting.host_id == current_user.id,
            )
            .order_by(Meeting.scheduled_start)
        ).all()
    )


@router.get("/recent", response_model=list[MeetingResponse])
def list_recent_meetings(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[Meeting]:
    return list(
        db.scalars(
            select(Meeting)
            .options(selectinload(Meeting.participants))
            .outerjoin(Participant, Participant.meeting_id == Meeting.id)
            .where(
                Meeting.status == MeetingStatus.ENDED,
                (Meeting.host_id == current_user.id) | (Participant.user_id == current_user.id),
            )
            .distinct()
            .order_by(Meeting.created_at.desc())
        ).all()
    )


@router.get("/{code}", response_model=MeetingResponse)
def get_meeting(code: str, db: Session = Depends(get_db)) -> Meeting:
    return get_meeting_or_404(db, code)


@router.post("/{code}/join", response_model=ParticipantResponse, status_code=201)
def join_meeting(
    code: str, payload: JoinMeetingRequest, db: Session = Depends(get_db)
) -> Participant:
    """ANYONE can join a meeting through the link by entering a display name."""
    meeting = get_meeting_or_404(db, code)
    display_name = payload.display_name.strip()

    user_obj = None
    if payload.user_id is not None:
        user_obj = db.scalar(select(User).where(User.id == payload.user_id))

    if user_obj is not None:
        active_user_participant = db.scalar(
            select(Participant).where(
                Participant.meeting_id == meeting.id,
                Participant.user_id == user_obj.id,
                Participant.left_at.is_(None),
            )
        )
        if active_user_participant is not None:
            return active_user_participant

    active_participant = db.scalar(
        select(Participant).where(
            Participant.meeting_id == meeting.id,
            func.lower(Participant.display_name) == display_name.lower(),
            Participant.left_at.is_(None),
        )
    )
    if active_participant is not None:
        return active_participant

    participant = Participant(
        meeting=meeting,
        user=user_obj,
        display_name=display_name,
        role=ParticipantRole.HOST if (user_obj and user_obj.id == meeting.host_id) else ParticipantRole.PARTICIPANT,
        joined_at=datetime.now(UTC).replace(tzinfo=None),
    )
    meeting.status = MeetingStatus.LIVE
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


@router.post("/{code}/leave", response_model=MeetingResponse)
def leave_meeting(
    code: str,
    display_name: str = Query(..., min_length=1, max_length=120),
    db: Session = Depends(get_db),
) -> Meeting:
    meeting = get_meeting_or_404(db, code)
    now = datetime.now(UTC).replace(tzinfo=None)
    normalized_name = display_name.strip()
    participant = db.scalar(
        select(Participant).where(
            Participant.meeting_id == meeting.id,
            func.lower(Participant.display_name) == normalized_name.lower(),
            Participant.left_at.is_(None),
        )
    )
    if participant is None:
        raise HTTPException(status_code=404, detail="Active participant not found")
    participant.left_at = now
    db.flush()

    remaining_participant = db.scalar(
        select(Participant.id).where(
            Participant.meeting_id == meeting.id,
            Participant.left_at.is_(None),
        )
    )
    if remaining_participant is None:
        meeting.status = MeetingStatus.ENDED

    db.commit()
    return get_meeting_or_404(db, code)


@router.get("/{code}/participants", response_model=ParticipantListResponse)
def list_participants(code: str, db: Session = Depends(get_db)) -> ParticipantListResponse:
    meeting = get_meeting_or_404(db, code)
    participants = list(
        db.scalars(
            select(Participant)
            .where(
                Participant.meeting_id == meeting.id,
                Participant.left_at.is_(None),
            )
            .order_by(Participant.joined_at)
        ).all()
    )
    return ParticipantListResponse(participants=participants)