"""
TZMICHA AI OS - Voice Call Service
Manages real-time voice calls with streaming audio.
Orchestrates: STT -> Conversation Engine -> TTS pipeline.
Supports interruptions, natural pauses, and real-time audio streaming.
"""

import asyncio
import base64
import json
import time
from typing import Optional, Callable
from datetime import datetime

from ..core.interfaces import STTProvider, TTSProvider
from ..core.models import VoiceCallState, CallStatus, MessageRole
from .conversation_service import ConversationService
from .memory_service import MemoryService


class VoiceCallService:
    """
    Real-time Voice Call Orchestrator.
    
    Pipeline:
    Audio In -> STT (streaming) -> Conversation Engine -> TTS (streaming) -> Audio Out
    
    Features:
    - Real-time bidirectional audio streaming
    - Barge-in / interruption detection
    - Natural silence handling
    - Concurrent STT + TTS processing
    """

    def __init__(
        self,
        stt: STTProvider,
        tts: TTSProvider,
        conversation: ConversationService,
        memory: MemoryService,
    ):
        self.stt = stt
        self.tts = tts
        self.conversation = conversation
        self.memory = memory
        self._active_calls: dict[str, VoiceCallState] = {}
        self._tts_tasks: dict[str, asyncio.Task] = {}

    async def start_call(
        self,
        call_id: str,
        customer_name: Optional[str] = None,
        customer_phone: Optional[str] = None,
        business_context: str = "",
        goal: str = "",
        language: str = "en",
    ) -> tuple[str, str]:
        """
        Initialize a new voice call.
        Returns (conversation_id, opening_audio_base64).
        """
        # Start conversation
        conversation_id, opening_message = await self.conversation.start_conversation(
            customer_name=customer_name,
            customer_phone=customer_phone,
            business_context=business_context,
            goal=goal,
            language=language,
        )

        # Get conversation context
        context = self.memory.get_conversation(conversation_id)

        # Create call state
        call_state = VoiceCallState(
            call_id=call_id,
            conversation=context,
            status=CallStatus.CONNECTED,
            phone_number=customer_phone,
        )
        self._active_calls[call_id] = call_state

        return conversation_id, opening_message

    async def generate_opening_audio(self, opening_message: str, language: str = "en") -> bytes:
        """Generate TTS audio for the opening message"""
        audio = await self.tts.synthesize(opening_message, language=language)
        return audio

    async def process_audio_chunk(
        self,
        call_id: str,
        audio_chunk: bytes,
        on_audio_response: Optional[Callable[[bytes], None]] = None,
    ) -> Optional[str]:
        """
        Process incoming audio from caller.
        
        This is called for each audio chunk received from the phone call.
        Buffers audio, detects speech end, processes through pipeline.
        
        Returns transcribed text if speech ended, None if still buffering.
        """
        call_state = self._active_calls.get(call_id)
        if not call_state:
            return None

        # Buffer audio
        call_state.audio_buffer += audio_chunk

        # Check if we have enough audio to process (~2 seconds)
        # 16000 bytes ≈ 2 seconds at 8kHz mulaw
        if len(call_state.audio_buffer) >= 16000:
            audio_to_process = call_state.audio_buffer
            call_state.audio_buffer = b""

            # Transcribe
            transcript = await self.stt.transcribe_buffer(audio_to_process)

            if transcript and transcript.strip():
                # Check for interruption
                if call_state.status == CallStatus.SPEAKING:
                    await self._handle_interruption(call_id)

                call_state.status = CallStatus.PROCESSING

                # Process through conversation engine
                response = await self.conversation.process_message(
                    call_state.conversation.conversation_id,
                    transcript,
                )

                # Generate TTS
                if response and on_audio_response:
                    call_state.status = CallStatus.SPEAKING
                    audio_response = await self.tts.synthesize(
                        response,
                        language=call_state.conversation.current_language,
                    )
                    if audio_response:
                        on_audio_response(audio_response)

                call_state.status = CallStatus.LISTENING
                return transcript

        return None

    async def process_audio_stream(
        self,
        call_id: str,
        audio_stream,
        send_audio: Callable,
    ) -> None:
        """
        Full streaming audio pipeline for a voice call.
        
        Continuously:
        1. Receives audio from caller (STT streaming)
        2. Processes through conversation engine
        3. Streams audio response back (TTS streaming)
        
        Supports barge-in (interruption detection).
        """
        call_state = self._active_calls.get(call_id)
        if not call_state:
            return

        call_state.status = CallStatus.LISTENING

        # Create an async generator from the audio stream
        async def audio_generator():
            async for chunk in audio_stream:
                if call_state.is_interrupted:
                    break
                yield chunk

        # Stream STT
        async for transcript in self.stt.transcribe_stream(audio_generator()):
            if not transcript or transcript == "[END_OF_UTTERANCE]":
                continue

            if transcript.startswith("["):  # Control messages
                continue

            # User spoke - check if we need to interrupt AI
            if call_state.status == CallStatus.SPEAKING:
                await self._handle_interruption(call_id)

            call_state.status = CallStatus.PROCESSING

            # Stream LLM response + TTS
            await self._stream_response(call_id, transcript, send_audio)

            call_state.status = CallStatus.LISTENING

    async def _stream_response(
        self,
        call_id: str,
        user_message: str,
        send_audio: Callable,
    ) -> None:
        """
        Stream AI response: LLM tokens -> TTS -> Audio out.
        Collects tokens into sentence fragments for natural TTS pacing.
        """
        call_state = self._active_calls.get(call_id)
        if not call_state:
            return

        call_state.status = CallStatus.SPEAKING
        sentence_buffer = ""
        sentence_delimiters = {'.', '!', '?', ',', ';', ':', '—', '...'}

        async for token in self.conversation.process_message_stream(
            call_state.conversation.conversation_id,
            user_message,
        ):
            # Check for interruption
            if call_state.is_interrupted:
                break

            sentence_buffer += token

            # Send to TTS when we have a natural pause point
            if any(d in token for d in sentence_delimiters) and len(sentence_buffer) > 10:
                # Stream TTS for this sentence fragment
                audio_chunks = []
                async for audio_chunk in self.tts.synthesize_stream(
                    sentence_buffer.strip(),
                    language=call_state.conversation.current_language,
                ):
                    if call_state.is_interrupted:
                        break
                    await send_audio(audio_chunk)

                sentence_buffer = ""

        # Send remaining buffer
        if sentence_buffer.strip() and not call_state.is_interrupted:
            async for audio_chunk in self.tts.synthesize_stream(
                sentence_buffer.strip(),
                language=call_state.conversation.current_language,
            ):
                if call_state.is_interrupted:
                    break
                await send_audio(audio_chunk)

        call_state.is_interrupted = False

    async def _handle_interruption(self, call_id: str) -> None:
        """
        Handle barge-in: user starts speaking while AI is talking.
        Stops TTS immediately and signals conversation engine.
        """
        call_state = self._active_calls.get(call_id)
        if not call_state:
            return

        call_state.is_interrupted = True
        call_state.status = CallStatus.LISTENING

        # Signal conversation engine to stop generating
        self.conversation.interrupt(call_state.conversation.conversation_id)

        # Cancel any running TTS task
        tts_task = self._tts_tasks.get(call_id)
        if tts_task and not tts_task.done():
            tts_task.cancel()

    async def end_call(self, call_id: str) -> dict:
        """
        End a voice call and get summary.
        """
        call_state = self._active_calls.get(call_id)
        if not call_state:
            return {"error": "Call not found"}

        call_state.status = CallStatus.COMPLETED

        # Get conversation summary
        summary = await self.conversation.end_conversation(
            call_state.conversation.conversation_id
        )

        # Calculate duration
        duration = (datetime.utcnow() - call_state.started_at).total_seconds()
        summary["duration_seconds"] = int(duration)
        summary["call_id"] = call_id

        # Cleanup
        self._active_calls.pop(call_id, None)
        self._tts_tasks.pop(call_id, None)

        return summary

    def get_call_status(self, call_id: str) -> dict:
        """Get current status of a call"""
        call_state = self._active_calls.get(call_id)
        if not call_state:
            return {"error": "Call not found"}

        return {
            "call_id": call_id,
            "status": call_state.status.value,
            "conversation_id": call_state.conversation.conversation_id,
            "duration_seconds": int((datetime.utcnow() - call_state.started_at).total_seconds()),
            "message_count": len(call_state.conversation.messages),
        }

    def get_active_calls(self) -> list[dict]:
        """List all active calls"""
        return [self.get_call_status(cid) for cid in self._active_calls]
