"""
TZMICHA AI OS - Server Entry Point
Run with: python -m platform.main
Or:       uvicorn platform.app:app --reload
"""

import uvicorn
from .config.settings import get_settings


def main():
    settings = get_settings()
    
    print(f"""
    ╔══════════════════════════════════════════════════╗
    ║          TZMICHA AI OS - Voice Engine           ║
    ║     Enterprise AI Voice Platform v{settings.app_version}       ║
    ╠══════════════════════════════════════════════════╣
    ║  Server:  http://localhost:{settings.port}                 ║
    ║  Docs:    http://localhost:{settings.port}/docs             ║
    ║  LLM:     {settings.llm_provider:<20}              ║
    ║  STT:     {settings.stt_provider:<20}              ║
    ║  TTS:     {settings.tts_provider:<20}              ║
    ╚══════════════════════════════════════════════════╝
    """)

    uvicorn.run(
        "platform.app:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )


if __name__ == "__main__":
    main()
