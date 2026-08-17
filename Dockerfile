# ============================================
# TZMICHA AI OS - Backend Dockerfile
# ============================================

FROM python:3.12-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY platform/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY platform/ ./platform/
COPY data/ ./data/

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Run
CMD ["uvicorn", "platform.app:app", "--host", "0.0.0.0", "--port", "8000"]
