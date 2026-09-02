"""
TZMICHA AI OS - Core Data Models
Shared across all modules. Provider-independent.
"""

from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime
from enum import Enum


class MessageRole(str, Enum):
    SYSTEM = "system"
    ASSISTANT = "assistant"
    USER = "user"


class CallStatus(str, Enum):
    INITIATING = "initiating"
    RINGING = "ringing"
    CONNECTED = "connected"
    SPEAKING = "speaking"
    LISTENING = "listening"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class TopicStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    DIVERTED = "diverted"


@dataclass
class ConversationMessage:
    """Single message in a conversation"""
    role: MessageRole
    content: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    language: str = "en"
    metadata: dict = field(default_factory=dict)


@dataclass
class TopicState:
    """Tracks a topic in conversation for context switching"""
    topic_id: str
    topic_name: str
    status: TopicStatus = TopicStatus.ACTIVE
    context_summary: str = ""
    started_at: datetime = field(default_factory=datetime.utcnow)
    paused_at: Optional[datetime] = None
    key_points: list[str] = field(default_factory=list)


@dataclass
class ConversationContext:
    """Full conversation state - memory, topics, goals"""
    conversation_id: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    business_context: str = ""
    current_goal: str = ""
    current_language: str = "en"
    messages: list[ConversationMessage] = field(default_factory=list)
    topic_stack: list[TopicState] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def active_topic(self) -> Optional[TopicState]:
        """Get the currently active topic"""
        for topic in reversed(self.topic_stack):
            if topic.status == TopicStatus.ACTIVE:
                return topic
        return None

    @property
    def paused_topics(self) -> list[TopicState]:
        """Get all paused/diverted topics"""
        return [t for t in self.topic_stack if t.status in (TopicStatus.PAUSED, TopicStatus.DIVERTED)]

    def add_message(self, role: MessageRole, content: str, language: str = "en", **metadata):
        """Add message to history"""
        self.messages.append(ConversationMessage(
            role=role,
            content=content,
            language=language,
            metadata=metadata,
        ))

    def get_recent_messages(self, count: int = 20) -> list[dict]:
        """Get recent messages formatted for LLM"""
        recent = self.messages[-count:]
        return [{"role": m.role.value, "content": m.content} for m in recent]


@dataclass
class VoiceCallState:
    """State of a live voice call"""
    call_id: str
    conversation: ConversationContext
    status: CallStatus = CallStatus.INITIATING
    twilio_sid: Optional[str] = None
    phone_number: Optional[str] = None
    started_at: datetime = field(default_factory=datetime.utcnow)
    audio_buffer: bytes = b""
    is_interrupted: bool = False
    current_tts_task: Optional[str] = None  # Track if TTS is playing
