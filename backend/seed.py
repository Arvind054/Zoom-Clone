from __future__ import annotations

import os
from datetime import UTC, datetime, timedelta

from sqlalchemy import create_engine, delete, select
from sqlalchemy.orm import Session

from models import Base, Meeting, MeetingStatus, Participant, ParticipantRole, User


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///zoom_clone.db")
DEFAULT_USER_NAME = "Arvind Choudhary"

MEETINGS = [
    {
        "code": "100-200-3001",
        "title": "Product roadmap review",
        "description": "Quarterly planning for the product and engineering teams.",
        "days_from_now": 1,
        "hour": 10,
        "duration_min": 60,
    },
    {
        "code": "100-200-3002",
        "title": "Design critique: mobile onboarding",
        "description": "Review the latest onboarding flows and accessibility updates.",
        "days_from_now": 3,
        "hour": 14,
        "duration_min": 45,
    },
    {
        "code": "100-200-3003",
        "title": "Customer success sync",
        "description": "Share customer feedback, risks, and upcoming account priorities.",
        "days_from_now": 6,
        "hour": 11,
        "duration_min": 30,
    },
    {
        "code": "100-200-3004",
        "title": "Platform architecture workshop",
        "description": "Map the next phase of the platform and its service boundaries.",
        "days_from_now": 10,
        "hour": 15,
        "duration_min": 90,
    },
    {
        "code": "100-200-3005",
        "title": "Monthly team retrospective",
        "description": "Reflect on the month and agree on a small set of improvements.",
        "days_from_now": 14,
        "hour": 16,
        "duration_min": 60,
    },
    {
        "code": "100-200-3011",
        "title": "Sprint planning",
        "description": "Plan the sprint backlog and confirm ownership for each deliverable.",
        "days_from_now": -1,
        "hour": 9,
        "duration_min": 60,
    },
    {
        "code": "100-200-3012",
        "title": "Q3 budget check-in",
        "description": "Review spend against plan and discuss the next funding requests.",
        "days_from_now": -4,
        "hour": 13,
        "duration_min": 45,
    },
    {
        "code": "100-200-3013",
        "title": "Frontend performance deep dive",
        "description": "Walk through bundle size, rendering metrics, and performance wins.",
        "days_from_now": -8,
        "hour": 10,
        "duration_min": 75,
    },
    {
        "code": "100-200-3014",
        "title": "Partner integration kickoff",
        "description": "Align on the API contract, milestones, and integration responsibilities.",
        "days_from_now": -15,
        "hour": 11,
        "duration_min": 60,
    },
    {
        "code": "100-200-3015",
        "title": "Engineering all-hands",
        "description": "Team updates, technical highlights, and open questions.",
        "days_from_now": -22,
        "hour": 16,
        "duration_min": 45,
    },
]

PARTICIPANTS = [
    ("Priya Shah", True),
    ("Marcus Lee", False),
    ("Elena Rodriguez", False),
]


def get_or_create_default_user(session: Session) -> User:
    user = session.scalar(
        select(User).where(User.display_name == DEFAULT_USER_NAME)
    )
    if user is None:
        user = User(display_name=DEFAULT_USER_NAME)
        session.add(user)
        session.flush()
    return user


def seed_database() -> None:
    engine = create_engine(DATABASE_URL)
    Base.metadata.create_all(engine)
    now = datetime.now(UTC).replace(tzinfo=None, second=0, microsecond=0)

    with Session(engine) as session:
        host = get_or_create_default_user(session)

        for index, details in enumerate(MEETINGS):
            scheduled_start = now + timedelta(
                days=details["days_from_now"], hours=details["hour"] - now.hour
            )
            is_past = details["days_from_now"] < 0
            meeting = session.scalar(
                select(Meeting).where(Meeting.meeting_code == details["code"])
            )
            if meeting is None:
                meeting = Meeting(meeting_code=details["code"])
                session.add(meeting)

            meeting.title = details["title"]
            meeting.description = details["description"]
            meeting.host = host
            meeting.scheduled_start = scheduled_start
            meeting.duration_min = details["duration_min"]
            meeting.status = MeetingStatus.ENDED if is_past else MeetingStatus.SCHEDULED
            meeting.created_at = scheduled_start - timedelta(days=7)
            session.flush()

            session.execute(
                delete(Participant).where(Participant.meeting_id == meeting.id)
            )
            session.add(
                Participant(
                    meeting=meeting,
                    user=host,
                    display_name=host.display_name,
                    role=ParticipantRole.HOST,
                    is_muted=False,
                    joined_at=scheduled_start + timedelta(minutes=2),
                    left_at=(
                        scheduled_start + timedelta(minutes=meeting.duration_min)
                        if is_past
                        else None
                    ),
                )
            )
            for participant_index, (display_name, is_muted) in enumerate(PARTICIPANTS):
                joined_at = scheduled_start + timedelta(minutes=5 + participant_index)
                session.add(
                    Participant(
                        meeting=meeting,
                        display_name=display_name,
                        role=ParticipantRole.PARTICIPANT,
                        is_muted=is_muted,
                        joined_at=joined_at,
                        left_at=(
                            scheduled_start + timedelta(minutes=meeting.duration_min)
                            if is_past
                            else None
                        ),
                    )
                )

        session.commit()

    print(f"Seeded {len(MEETINGS)} meetings for {DEFAULT_USER_NAME} in {DATABASE_URL}")


if __name__ == "__main__":
    seed_database()