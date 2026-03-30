import json
import logging
import os
import tempfile
import time
from urllib.parse import urlparse

import requests
from faster_whisper import WhisperModel
from minio import Minio
from redis import Redis


logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("transcription-worker")


REDIS_URL = os.environ["REDIS_URL"]
QUEUE_NAME = os.getenv("TRANSCRIPT_QUEUE_NAME", "transcript_jobs")
API_BASE_URL = os.environ["TRANSCRIPT_API_BASE_URL"].rstrip("/")
WORKER_SECRET = os.getenv("TRANSCRIPT_WORKER_SECRET", "")
MODEL_NAME = os.getenv("FASTER_WHISPER_MODEL", "small")
COMPUTE_TYPE = os.getenv("FASTER_WHISPER_COMPUTE_TYPE", "int8")
DEVICE = os.getenv("FASTER_WHISPER_DEVICE", "cpu")
S3_ENDPOINT = os.environ["S3_ENDPOINT"]
S3_ACCESS_KEY = os.environ["S3_ACCESS_KEY"]
S3_SECRET_KEY = os.environ["S3_SECRET_KEY"]
S3_SECURE = os.getenv("S3_SECURE", "false").lower() == "true"


def build_minio_client() -> Minio:
    parsed = urlparse(S3_ENDPOINT if "://" in S3_ENDPOINT else f"http://{S3_ENDPOINT}")
    endpoint = parsed.netloc or parsed.path
    secure = parsed.scheme == "https" if parsed.scheme else S3_SECURE
    return Minio(
        endpoint,
        access_key=S3_ACCESS_KEY,
        secret_key=S3_SECRET_KEY,
        secure=secure,
    )


def parse_source_url(source_url: str) -> tuple[str, str]:
    if source_url.startswith("s3://"):
        parsed = urlparse(source_url)
        return parsed.netloc, parsed.path.lstrip("/")

    parsed = urlparse(source_url)
    parts = parsed.path.lstrip("/").split("/", 1)
    if len(parts) != 2:
        raise ValueError(f"Unsupported transcript source URL: {source_url}")
    return parts[0], parts[1]


def normalize_segments(segments):
    normalized = []
    for segment in segments:
        normalized.append(
            {
                "start": float(segment.start),
                "end": float(segment.end),
                "text": segment.text.strip(),
            }
        )
    return normalized


def post_result(payload: dict):
    headers = {"Content-Type": "application/json"}
    if WORKER_SECRET:
        headers["x-transcript-worker-secret"] = WORKER_SECRET
    response = requests.post(
        f"{API_BASE_URL}/sessions/provider/webhooks/transcript",
        headers=headers,
        data=json.dumps(payload),
        timeout=30,
    )
    response.raise_for_status()


def main():
    redis = Redis.from_url(REDIS_URL, decode_responses=True)
    storage = build_minio_client()
    model = WhisperModel(MODEL_NAME, device=DEVICE, compute_type=COMPUTE_TYPE)

    logger.info("worker started with model=%s device=%s", MODEL_NAME, DEVICE)

    while True:
        _, raw_job = redis.brpop(QUEUE_NAME)
        job = json.loads(raw_job)
        logger.info("processing transcript job %s for booking %s", job["jobId"], job["bookingId"])

        tmp_path = None
        try:
            bucket, object_key = parse_source_url(job["sourceUrl"])
            suffix = os.path.splitext(object_key)[1] or ".mp3"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
                tmp_path = tmp_file.name

            storage.fget_object(bucket, object_key, tmp_path)
            segments, info = model.transcribe(tmp_path, vad_filter=True)
            segment_list = list(segments)
            payload = {
                "bookingId": job["bookingId"],
                "callSessionId": job.get("callSessionId"),
                "providerJobId": job["jobId"],
                "providerRoomId": job["providerRoomId"],
                "status": "completed",
                "language": getattr(info, "language", None),
                "fullText": " ".join(segment.text.strip() for segment in segment_list).strip(),
                "summaryText": None,
                "segments": normalize_segments(segment_list),
                "payload": {
                    "model": MODEL_NAME,
                    "computeType": COMPUTE_TYPE,
                    "device": DEVICE,
                },
            }
            post_result(payload)
        except Exception as exc:  # noqa: BLE001
            logger.exception("transcript job failed: %s", exc)
            try:
                post_result(
                    {
                        "bookingId": job.get("bookingId"),
                        "callSessionId": job.get("callSessionId"),
                        "providerJobId": job.get("jobId"),
                        "providerRoomId": job.get("providerRoomId"),
                        "status": "failed",
                        "payload": {"error": str(exc)},
                    }
                )
            except Exception:  # noqa: BLE001
                logger.exception("failed to report transcript error")
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)
            time.sleep(0.1)


if __name__ == "__main__":
    main()
