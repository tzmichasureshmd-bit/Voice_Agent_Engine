"""
TZMICHA AI OS - API Routes
RESTful + WebSocket endpoints for the Voice AI Engine.
"""

import asyncio
import base64
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional

from ..services.voice_call_service import VoiceCallService
from ..services.conversation_service import ConversationService
from ..services.memory_service import MemoryService


router = APIRouter()

# These get injected by the app factory
voice_service: Optional[VoiceCallService] = None
conversation_service: Optional[ConversationService] = None
memory_service: Optional[MemoryService] = None


def set_services(voice: VoiceCallService, conv: ConversationService, mem: MemoryService):
    """Inject service dependencies"""
    global voice_service, conversation_service, memory_service
    voice_service = voice
    conversation_service = conv
    memory_service = mem


# ===== Schemas =====

class StartCallRequest(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    business_context: str = ""
    goal: str = ""
    language: str = "en"
    ai_name: str = "Alex"

class ChatMessageRequest(BaseModel):
    message: str

class EndCallRequest(BaseModel):
    call_id: str


# ===== Health =====

@router.get("/")
def health():
    return {
        "platform": "TZMICHA AI OS",
        "version": "1.0.0",
        "engine": "Voice AI Engine",
        "status": "running",
    }


@router.get("/status")
def platform_status():
    return {
        "active_calls": voice_service.get_active_calls() if voice_service else [],
        "active_conversations": memory_service.get_active_conversations() if memory_service else [],
    }


# ===== Conversation API (Text-based - for simulator/testing) =====

@router.post("/conversation/start")
async def start_conversation(req: StartCallRequest):
    """Start a new AI conversation (text mode, no voice)"""
    if not conversation_service:
        raise HTTPException(status_code=503, detail="Service not ready")

    conversation_id, opening = await conversation_service.start_conversation(
        customer_name=req.customer_name,
        customer_phone=req.customer_phone,
        business_context=req.business_context,
        goal=req.goal,
        language=req.language,
    )

    return {
        "conversation_id": conversation_id,
        "ai_message": opening,
        "language": req.language,
    }


@router.post("/conversation/{conversation_id}/message")
async def send_message(conversation_id: str, req: ChatMessageRequest):
    """Send a message and get AI response"""
    if not conversation_service:
        raise HTTPException(status_code=503, detail="Service not ready")

    response = await conversation_service.process_message(conversation_id, req.message)
    
    context = memory_service.get_conversation(conversation_id) if memory_service else None
    
    return {
        "ai_message": response,
        "language": context.current_language if context else "en",
        "active_topic": context.active_topic.topic_name if context and context.active_topic else None,
        "paused_topics": [t.topic_name for t in context.paused_topics] if context else [],
    }


@router.post("/conversation/{conversation_id}/end")
async def end_conversation(conversation_id: str):
    """End a conversation and get summary"""
    if not conversation_service:
        raise HTTPException(status_code=503, detail="Service not ready")

    summary = await conversation_service.end_conversation(conversation_id)
    return summary


# ===== Voice Call API =====

@router.post("/voice/call/start")
async def start_voice_call(req: StartCallRequest):
    """Start a new AI voice call"""
    if not voice_service:
        raise HTTPException(status_code=503, detail="Voice service not ready")

    import uuid
    call_id = f"call_{uuid.uuid4().hex[:12]}"

    conversation_id, opening_message = await voice_service.start_call(
        call_id=call_id,
        customer_name=req.customer_name,
        customer_phone=req.customer_phone,
        business_context=req.business_context,
        goal=req.goal,
        language=req.language,
    )

    # Generate opening audio
    opening_audio = await voice_service.generate_opening_audio(opening_message, req.language)
    audio_base64 = base64.b64encode(opening_audio).decode("utf-8") if opening_audio else ""

    return {
        "call_id": call_id,
        "conversation_id": conversation_id,
        "opening_message": opening_message,
        "opening_audio_base64": audio_base64,
        "status": "connected",
    }


@router.post("/voice/call/{call_id}/end")
async def end_voice_call(call_id: str):
    """End a voice call"""
    if not voice_service:
        raise HTTPException(status_code=503, detail="Voice service not ready")

    summary = await voice_service.end_call(call_id)
    return summary


@router.get("/voice/call/{call_id}/status")
def get_call_status(call_id: str):
    """Get status of active call"""
    if not voice_service:
        raise HTTPException(status_code=503, detail="Voice service not ready")

    return voice_service.get_call_status(call_id)


# ===== WebSocket for Real-Time Voice Streaming =====

@router.websocket("/voice/ws/{call_id}")
async def voice_websocket(websocket: WebSocket, call_id: str):
    """
    Real-time bidirectional audio streaming WebSocket.
    
    Protocol:
    - Client sends: {"event": "media", "media": {"payload": "<base64 audio>"}}
    - Server sends: {"event": "media", "media": {"payload": "<base64 audio>"}}
    - Client sends: {"event": "start"} to begin
    - Client sends: {"event": "stop"} to end
    
    Compatible with Twilio Media Streams.
    """
    await websocket.accept()

    if not voice_service:
        await websocket.close(reason="Service not ready")
        return

    call_state = voice_service._active_calls.get(call_id)
    if not call_state:
        await websocket.close(reason="Call not found")
        return

    stream_sid = None

    async def send_audio(audio_bytes: bytes):
        """Send audio back to caller"""
        try:
            payload = base64.b64encode(audio_bytes).decode("utf-8")
            if stream_sid:
                await websocket.send_json({
                    "event": "media",
                    "streamSid": stream_sid,
                    "media": {"payload": payload},
                })
            else:
                await websocket.send_json({
                    "event": "media",
                    "media": {"payload": payload},
                })
        except Exception:
            pass

    try:
        # Send opening audio
        opening_msg = call_state.conversation.messages[-1].content if call_state.conversation.messages else ""
        if opening_msg:
            opening_audio = await voice_service.generate_opening_audio(
                opening_msg,
                call_state.conversation.current_language,
            )
            if opening_audio:
                await send_audio(opening_audio)

        # Process incoming audio
        async for message in websocket.iter_text():
            data = json.loads(message)
            event = data.get("event", "")

            if event == "start":
                stream_sid = data.get("start", {}).get("streamSid")

            elif event == "media":
                # Decode incoming audio
                audio_chunk = base64.b64decode(data["media"]["payload"])

                # Process through pipeline
                await voice_service.process_audio_chunk(
                    call_id,
                    audio_chunk,
                    on_audio_response=lambda audio: asyncio.create_task(send_audio(audio)),
                )

            elif event == "stop":
                break

    except WebSocketDisconnect:
        pass
    finally:
        # End call if still active
        if call_id in voice_service._active_calls:
            await voice_service.end_call(call_id)


# ===== Twilio Webhook Endpoints =====

@router.post("/voice/webhook/answer")
async def twilio_answer_webhook(request: Request, call_id: str = ""):
    """Twilio calls this when person picks up - returns TwiML to connect WebSocket"""
    from ..config.settings import get_settings
    settings = get_settings()

    ws_url = settings.server_public_url.replace("https://", "wss://").replace("http://", "ws://")

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="{ws_url}/api/v1/voice/ws/{call_id}" />
    </Connect>
</Response>"""

    return Response(content=twiml, media_type="application/xml")


@router.post("/voice/webhook/status")
async def twilio_status_webhook(request: Request, call_id: str = ""):
    """Twilio sends call status updates here"""
    form = await request.form()
    status = form.get("CallStatus", "")

    if voice_service and call_id in voice_service._active_calls:
        # Update internal state based on Twilio status
        pass

    return {"ok": True}
