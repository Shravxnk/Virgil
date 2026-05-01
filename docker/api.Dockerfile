FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY apps/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY data/ /app/data/
COPY apps/api/ /app/

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV DATA_DIR=/app/data

# Render injects PORT=10000; fall back to 8000 for local docker-compose
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import urllib.request,os; urllib.request.urlopen('http://localhost:'+os.environ.get('PORT','8000')+'/health')"

CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
