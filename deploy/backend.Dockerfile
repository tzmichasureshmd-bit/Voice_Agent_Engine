FROM python:3.11-slim

WORKDIR /app

# System deps for Whisper + XTTS + audio
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ffmpeg libsndfile1 git build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install CPU PyTorch first (VPS has no GPU)
RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install all other deps
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend
COPY backend/ ./

# Pre-download Whisper model at build time (saves startup time)
RUN python -c "import whisper; whisper.load_model('base')" || true

# XTTS TOS
ENV COQUI_TOS_AGREED=1

RUN mkdir -p /app/data

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
