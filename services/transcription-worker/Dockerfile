FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY services/transcription-worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/transcription-worker/worker.py .

CMD ["python", "worker.py"]
