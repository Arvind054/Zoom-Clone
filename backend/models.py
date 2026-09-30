from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base class for all database models."""


class MeetingStatus(str, Enum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    ENDED = "ended"


class ParticipantRole(str, Enum):
    HOST = "host"
    PARTICIPANT = "participant"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    hosted_meetings: Mapped[list[Meeting]] = relationship(
        back_populates="host",
        foreign_keys="Meeting.host_id",
    )
    participations: Mapped[list[Participant]] = relationship(
        back_populates="user",
        foreign_keys="Participant.user_id",
    )


class Meeting(Base):
    __tablename__ = "meetings"
    __table_args__ = (
        Index("ix_meetings_meeting_code", "meeting_code"),
        CheckConstraint(
            "meeting_code GLOB '[0-9][0-9][0-9]-[0-9][0-9][0-9]-[0-9][0-9][0-9][0-9]'",
            name="ck_meetings_meeting_code_format",
        ),
        CheckConstraint(
            "duration_min > 0",
            name="ck_meetings_duration_positive",
        ),
        CheckConstraint(
            "status IN ('scheduled', 'live', 'ended')",
            name="ck_meetings_status",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    meeting_code: Mapped[str] = mapped_column(String(12), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    host_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    scheduled_start: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    duration_min: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[MeetingStatus] = mapped_column(
        String(10), default=MeetingStatus.SCHEDULED, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    host: Mapped[User] = relationship(
        back_populates="hosted_meetings",
        foreign_keys=[host_id],
    )
    participants: Mapped[list[Participant]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
    )


class Participant(Base):
    __tablename__ = "participants"
    __table_args__ = (
        CheckConstraint(
            "role IN ('host', 'participant')",
            name="ck_participants_role",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id"), nullable=False, index=True
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True, index=True
    )
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[ParticipantRole] = mapped_column(
        String(11), default=ParticipantRole.PARTICIPANT, nullable=False
    )
    is_muted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    left_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    meeting: Mapped[Meeting] = relationship(back_populates="participants")
    user: Mapped[User | None] = relationship(
        back_populates="participations",
        foreign_keys=[user_id],
    )