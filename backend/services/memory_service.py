"""
TZMICHA AI OS - Memory Service
Manages conversation context, topic history, and customer memory.
Never loses context. Supports topic switching and return.
"""

import uuid
from datetime import datetime
from typing import Optional

from core.models import (
    ConversationContext,
    ConversationMessage,
    TopicState,
    TopicStatus,
    MessageRole,
)


class MemoryService:
    """
    Conversation Memory Manager.
    
    Responsibilities:
    - Maintain full conversation history
    - Track topic stack (push/pop/pause/resume)
    - Store customer details and business context
    - Provide windowed context for LLM (avoid token overflow)
    - Support context switching without losing memory
    """

    def __init__(self, memory_window_size: int = 20):
        self.memory_window_size = memory_window_size
        self._conversations: dict[str, ConversationContext] = {}

    def create_conversation(
        self,
        customer_name: Optional[str] = None,
        customer_phone: Optional[str] = None,
        business_context: str = "",
        current_goal: str = "",
        language: str = "en",
    ) -> ConversationContext:
        """Create a new conversation with context"""
        conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
        
        context = ConversationContext(
            conversation_id=conversation_id,
            customer_name=customer_name,
            customer_phone=customer_phone,
            business_context=business_context,
            current_goal=current_goal,
            current_language=language,
        )
        
        self._conversations[conversation_id] = context
        return context

    def get_conversation(self, conversation_id: str) -> Optional[ConversationContext]:
        """Retrieve conversation by ID"""
        return self._conversations.get(conversation_id)

    def add_message(
        self,
        conversation_id: str,
        role: MessageRole,
        content: str,
        language: str = "en",
        **metadata,
    ) -> None:
        """Add a message to conversation history"""
        context = self._conversations.get(conversation_id)
        if not context:
            return

        context.add_message(role=role, content=content, language=language, **metadata)
        
        # Update language if changed
        if language != context.current_language:
            context.current_language = language

    def get_llm_messages(self, conversation_id: str) -> list[dict]:
        """
        Get messages formatted for LLM, windowed to avoid token overflow.
        Always includes: system context summary + recent messages.
        """
        context = self._conversations.get(conversation_id)
        if not context:
            return []

        return context.get_recent_messages(self.memory_window_size)

    def get_context_summary(self, conversation_id: str) -> str:
        """
        Build a context summary for the LLM system prompt.
        Includes: customer info, active topic, paused topics, goal.
        This ensures the AI never loses context even with windowed messages.
        """
        context = self._conversations.get(conversation_id)
        if not context:
            return ""

        parts = []

        # Customer info
        if context.customer_name:
            parts.append(f"Customer: {context.customer_name}")
        if context.customer_phone:
            parts.append(f"Phone: {context.customer_phone}")

        # Business context
        if context.business_context:
            parts.append(f"Business: {context.business_context}")

        # Current goal
        if context.current_goal:
            parts.append(f"Goal: {context.current_goal}")

        # Active topic
        active = context.active_topic
        if active:
            parts.append(f"Current Topic: {active.topic_name}")
            if active.key_points:
                parts.append(f"Key Points Discussed: {', '.join(active.key_points[-5:])}")

        # Paused topics (so AI knows what to return to)
        paused = context.paused_topics
        if paused:
            paused_names = [t.topic_name for t in paused]
            parts.append(f"Paused Topics (customer may return): {', '.join(paused_names)}")

        # Language
        parts.append(f"Current Language: {context.current_language}")

        return "\n".join(parts)

    # ===== Topic Management =====

    def push_topic(self, conversation_id: str, topic_name: str, context_summary: str = "") -> TopicState:
        """
        Push a new topic onto the stack.
        If there's an active topic, it gets paused automatically.
        """
        context = self._conversations.get(conversation_id)
        if not context:
            raise ValueError(f"Conversation {conversation_id} not found")

        # Pause current active topic
        active = context.active_topic
        if active:
            active.status = TopicStatus.PAUSED
            active.paused_at = datetime.utcnow()

        # Create new topic
        topic = TopicState(
            topic_id=f"topic_{uuid.uuid4().hex[:8]}",
            topic_name=topic_name,
            status=TopicStatus.ACTIVE,
            context_summary=context_summary,
        )
        context.topic_stack.append(topic)
        return topic

    def resume_topic(self, conversation_id: str, topic_name: str) -> Optional[TopicState]:
        """
        Resume a paused topic. Current active topic gets paused.
        Used when customer says "continue about fees" etc.
        """
        context = self._conversations.get(conversation_id)
        if not context:
            return None

        # Find the paused topic
        target = None
        for topic in context.topic_stack:
            if topic.topic_name.lower() == topic_name.lower() and topic.status == TopicStatus.PAUSED:
                target = topic
                break

        if not target:
            return None

        # Pause current active
        active = context.active_topic
        if active:
            active.status = TopicStatus.PAUSED
            active.paused_at = datetime.utcnow()

        # Resume target
        target.status = TopicStatus.ACTIVE
        target.paused_at = None
        return target

    def complete_topic(self, conversation_id: str) -> Optional[TopicState]:
        """
        Mark current topic as completed.
        Automatically resumes most recent paused topic.
        """
        context = self._conversations.get(conversation_id)
        if not context:
            return None

        active = context.active_topic
        if active:
            active.status = TopicStatus.COMPLETED

        # Resume most recent paused topic
        for topic in reversed(context.topic_stack):
            if topic.status == TopicStatus.PAUSED:
                topic.status = TopicStatus.ACTIVE
                topic.paused_at = None
                return topic

        return None

    def add_key_point(self, conversation_id: str, point: str) -> None:
        """Add a key point to the current active topic"""
        context = self._conversations.get(conversation_id)
        if not context:
            return

        active = context.active_topic
        if active:
            active.key_points.append(point)

    def detect_topic_switch(self, conversation_id: str, user_message: str) -> Optional[str]:
        """
        Check if user message references a previously paused topic.
        Returns the topic name if found, None otherwise.
        Used by Conversation Engine to auto-resume topics.
        """
        context = self._conversations.get(conversation_id)
        if not context:
            return None

        message_lower = user_message.lower()
        
        # Check resume signals
        resume_signals = [
            "continue about", "back to", "return to", "as you were saying",
            "going back to", "about the", "regarding", "what about",
            "tell me more about", "continue with",
        ]

        for topic in context.topic_stack:
            if topic.status != TopicStatus.PAUSED:
                continue

            topic_lower = topic.topic_name.lower()
            
            # Check if user message references this topic
            if topic_lower in message_lower:
                return topic.topic_name

            # Check resume signals + topic name
            for signal in resume_signals:
                if signal in message_lower and any(
                    word in message_lower for word in topic_lower.split()
                ):
                    return topic.topic_name

        return None

    # ===== Session Management =====

    def end_conversation(self, conversation_id: str) -> Optional[ConversationContext]:
        """End and archive a conversation"""
        return self._conversations.pop(conversation_id, None)

    def get_active_conversations(self) -> list[str]:
        """List all active conversation IDs"""
        return list(self._conversations.keys())
