"""
TZMICHA AI OS - Conversation Engine (Full Version)
The brain of voice calls. Handles:
- Free-flow natural conversations
- Topic switching & return
- Interruption handling
- Context-aware responses
- Multi-language switching
- Natural fillers and pauses
- RAG knowledge retrieval
- Workflow-guided conversations
- Voice enhancements for natural speech
"""

import asyncio
from typing import AsyncGenerator, Optional
from datetime import datetime

from core.models import MessageRole, ConversationContext, TopicStatus
from services.memory_service import MemoryService
from services.language_service import LanguageService
from services.knowledge_service import KnowledgeService
from services.workflow_service import WorkflowService
from services.voice_enhancer import VoiceEnhancer
from groq import Groq
from config import GROQ_API_KEY, AI_MODEL

_groq = Groq(api_key=GROQ_API_KEY)

class _GroqLLM:
    async def generate(self, messages, system_prompt="", temperature=0.7, max_tokens=150):
        msgs = ([{"role": "system", "content": system_prompt}] if system_prompt else []) + messages
        r = _groq.chat.completions.create(model=AI_MODEL, messages=msgs, temperature=temperature, max_tokens=max_tokens)
        return r.choices[0].message.content.strip()
    async def generate_stream(self, messages, system_prompt="", temperature=0.7, max_tokens=150):
        msgs = ([{"role": "system", "content": system_prompt}] if system_prompt else []) + messages
        stream = _groq.chat.completions.create(model=AI_MODEL, messages=msgs, temperature=temperature, max_tokens=max_tokens, stream=True)
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta


# System prompt - makes AI sound human, supports all features
VOICE_SYSTEM_PROMPT = """You are {ai_name}, a {role} at {company}.

PERSONALITY:
{personality}
- You talk like a REAL human on a phone call
- Keep responses SHORT (1-3 sentences max)
- Use natural language, not corporate speak
- Mirror the customer's energy and style
{custom_instructions}

PHONE CALL RULES:
- MAX 2-3 sentences per response
- Ask ONE question at a time
- If interrupted, STOP and address what they said
- If they switch topics, answer immediately, then naturally return
- Remember everything discussed - NEVER ask the same thing twice
- If they ask something you know from company knowledge, answer confidently
- If you don't know something, say "Let me check on that" or be honest

CONVERSATION INTELLIGENCE:
- Always maintain context of the full conversation
- When returning to a paused topic, use phrases like "As I was saying..." or "Coming back to..."
- Answer off-topic questions naturally without losing the thread
- Detect and respond to customer's mood/emotion

{language_instruction}

{workflow_instruction}

CONTEXT MEMORY:
{context_summary}

{knowledge_context}

REMEMBER: This is a phone call. Be natural. Be human. Keep it short."""


class ConversationService:
    """
    Core Conversation Engine - Full Version.
    
    Orchestrates ALL components:
    - LLM for response generation
    - Memory for context tracking
    - Language for multi-language support
    - Knowledge for RAG-based answers
    - Workflow for guided conversation flow
    - Voice Enhancer for natural speech
    """

    def __init__(
        self,
        llm=None,
        memory: MemoryService = None,
        language: LanguageService = None,
        knowledge: Optional[KnowledgeService] = None,
        workflow: Optional[WorkflowService] = None,
        voice_enhancer: Optional[VoiceEnhancer] = None,
        ai_name: str = "Alex",
        role: str = "AI Assistant",
        company: str = "",
        personality: str = "friendly, professional, helpful",
        custom_instructions: str = "",
        business_context: str = "",
    ):
        self.llm = llm or _GroqLLM()
        self.memory = memory or MemoryService()
        self.language = language or LanguageService()
        self.knowledge = knowledge
        self.workflow = workflow
        self.voice_enhancer = voice_enhancer or VoiceEnhancer()
        
        # AI Employee identity
        self.ai_name = ai_name
        self.role = role
        self.company = company
        self.personality = personality
        self.custom_instructions = custom_instructions
        self.business_context = business_context
        
        self._interrupt_flags: dict[str, bool] = {}
        self._knowledge_collection: Optional[str] = None

    def set_knowledge_base(self, collection_name: str):
        """Connect a knowledge base for RAG"""
        self._knowledge_collection = collection_name

    async def process_message(
        self,
        conversation_id: str,
        user_message: str,
        enhance_voice: bool = True,
    ) -> str:
        """
        Process a user message and get AI response.
        Full pipeline: Language → Memory → RAG → Workflow → LLM → Enhance
        """
        context = self.memory.get_conversation(conversation_id)
        if not context:
            return "I'm sorry, I don't have context for this conversation."

        # 1. Detect language
        detected_lang = await self.language.detect(user_message)

        # 2. Add user message to memory
        self.memory.add_message(
            conversation_id, MessageRole.USER, user_message, language=detected_lang
        )

        # 3. Check for topic switch
        is_topic_return = await self._handle_topic_switch(conversation_id, user_message)

        # 4. Get knowledge context (RAG)
        knowledge_context = ""
        if self.knowledge and self._knowledge_collection:
            knowledge_context = await self.knowledge.get_context_for_conversation(
                self._knowledge_collection, user_message
            )

        # 5. Get workflow instructions
        workflow_instruction = ""
        if self.workflow:
            workflow_instruction = self.workflow.get_current_instructions(conversation_id)

        # 6. Build system prompt
        system_prompt = self._build_system_prompt(
            conversation_id, knowledge_context, workflow_instruction
        )

        # 7. Get LLM messages
        messages = self.memory.get_llm_messages(conversation_id)

        # 8. Generate response
        response = await self.llm.generate(
            messages=messages,
            system_prompt=system_prompt,
            temperature=0.7,
            max_tokens=150,
        )

        # 9. Voice enhancement
        if enhance_voice and self.voice_enhancer:
            response = self.voice_enhancer.enhance(
                response,
                is_returning_to_topic=is_topic_return,
                is_after_interruption=self._interrupt_flags.get(conversation_id, False),
            )
            self._interrupt_flags[conversation_id] = False

        # 10. Store AI response
        self.memory.add_message(
            conversation_id, MessageRole.ASSISTANT, response, language=detected_lang
        )

        # 11. Process workflow transition
        if self.workflow:
            self.workflow.process_turn(conversation_id, user_message, response)

        return response

    async def process_message_stream(
        self,
        conversation_id: str,
        user_message: str,
    ) -> AsyncGenerator[str, None]:
        """
        Stream AI response token by token.
        Critical for voice calls - start TTS as soon as first tokens arrive.
        """
        context = self.memory.get_conversation(conversation_id)
        if not context:
            yield "I'm sorry, I don't have context for this conversation."
            return

        self._interrupt_flags[conversation_id] = False

        # 1. Detect language
        detected_lang = await self.language.detect(user_message)

        # 2. Add user message
        self.memory.add_message(
            conversation_id, MessageRole.USER, user_message, language=detected_lang
        )

        # 3. Handle topic switching
        await self._handle_topic_switch(conversation_id, user_message)

        # 4. RAG
        knowledge_context = ""
        if self.knowledge and self._knowledge_collection:
            knowledge_context = await self.knowledge.get_context_for_conversation(
                self._knowledge_collection, user_message
            )

        # 5. Workflow
        workflow_instruction = ""
        if self.workflow:
            workflow_instruction = self.workflow.get_current_instructions(conversation_id)

        # 6. Build prompt
        system_prompt = self._build_system_prompt(
            conversation_id, knowledge_context, workflow_instruction
        )
        messages = self.memory.get_llm_messages(conversation_id)

        # 7. Stream response
        full_response = ""
        async for chunk in self.llm.generate_stream(
            messages=messages,
            system_prompt=system_prompt,
            temperature=0.7,
            max_tokens=150,
        ):
            if self._interrupt_flags.get(conversation_id, False):
                full_response += "..."
                break
            full_response += chunk
            yield chunk

        # 8. Store response
        self.memory.add_message(
            conversation_id, MessageRole.ASSISTANT, full_response, language=detected_lang
        )

        # 9. Workflow transition
        if self.workflow:
            self.workflow.process_turn(conversation_id, user_message, full_response)

    def interrupt(self, conversation_id: str) -> None:
        """Signal interruption - stops current response"""
        self._interrupt_flags[conversation_id] = True

    async def start_conversation(
        self,
        customer_name: Optional[str] = None,
        customer_phone: Optional[str] = None,
        business_context: str = "",
        goal: str = "",
        language: str = "en",
        workflow_id: Optional[str] = None,
        knowledge_collection: Optional[str] = None,
        opening_message: Optional[str] = None,
    ) -> tuple[str, str]:
        """
        Start a new conversation.
        Returns (conversation_id, opening_message).
        """
        # Create conversation in memory
        context = self.memory.create_conversation(
            customer_name=customer_name,
            customer_phone=customer_phone,
            business_context=business_context or self.business_context,
            current_goal=goal,
            language=language,
        )

        # Set knowledge base
        if knowledge_collection:
            self._knowledge_collection = knowledge_collection

        # Start workflow
        if self.workflow and workflow_id:
            self.workflow.start_workflow(context.conversation_id, workflow_id)

        # Push initial topic
        if goal:
            self.memory.push_topic(context.conversation_id, goal)

        # Generate opening
        if not opening_message:
            opening_message = await self._generate_opening(context)

        # Store opening
        self.memory.add_message(
            context.conversation_id,
            MessageRole.ASSISTANT,
            opening_message,
            language=language,
        )

        return context.conversation_id, opening_message

    async def end_conversation(self, conversation_id: str) -> dict:
        """End conversation and return full analysis"""
        context = self.memory.get_conversation(conversation_id)
        if not context:
            return {"error": "Conversation not found"}

        # Get workflow result
        workflow_result = None
        if self.workflow:
            workflow_result = self.workflow.end_workflow(conversation_id)

        # Generate summary
        messages = context.get_recent_messages(30)
        summary_prompt = (
            "Summarize this conversation in 2-3 sentences. Include:\n"
            "- Customer interest level (hot/warm/cold)\n"
            "- Key information gathered\n"
            "- Any action items or next steps\n"
            "- Overall sentiment"
        )

        summary = await self.llm.generate(
            messages=messages + [{"role": "user", "content": summary_prompt}],
            system_prompt="You analyze conversations. Be concise and factual.",
            temperature=0.3,
            max_tokens=150,
        )

        # Cleanup
        self.memory.end_conversation(conversation_id)
        self._interrupt_flags.pop(conversation_id, None)

        return {
            "conversation_id": conversation_id,
            "summary": summary,
            "total_messages": len(context.messages),
            "topics_discussed": [t.topic_name for t in context.topic_stack],
            "language_used": context.current_language,
            "workflow_result": workflow_result,
        }

    # ===== Private Methods =====

    async def _handle_topic_switch(self, conversation_id: str, user_message: str) -> bool:
        """Detect and handle topic switching. Returns True if resumed a topic."""
        resume_topic = self.memory.detect_topic_switch(conversation_id, user_message)
        if resume_topic:
            self.memory.resume_topic(conversation_id, resume_topic)
            return True

        # Check for new topic diversion
        context = self.memory.get_conversation(conversation_id)
        if not context:
            return False

        active = context.active_topic
        if not active:
            return False

        # Heuristic: question unrelated to current topic = new topic
        question_indicators = ["what", "how", "when", "where", "who", "why", "tell me", "explain"]
        msg_lower = user_message.lower()

        is_question = any(msg_lower.startswith(q) or f" {q} " in msg_lower for q in question_indicators)

        if is_question and active.topic_name.lower() not in msg_lower:
            words = user_message.split()[:4]
            new_topic = " ".join(words).strip("?.,!")
            if new_topic and len(new_topic) > 3:
                self.memory.push_topic(conversation_id, new_topic)

        return False

    def _build_system_prompt(
        self,
        conversation_id: str,
        knowledge_context: str = "",
        workflow_instruction: str = "",
    ) -> str:
        """Build complete system prompt with all context"""
        context_summary = self.memory.get_context_summary(conversation_id)
        language_instruction = self.language.get_language_instruction()

        custom = f"\nADDITIONAL INSTRUCTIONS: {self.custom_instructions}" if self.custom_instructions else ""
        knowledge = f"\n{knowledge_context}" if knowledge_context else "\n(No company knowledge loaded for this query)"
        workflow = f"\nWORKFLOW GUIDANCE:\n{workflow_instruction}" if workflow_instruction else ""

        return VOICE_SYSTEM_PROMPT.format(
            ai_name=self.ai_name,
            role=self.role,
            company=self.company or "the company",
            personality=self.personality,
            custom_instructions=custom,
            language_instruction=language_instruction,
            workflow_instruction=workflow,
            context_summary=context_summary,
            knowledge_context=knowledge,
        )

    async def _generate_opening(self, context: ConversationContext) -> str:
        """Generate a natural opening message"""
        name_part = f" {context.customer_name}" if context.customer_name else ""

        prompt = (
            f"Generate a natural phone call opening. "
            f"You're {self.ai_name}, a {self.role}. "
            f"You're calling{name_part}. "
            f"Goal: {context.current_goal or 'General conversation'}. "
            f"Rules: Max 2 sentences. Sound human, friendly, not scripted."
        )

        opening = await self.llm.generate(
            messages=[{"role": "user", "content": prompt}],
            system_prompt=f"You are {self.ai_name}, a friendly {self.role}. Keep it super short and natural.",
            temperature=0.8,
            max_tokens=50,
        )

        return opening or f"Hey{name_part}! This is {self.ai_name}, got a quick moment?"
