from fastapi import FastAPI, UploadFile, HTTPException, Request, Depends, status, Header
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uuid
import os
from dotenv import load_dotenv
import asyncio
from audio_processor import AudioInference
import tempfile
from google.cloud import storage, tasks_v2
import json
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import random
from collections import defaultdict
from google.generativeai import GenerativeModel
import google.generativeai as genai
import traceback
from deepgram import (
    DeepgramClient,
    PrerecordedOptions,
)
import concurrent.futures
import hmac
import hashlib
import time
import base64
import magic
from starlette.middleware.base import BaseHTTPMiddleware
import logging

import re
import unicodedata
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    print("requests library not available, fallback transcription method will not work")

INITIAL_CHAT_CONTEXT = """
You are Ai-SPY, an AI assistant focused on helping users understand AI-generated content and audio.
You are knowledgeable about AI detection, audio analysis, and content generation.
You should be helpful, friendly, and direct in your responses.
When discussing AI detection, focus on education rather than evasion.
You will be given the results of an audio analysis and you will need to discuss them with the user.
"""

load_dotenv()
app = FastAPI(title="Audio AI Detection API")
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

deepgram_api_key = os.getenv('DEEPGRAM_API_KEY')
if not deepgram_api_key:
    print("No Deepgram API key found! Transcription will not work.")

SECURITY_CONFIG = {
    "upload_limits": {
        "max_file_size": 40 * 1024 * 1024,
        "allowed_types": ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav"],
        "allowed_extensions": [".mp3", ".wav", ".m4a"]
    },
    "cors": {
        "allowed_origins": os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(','),
        "allowed_methods": ["GET", "POST", "OPTIONS"],
        "allowed_headers": ["Authorization", "Content-Type"],
        "max_age": 86400
    },
    "csp": "default-src 'self'; script-src 'self'; connect-src 'self' https://api.deepgram.com https://generativelanguage.googleapis.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';"
}

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")

class SecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, config):
        super().__init__(app)
        self.config = config

    async def dispatch(self, request, call_next):
        request_id = str(uuid.uuid4())

        client_host = request.client.host if request.client else "unknown"
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "request_id": request_id,
            "client_ip": client_host,
            "method": request.method,
            "url": str(request.url),
            "event": "request_start"
        }
        logger.info(json.dumps(log_data))

        start_time = time.time()
        try:
            response = await call_next(request)

            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
            response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"

            if "csp" in self.config:
                response.headers["Content-Security-Policy"] = self.config["csp"]

            response.headers["X-Request-ID"] = request_id

            process_time = time.time() - start_time
            logger.info(json.dumps({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "request_id": request_id,
                "client_ip": client_host,
                "method": request.method,
                "url": str(request.url),
                "status_code": response.status_code,
                "process_time_ms": round(process_time * 1000, 2),
                "event": "request_completed"
            }))

            return response

        except Exception as e:
            process_time = time.time() - start_time
            logger.error(json.dumps({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "request_id": request_id,
                "client_ip": client_host,
                "method": request.method,
                "url": str(request.url),
                "error": str(e),
                "process_time_ms": round(process_time * 1000, 2),
                "event": "request_error"
            }))
            raise

app.add_middleware(SecurityMiddleware, config=SECURITY_CONFIG)

app.add_middleware(
    CORSMiddleware,
    allow_origins=SECURITY_CONFIG["cors"]["allowed_origins"],
    allow_credentials=True,
    allow_methods=SECURITY_CONFIG["cors"]["allowed_methods"],
    allow_headers=SECURITY_CONFIG["cors"]["allowed_headers"],
    max_age=SECURITY_CONFIG["cors"]["max_age"],
)

storage_client = storage.Client()
tasks_client = tasks_v2.CloudTasksClient()
project = os.getenv('GOOGLE_CLOUD_PROJECT')
queue = os.getenv('CLOUD_TASKS_QUEUE')
location = os.getenv('CLOUD_TASKS_LOCATION')
bucket_name = os.getenv('GCS_BUCKET_NAME')
jobs = defaultdict(dict)
deepgram = DeepgramClient(api_key=os.getenv('DEEPGRAM_API_KEY'))
genai.configure(api_key=os.getenv('GOOGLE_AI_API_KEY'))

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    JWT_SECRET = base64.urlsafe_b64encode(os.urandom(32)).decode()
    logger.warning("No JWT_SECRET set. Generated ephemeral secret for demo; do not use in production.")

def generate_auth_token(client_id, expiry_seconds=3600):
    """Generate a signed token with timestamp"""
    timestamp = int(time.time())
    expiry = timestamp + expiry_seconds

    payload = f"{client_id}:{expiry}:{timestamp}"

    signature = hmac.new(
        JWT_SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    token = f"{payload}:{signature}"

    return base64.urlsafe_b64encode(token.encode()).decode()

def validate_auth_token(token):
    """Validate a token"""
    try:

        decoded = base64.urlsafe_b64decode(token.encode()).decode()

        parts = decoded.split(':')
        if len(parts) != 4:
            return False, "Invalid token format"

        client_id, expiry, timestamp, signature = parts

        current_time = int(time.time())
        if current_time > int(expiry):
            return False, "Token expired"

        expected_signature = hmac.new(
            JWT_SECRET.encode(),
            f"{client_id}:{expiry}:{timestamp}".encode(),
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_signature):
            return False, "Invalid signature"

        return True, client_id
    except Exception as e:
        return False, f"Token validation error: {str(e)}"

@app.options("/auth/token")
async def options_auth_token():
    return {}

@app.options("/generate-upload-url")
async def options_generate_upload_url():
    return {}

@app.post("/auth/token")
@limiter.limit("10/minute")
async def get_auth_token(request: Request):
    try:
        client_id = str(uuid.uuid4())
        token = generate_auth_token(client_id, expiry_seconds=3600)

        return {
            "token": token,
            "expires_in": 3600
        }
    except Exception as e:
        logger.error(f"Token generation error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate token: {str(e)}"
        )

async def validate_token(authorization: str = Header(None)):
    if authorization is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header"
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Use 'Bearer {token}'"
        )

    token = authorization.replace("Bearer ", "")
    is_valid, message = validate_auth_token(token)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=message
        )

    return token

async def validate_subscription_claim(user_id: str, claimed_subscription: bool = None) -> bool:
    """
    Validates subscription status using Stripe when configured.
    In OSS/demo mode (no STRIPE_SECRET_KEY), returns False by default.
    """
    try:
        stripe_secret_key = os.getenv('STRIPE_SECRET_KEY')

        if not stripe_secret_key:
            await log_security_event(
                event_type="subscription_validation_no_stripe",
                user_id=user_id,
                details={"validated_subscription": False, "reason": "no_stripe_key"}
            )
            return False

        try:
            import stripe
            stripe.api_key = stripe_secret_key

            customers = stripe.Customer.search(
                query=f"metadata['userId']:'{user_id}'",
                limit=1
            )
            if not customers.data:
                await log_security_event(
                    event_type="subscription_validated",
                    user_id=user_id,
                    details={
                        "validated_subscription": False,
                        "source": "stripe_direct",
                        "reason": "no_customer_found"
                    }
                )
                return False

            customer = customers.data[0]
            subscriptions = stripe.Subscription.list(
                customer=customer.id,
                status='active',
                limit=10
            )
            has_active = len(subscriptions.data) > 0

            await log_security_event(
                event_type="subscription_validated",
                user_id=user_id,
                details={
                    "validated_subscription": has_active,
                    "source": "stripe_direct",
                    "customer_id": customer.id,
                    "active_subscriptions": len(subscriptions.data)
                }
            )
            return has_active
        except Exception as stripe_error:
            await log_security_event(
                event_type="subscription_validation_stripe_error",
                user_id=user_id,
                details={"error": str(stripe_error)}
            )
            return False
    except Exception as e:
        await log_security_event(
            event_type="subscription_validation_error",
            user_id=user_id,
            details={"error": str(e)}
        )
        return False

async def extract_user_id_from_token(authorization: str) -> str:
    """Extract user ID from authorization token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization header")

    token = authorization.replace("Bearer ", "")
    is_valid, user_id = validate_auth_token(token)

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid token")

    return user_id

class SignedUrlRequest(BaseModel):
    file_name: str
    file_type: str

class SignedUrlResponse(BaseModel):
    signed_url: str
    file_name: str
    bucket: str

class ReportRequest(BaseModel):
    bucket_name: str
    file_name: str

class ReportResponse(BaseModel):
    task_id: str
    status: str

class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    context: str

class SubscriptionInfo(BaseModel):
    has_subscription: bool = False

def sanitize_filename(filename):
    """Thoroughly sanitize a filename to prevent path traversal and command injection"""

    base_name = os.path.basename(filename)

    base_name = base_name.replace('\0', '')

    base_name = unicodedata.normalize('NFKD', base_name)

    base_name = re.sub(r'[^\w\s.-]', '_', base_name)

    base_name = re.sub(r'^[-.]', '_', base_name)

    base_name = base_name[:255]

    return base_name

async def validate_audio_file(file_content):
    """Validate file is audio using magic bytes"""

    audio_signatures = {
        b'ID3': 'MP3',
        b'RIFF': 'WAV',
        b'\xFF\xFB': 'MP3',
        b'\xFF\xF3': 'MP3',
        b'\xFF\xF2': 'MP3',
        b'\xFF\xE3': 'MP3',
    }

    try:
        if len(file_content) >= 12 and file_content[4:8] == b'ftyp':
            return True, "Valid MP4/M4A file"
    except Exception:
        pass

    for signature, file_type in audio_signatures.items():
        if file_content.startswith(signature):
            return True, f"Valid {file_type} file"

    return False, "Invalid audio file format"

async def validate_file(file, content=None, file_type=None):
    """
    Comprehensive file validation that combines extension, MIME type, and content checks

    Args:
        file: Either an UploadFile object or a filename string
        content: Optional file content bytes for validation
        file_type: Optional MIME type string (for cases without an UploadFile)

    Returns:
        (is_valid, message, sanitized_filename)
    """

    if isinstance(file, str):
        filename = file
        content_type = file_type
    else:
        filename = file.filename
        content_type = file.content_type or file_type

    sanitized_filename = sanitize_filename(filename)

    if not any(sanitized_filename.lower().endswith(ext) for ext in SECURITY_CONFIG["upload_limits"]["allowed_extensions"]):
        return False, f"Invalid file extension. Allowed: {', '.join(SECURITY_CONFIG['upload_limits']['allowed_extensions'])}", sanitized_filename

    if content_type and content_type not in SECURITY_CONFIG["upload_limits"]["allowed_types"]:
        return False, f"Invalid content type: {content_type}. Allowed: {', '.join(SECURITY_CONFIG['upload_limits']['allowed_types'])}", sanitized_filename

    if content:
        content_valid, content_message = await validate_audio_file(content)
        if not content_valid:
            return False, content_message, sanitized_filename

    return True, "File validated successfully", sanitized_filename

@app.post("/analyze", dependencies=[Depends(validate_token)])
@limiter.limit("10/minute")
async def analyze_file(request: Request, file: UploadFile, authorization: str = Header(None)):

    token = authorization.replace("Bearer ", "")
    is_valid, user_id = validate_auth_token(token)

    is_valid_file, message, sanitized_filename = await validate_file(file)
    if not is_valid_file:
        await log_security_event(
            event_type="invalid_file_rejected",
            user_id=user_id,
            details={
                "reason": "initial_validation_failed",
                "message": message,
                "original_filename": file.filename,
                "sanitized_filename": sanitized_filename
            }
        )
        raise HTTPException(status_code=400, detail=message)

    file.filename = sanitized_filename
    temp_local_path = None

    try:

        file_size = 0
        content = bytearray()
        chunk_size = 1024 * 1024

        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            file_size += len(chunk)
            content.extend(chunk)

            if file_size > SECURITY_CONFIG["upload_limits"]["max_file_size"]:
                await log_security_event(
                    event_type="invalid_file_rejected",
                    user_id=user_id,
                    details={
                        "reason": "file_too_large",
                        "filename": file.filename,
                        "size": file_size
                    }
                )
                raise HTTPException(status_code=413, detail=f"File size exceeds {SECURITY_CONFIG['upload_limits']['max_file_size'] // (1024 * 1024)}MB limit")

        content_bytes = bytes(content)
        is_valid_content, content_message, _ = await validate_file(file, content=content_bytes)
        if not is_valid_content:
            await log_security_event(
                event_type="invalid_file_rejected",
                user_id=user_id,
                details={
                    "reason": "content_validation_failed",
                    "message": content_message,
                    "filename": file.filename
                }
            )
            raise HTTPException(status_code=400, detail=content_message)

        await log_security_event(
            event_type="file_validated",
            user_id=user_id,
            details={
                "filename": file.filename,
                "size": file_size
            }
        )

        temp_local_path = f"/tmp/{uuid.uuid4()}_{file.filename}"
        with open(temp_local_path, "wb") as buffer:
            buffer.write(content_bytes)

        inference = AudioInference(model_path="./best_best_85_balanced.pth")

        loop = asyncio.get_running_loop()
        with concurrent.futures.ThreadPoolExecutor() as pool:
            results = await loop.run_in_executor(pool, inference.analyze_file, temp_local_path)

        if results.get('status') == 'error':
            raise Exception(results.get('error', 'Unknown error during audio analysis'))

        await log_security_event(
            event_type="file_processed_successfully",
            user_id=user_id,
            details={
                "filename": file.filename,
                "processing": "analysis"
            }
        )

        return JSONResponse(content={
            "status": results['status'],
            "overall_prediction": results['overall_prediction'],
            "aggregate_confidence": results['aggregate_confidence'],
            "results": [
                {
                    "timestamp": i * 3,
                    "prediction": results['predictions'][i],
                    "confidence": results['confidences'][i]
                } for i in range(results['total_chunks'])
            ]
        })
    except Exception as e:
        await log_security_event(
            event_type="file_processing_error",
            user_id=user_id,
            details={
                "filename": file.filename if hasattr(file, "filename") else "unknown",
                "error": str(e)
            }
        )
        raise HTTPException(status_code=500, detail="Analysis failed due to an internal error.")
    finally:
        if temp_local_path and os.path.exists(temp_local_path):
            os.remove(temp_local_path)

@app.post("/generate-upload-url", response_model=SignedUrlResponse, dependencies=[Depends(validate_token)])
async def generate_upload_url(request: SignedUrlRequest, authorization: str = Header(None)):
    try:

        token = authorization.replace("Bearer ", "")
        is_valid, user_id = validate_auth_token(token)
        if not bucket_name:
            raise HTTPException(status_code=503, detail="Uploads are disabled in this demo. Configure GCS to enable.")

        await log_security_event(
            event_type="upload_url_requested",
            user_id=user_id,
            details={
                "file_name": request.file_name,
                "file_type": request.file_type
            }
        )

        is_valid_file, message, sanitized_filename = await validate_file(
            request.file_name,
            file_type=request.file_type
        )

        if not is_valid_file:
            await log_security_event(
                event_type="upload_url_rejected",
                user_id=user_id,
                details={
                    "reason": message,
                    "original_filename": request.file_name,
                    "file_type": request.file_type
                }
            )
            raise HTTPException(status_code=400, detail=message)

        bucket = storage_client.bucket(bucket_name)
        unique_filename = f"{datetime.now(timezone.utc).timestamp()}-{sanitized_filename}"
        blob = bucket.blob(unique_filename)

        url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(seconds=10),
            method="PUT",
            content_type=request.file_type,
        )

        await log_security_event(
            event_type="upload_url_generated",
            user_id=user_id,
            details={
                "original_filename": request.file_name,
                "sanitized_filename": sanitized_filename,
                "unique_filename": unique_filename,
                "file_type": request.file_type
            }
        )

        return {
            "signed_url": url,
            "file_name": unique_filename,
            "bucket": bucket_name
        }

    except Exception as e:
        logger.error(f"Error in generate_upload_url: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate upload URL.")

@app.post("/transcribe", dependencies=[Depends(validate_token)])
@limiter.limit("5/minute")
async def transcribe_audio(request: Request, file: UploadFile, authorization: str = Header(None)):

    token = authorization.replace("Bearer ", "")
    is_valid, user_id = validate_auth_token(token)
    if not os.getenv('DEEPGRAM_API_KEY'):
        raise HTTPException(status_code=503, detail="Transcription is disabled in this demo. Set DEEPGRAM_API_KEY to enable.")

    validated_subscription = await validate_subscription_claim(user_id)

    is_valid_file, message, sanitized_filename = await validate_file(file)
    if not is_valid_file:
        await log_security_event(
            event_type="invalid_file_rejected",
            user_id=user_id,
            details={
                "reason": "initial_validation_failed",
                "message": message,
                "original_filename": file.filename
            }
        )
        raise HTTPException(status_code=400, detail=message)

    file.filename = sanitized_filename

    try:

        file_size = 0
        content = bytearray()
        chunk_size = 1024 * 1024

        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            file_size += len(chunk)
            content.extend(chunk)

            if file_size > SECURITY_CONFIG["upload_limits"]["max_file_size"]:
                await log_security_event(
                    event_type="invalid_file_rejected",
                    user_id=user_id,
                    details={
                        "reason": "file_too_large",
                        "filename": file.filename,
                        "size": file_size
                    }
                )
                raise HTTPException(status_code=413, detail=f"File size exceeds {SECURITY_CONFIG['upload_limits']['max_file_size'] // (1024 * 1024)}MB limit")

        print(f"Read {file_size} bytes from uploaded file")

        content_bytes = bytes(content)
        is_valid_content, content_message, _ = await validate_file(file, content=content_bytes)
        if not is_valid_content:
            await log_security_event(
                event_type="invalid_file_rejected",
                user_id=user_id,
                details={
                    "reason": "content_validation_failed",
                    "message": content_message,
                    "filename": file.filename
                }
            )
            raise HTTPException(status_code=400, detail=content_message)

        await log_security_event(
            event_type="file_validated",
            user_id=user_id,
            details={
                "filename": file.filename,
                "size": file_size
            }
        )

        temp_local_path = f"/tmp/{uuid.uuid4()}_{file.filename}"
        try:
            print(f"Writing content to temporary file: {temp_local_path}")
            with open(temp_local_path, "wb") as buffer:
                buffer.write(content_bytes)

            print(f"Calling transcribe_audio_file with file: {temp_local_path}")

            transcription_result = await transcribe_audio_file(temp_local_path)

            print(f"Got transcription result with {len(transcription_result.get('words', []))} words")

            if not validated_subscription and "words" in transcription_result:

                transcription_result["words"] = transcription_result["words"][:50]
                transcription_result["is_limited"] = True

            print(f"Transcription completed successfully with {len(transcription_result.get('words', []))} words")
            print(f"Is transcription result None? {transcription_result is None}")
            print(f"Transcription result keys: {transcription_result.keys() if transcription_result else 'None'}")

            return JSONResponse(content=transcription_result)
        finally:
            if os.path.exists(temp_local_path):
                os.remove(temp_local_path)
    except Exception as e:

        await log_security_event(
            event_type="file_processing_error",
            user_id=user_id,
            details={
                "filename": file.filename,
                "error": str(e)
            }
        )
        print(f"Transcription error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Transcription failed due to an internal error.")

@app.post("/report", response_model=ReportResponse, dependencies=[Depends(validate_token)])
async def create_report(request: ReportRequest):
    try:
        print(f"Creating report for file: {request.file_name} in bucket: {request.bucket_name}")
        project_env = os.getenv('GOOGLE_CLOUD_PROJECT')
        queue_env = os.getenv('CLOUD_TASKS_QUEUE')
        location_env = os.getenv('CLOUD_TASKS_LOCATION')
        base_url_env = os.getenv('WORKER_URL')
        if not (project_env and queue_env and location_env and base_url_env):
            raise HTTPException(status_code=503, detail="Report processing is disabled. Configure Cloud Tasks and WORKER_URL to enable.")

        parent = tasks_client.queue_path(project_env, location_env, queue_env)

        bucket = storage_client.bucket(request.bucket_name)
        blob = bucket.blob(request.file_name)

        print(f"Checking if file exists in GCS...")
        if not blob.exists():
            raise HTTPException(status_code=404, detail="File not found in storage")
        print(f"File found in GCS")

        file_metadata = blob.metadata or {}
        if 'timeCreated' in file_metadata:
            time_created = datetime.fromisoformat(file_metadata['timeCreated'].replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            age_seconds = (now - time_created).total_seconds()

            if age_seconds > 60:
                raise HTTPException(
                    status_code=400,
                    detail="File appears to be uploaded through unauthorized means"
                )

        payload = {
            "bucket_name": request.bucket_name,
            "file_name": request.file_name
        }
        print(f"Created task payload: {payload}")

        base_url = base_url_env.rstrip('/')
        worker_url = f"{base_url}/process-report"
        print(f"Full worker URL: {worker_url}")
        task = {
            "http_request": {
                "http_method": tasks_v2.HttpMethod.POST,
                "url": worker_url,
                "headers": {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                "body": json.dumps(payload).encode(),
            },

            "dispatch_deadline": "300s"
        }

        print(f"Creating Cloud Task with queue path: {parent}")
        print(f"Task configuration: {json.dumps(task, indent=2, default=str)}")

        print("Adding task to queue...")
        response = tasks_client.create_task(request={"parent": parent, "task": task})
        task_id = response.name.split('/')[-1]
        print(f"Created task with ID: {task_id}")

        jobs[task_id] = {"status": "pending", "chat_message_count": 0}
        return {"task_id": task_id, "status": "pending"}

    except Exception as e:
        print(f"Error in create_report: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create report.")

@app.get("/report-status/{task_id}", dependencies=[Depends(validate_token)])
async def get_report_status(task_id: str, authorization: str = Header(None)):

    token = authorization.replace("Bearer ", "")
    is_valid, user_id = validate_auth_token(token)

    validated_subscription = await validate_subscription_claim(user_id)

    if task_id not in jobs:
        print(f"Task {task_id} not found in jobs")
        return {"status": "pending", "results": None, "error": None}

    job = jobs[task_id]
    print(f"Report status requested for task {task_id}; status: {job.get('status')}; has_result: {'result' in job}")

    if "status" not in job:
        return {"status": "error", "error": "Invalid job structure", "results": None}

    if not validated_subscription and job["status"] == "completed" and "result" in job:

        summary_stats = next((item for item in job["result"] if "summary_statistics" in item), None)

        timeline_items = [item for item in job["result"] if "timestamp" in item][:3]

        limited_result = []
        if summary_stats:
            limited_result.append(summary_stats)
        limited_result.extend(timeline_items)

        limited_transcription = None
        if "transcription_data" in job and job["transcription_data"]:
            transcription = job["transcription_data"]
            limited_transcription = {
                "text": transcription.get("text", "")[:200] + "..." if transcription.get("text") else "",
                "words": transcription.get("words", [])[:50],
                "average_sentiment": transcription.get("average_sentiment", {"sentiment": "neutral", "sentiment_score": 0}),
                "summary": "Upgrade to Pro for full content analysis",
                "is_limited": True
            }

        return {
            "status": job["status"],
            "result": limited_result,
            "overall_prediction": job.get("overall_prediction"),
            "aggregate_confidence": job.get("aggregate_confidence"),
            "transcription_data": limited_transcription,
            "file_name": job.get("file_name"),
            "is_limited": True
        }

    return job

@app.post("/process-report")
async def process_report(request: Request):

    task_name = request.headers.get('X-CloudTasks-TaskName', '')
    queue_name = request.headers.get('X-CloudTasks-QueueName', '')

    shared_secret = os.getenv('TASKS_SHARED_SECRET')
    if shared_secret:
        incoming_secret = request.headers.get('X-Tasks-Secret', '')
        if not incoming_secret or not hmac.compare_digest(incoming_secret, shared_secret):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid task secret")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Task processing disabled. Set TASKS_SHARED_SECRET to enable.")

    try:
        print("Process report endpoint hit!")
        body = await request.json()

        bucket_name = body.get('bucket_name')
        file_name = body.get('file_name')

        if not bucket_name or not file_name:
            raise HTTPException(status_code=400, detail="Missing bucket_name or file_name in request")

        task_id = task_name.split('/')[-1] if task_name else str(random.randint(0, 9999999999999999999))
        print(f"Processing task ID: {task_id}")

        try:
            temp_path = os.path.join(tempfile.gettempdir(), file_name)

            async def download_file_async(bucket_name, file_name, temp_path):
                storage_client = storage.Client()
                bucket = storage_client.bucket(bucket_name)
                blob = bucket.blob(file_name)
                with open(temp_path, "wb") as f:
                    storage_client.download_blob_to_file(blob, f)

            inference = AudioInference(model_path="./best_best_85_balanced.pth")
            loop = asyncio.get_running_loop()

            await download_file_async(bucket_name, file_name, temp_path)

            transcription_data = None
            try:
                transcription_data = await transcribe_audio_file(temp_path)
                print(f"Successfully transcribed file with {len(transcription_data.get('words', []))} words")
            except Exception as e:
                print(f"Transcription error (non-critical): {str(e)}")

            with concurrent.futures.ThreadPoolExecutor() as pool:
                results = await loop.run_in_executor(pool, inference.analyze_file, temp_path)

            if results.get('status') == 'error':
                raise Exception(results.get('error', 'Unknown error during audio analysis'))

            result_array = [
                {
                    "summary_statistics": {
                        "total_clips": results['total_chunks'],
                        "speech_clips": {
                            "count": results['total_chunks'],
                            "percentage": 100,
                            "ai_clips": {
                                "count": results['ai_chunks'],
                                "percentage": results['percent_ai']
                            },
                            "human_clips": {
                                "count": results['human_chunks'],
                                "percentage": results['percent_human']
                            }
                        }
                    }
                }
            ]

            timeline_data = [
                {
                    "timestamp": i * 3,
                    "confidence": float(conf),
                    "prediction": results['predictions'][i]
                }
                for i, conf in enumerate(results['confidences'])
            ]

            result_array.extend(timeline_data)

            original_filename = file_name
            if '-' in file_name:

                parts = file_name.split('-', 1)
                if len(parts) > 1:
                    original_filename = parts[1]

            formatted_results = {
                "status": "completed",
                "result": result_array,
                "overall_prediction": results['overall_prediction'],
                "aggregate_confidence": results['aggregate_confidence'],
                "transcription_data": transcription_data,
                "file_name": original_filename
            }

            jobs[task_id] = formatted_results
            print(f"Updated job status for task {task_id}: status=completed, total_items={len(result_array)}")
            return {"status": "success", "task_id": task_id}

        except Exception as e:
            print(f"Error processing file: {str(e)}")

            original_filename = file_name
            if '-' in file_name:

                parts = file_name.split('-', 1)
                if len(parts) > 1:
                    original_filename = parts[1]

            jobs[task_id] = {
                "status": "error",
                "error": str(e),
                "results": None,
                "file_name": original_filename
            }
            raise HTTPException(status_code=500, detail="Processing failed")

        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    except Exception as e:
        print(f"Error in process_report: {str(e)}")
        raise HTTPException(status_code=500, detail="Process report failed")

@app.post("/check-user-subscription", dependencies=[Depends(validate_token)])
async def check_user_subscription(authorization: str = Header(None)):
    try:
        token = authorization.replace("Bearer ", "")
        is_valid, user_id = validate_auth_token(token)
        if not is_valid:
            raise HTTPException(status_code=401, detail="Invalid token")
        validated = await validate_subscription_claim(user_id)
        return {"has_subscription": validated}
    except Exception as e:
        print(f"Error checking subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to check subscription")

@app.post("/chat", response_model=ChatResponse, dependencies=[Depends(validate_token)])
@limiter.limit("20/minute")
async def chat_with_gemini(request: Request, chat_request: ChatRequest, task_id: str = None, authorization: str = Header(None)):

    token = authorization.replace("Bearer ", "")
    is_valid, user_id = validate_auth_token(token)

    validated_subscription = await validate_subscription_claim(user_id)

    await log_security_event(
        event_type="chat_request",
        user_id=user_id,
        details={
            "validated_subscription": validated_subscription,
            "message_length": len(chat_request.message)
        }
    )
    if not validated_subscription:
        return ChatResponse(
            response="Chat features are only available for Pro subscribers. Please upgrade to access AI chat assistance.",
            context=INITIAL_CHAT_CONTEXT
        )
    if validated_subscription and task_id:
        if task_id not in jobs:
            jobs[task_id] = {"status": "pending", "chat_message_count": 0}
        if "chat_message_count" not in jobs[task_id]:
            jobs[task_id]["chat_message_count"] = 0
        if jobs[task_id]["chat_message_count"] >= 10:
            return ChatResponse(
                response="You've reached the maximum of 10 chat messages for this report. Please analyze a new audio file to start a fresh conversation.",
                context=chat_request.context or INITIAL_CHAT_CONTEXT
            )
        jobs[task_id]["chat_message_count"] += 1
        await log_security_event(
            event_type="chat_message_counted",
            user_id=user_id,
            details={
                "task_id": task_id,
                "message_count": jobs[task_id]["chat_message_count"],
                "limit": 10
            }
        )
    try:
        model = GenerativeModel('gemini-1.5-pro-002')

        current_context = INITIAL_CHAT_CONTEXT
        if chat_request.context and chat_request.context != INITIAL_CHAT_CONTEXT:
            conversation_history = chat_request.context.replace(INITIAL_CHAT_CONTEXT, "").strip()
            if conversation_history:
                current_context = f"{INITIAL_CHAT_CONTEXT}\n\n{conversation_history}"

        prompt = f"{current_context}\n\nNew message:\n{chat_request.message}"

        response = await asyncio.to_thread(model.generate_content, prompt)
        new_context = f"{current_context}\nUser: [redacted]\nAssistant: {response.text}"

        return ChatResponse(
            response=response.text,
            context=new_context
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Chat failed")

@app.get("/chat-usage/{task_id}", dependencies=[Depends(validate_token)])
async def get_chat_usage(task_id: str):
    if task_id not in jobs:
        return {"message_count": 0, "limit": 10, "remaining": 10}
    message_count = jobs[task_id].get("chat_message_count", 0)
    limit = 10
    remaining = max(0, limit - message_count)
    return {
        "message_count": message_count,
        "limit": limit,
        "remaining": remaining
    }

@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": time.time()}

def validate_uploaded_file(event, context):
    file = event
    bucket_name = file['bucket']
    file_name = file['name']
    if not (file_name.endswith('.mp3') or file_name.endswith('.wav') or file_name.endswith('.m4a')):
        print(f"Skipping validation for non-audio file: {file_name}")
        return
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(file_name)
    with tempfile.NamedTemporaryFile() as temp:
        blob.download_to_filename(temp.name)
        mime = magic.Magic(mime=True)
        detected_type = mime.from_file(temp.name)
        valid_types = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav']
        if detected_type not in valid_types:
            print(f"Invalid file detected: {file_name}, type: {detected_type}")
            blob.delete()
            quarantine_bucket = storage_client.bucket("quarantine-bucket")
            quarantine_blob = quarantine_bucket.blob(file_name)
            quarantine_bucket.copy_blob(blob, quarantine_bucket, file_name)
            blob.delete()
            print(f"SECURITY ALERT: Invalid file {file_name} detected and quarantined")
        else:
            print(f"File {file_name} validated successfully as {detected_type}")

async def log_security_event(event_type, user_id, details):
    security_log = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_id": str(uuid.uuid4()),
        "event_type": event_type,
        "user_id": user_id,
        "details": details,
        "severity": get_event_severity(event_type)
    }
    if security_log["severity"] == "critical":
        logger.critical(f"SECURITY_EVENT: {json.dumps(security_log)}")
    elif security_log["severity"] == "high":
        logger.error(f"SECURITY_EVENT: {json.dumps(security_log)}")
    else:
        logger.warning(f"SECURITY_EVENT: {json.dumps(security_log)}")

def get_event_severity(event_type):
    critical_events = [
        "subscription_bypass_attempt",
        "invalid_token_repeated",
        "file_upload_attack"
    ]
    high_events = [
        "invalid_file_rejected",
        "subscription_check_error",
        "file_processing_error"
    ]
    if event_type in critical_events:
        return "critical"
    elif event_type in high_events:
        return "high"
    else:
        return "medium"

async def transcribe_audio_file(file_path):
    try:
        print(f"Starting transcription for: {file_path}")
        options = PrerecordedOptions(
            model="nova-2",
            smart_format=True,
            diarize=True,
            summarize="v2",
            detect_language=True,
            utterances=True,
            detect_topics=True,
            sentiment=True
        )
        print("Sending file to Deepgram...")
        with open(file_path, "rb") as audio:
            audio_bytes = audio.read()
            print(f"Read {len(audio_bytes)} bytes from file")
        try:
            response = deepgram.listen.prerecorded.v("1").transcribe_file({"buffer": audio_bytes}, options)
            print("Successfully got response from Deepgram")
        except TypeError as e:
            if "Cannot instantiate typing.Union" in str(e):
                print("Handling Union type error by using raw transcription")
                if not REQUESTS_AVAILABLE:
                    raise Exception("Cannot use fallback method: requests library is not installed")
                content_type = "audio/mpeg"
                if file_path.lower().endswith(".wav"):
                    content_type = "audio/wav"
                elif file_path.lower().endswith(".mp3"):
                    content_type = "audio/mpeg"
                elif file_path.lower().endswith(".m4a"):
                    content_type = "audio/mp4"
                headers = {
                    "Authorization": f"Token {os.getenv('DEEPGRAM_API_KEY')}",
                    "Content-Type": content_type
                }
                url = "https://api.deepgram.com/v1/listen"
                params = {
                    "model": "nova-2",
                    "smart_format": "true",
                    "diarize": "true",
                    "summarize": "v2",
                    "detect_language": "true",
                    "utterances": "true",
                    "detect_topics": "true",
                    "sentiment": "true"
                }
                print(f"Sending direct HTTP request to Deepgram API with content-type: {content_type}")
                resp = requests.post(url, headers=headers, params=params, data=audio_bytes)
                if resp.status_code != 200:
                    print(f"Deepgram API error: {resp.status_code} - {resp.text}")
                    raise Exception(f"Deepgram API returned status code {resp.status_code}: {resp.text}")
                result_dict = resp.json()
                print(f"Got raw Deepgram response: {result_dict.keys()}")
                transcription_result = {
                    "text": "No transcription available.",
                    "words": [],
                    "average_sentiment": {"sentiment": "neutral", "sentiment_score": 0},
                    "summary": "No summary available."
                }
                if "results" in result_dict and "channels" in result_dict["results"]:
                    channels = result_dict["results"]["channels"]
                    if channels and len(channels) > 0 and "alternatives" in channels[0]:
                        alternatives = channels[0]["alternatives"]
                        if alternatives and len(alternatives) > 0:
                            if "transcript" in alternatives[0]:
                                transcription_result["text"] = alternatives[0]["transcript"]
                                print(f"Found transcript: {transcription_result['text'][:50]}...")
                            if "words" in alternatives[0]:
                                words_data = alternatives[0]["words"]
                                formatted_words = []
                                for word in words_data:
                                    if "word" in word and "start" in word:
                                        formatted_words.append({
                                            "word": word["word"],
                                            "start": word["start"],
                                            "end": word.get("end", word["start"] + 0.5),
                                            "confidence": word.get("confidence", 1.0)
                                        })
                                transcription_result["words"] = formatted_words
                                print(f"Found {len(formatted_words)} words with timestamps")
                if "results" in result_dict and "sentiments" in result_dict["results"]:
                    sentiments = result_dict["results"]["sentiments"]
                    if "average" in sentiments:
                        avg = sentiments["average"]
                        transcription_result["average_sentiment"] = {
                            "sentiment": avg.get("sentiment", "neutral"),
                            "sentiment_score": avg.get("sentiment_score", 0)
                        }
                        print(f"Found sentiment: {transcription_result['average_sentiment']['sentiment']}")
                if "results" in result_dict and "summary" in result_dict["results"]:
                    summary = result_dict["results"]["summary"]
                    if "short" in summary:
                        transcription_result["summary"] = summary["short"]
                    elif "text" in summary:
                        transcription_result["summary"] = summary["text"]
                    print(f"Found summary: {transcription_result['summary'][:50]}...")
                print(f"Created transcription result with {len(transcription_result['words'])} words")
                return transcription_result
            else:
                raise
        print(f"Processing Deepgram response")
        if hasattr(response, 'results'):
            result = response.results
        else:
            result = response
        transcription_result = {
            "text": "No transcription available.",
            "words": [],
            "average_sentiment": {"sentiment": "neutral", "sentiment_score": 0},
            "summary": "No summary available."
        }
        if hasattr(result, 'channels') and result.channels:
            channel = result.channels[0]
            if hasattr(channel, 'alternatives') and channel.alternatives:
                alternative = channel.alternatives[0]
                if hasattr(alternative, 'transcript'):
                    transcription_result["text"] = alternative.transcript
                    print(f"Got transcript text: {transcription_result['text'][:50]}...")

                    if hasattr(alternative, 'words') and alternative.words:
                        words = alternative.words
                        print(f"Got {len(words)} words with timestamps")

                        formatted_words = []
                        for word in words:
                            if hasattr(word, 'word') and hasattr(word, 'start'):
                                formatted_words.append({
                                    "word": word.word,
                                    "start": word.start,
                                    "end": word.end if hasattr(word, 'end') else word.start + 0.5,
                                    "confidence": word.confidence if hasattr(word, 'confidence') else 1.0
                                })

                        transcription_result["words"] = formatted_words

        if not transcription_result["text"] or transcription_result["text"] == "No transcription available.":
            if hasattr(result, 'utterances') and result.utterances:
                utterances_text = []
                all_words = []

                for utterance in result.utterances:
                    if hasattr(utterance, 'transcript'):
                        utterances_text.append(utterance.transcript)

                    if hasattr(utterance, 'words') and utterance.words:
                        for word in utterance.words:
                            if hasattr(word, 'word') and hasattr(word, 'start'):
                                all_words.append({
                                    "word": word.word,
                                    "start": word.start,
                                    "end": word.end if hasattr(word, 'end') else word.start + 0.5,
                                    "confidence": word.confidence if hasattr(word, 'confidence') else 1.0
                                })

                if utterances_text:
                    transcription_result["text"] = " ".join(utterances_text)
                    print(f"Got transcript from utterances: {transcription_result['text'][:50]}...")

                if all_words:
                    transcription_result["words"] = all_words
                    print(f"Got {len(all_words)} words from utterances")

        sentiment_info = {"sentiment": "neutral", "sentiment_score": 0}

        if hasattr(result, 'channels') and result.channels and hasattr(result.channels[0], 'alternatives') and result.channels[0].alternatives:
            alternative = result.channels[0].alternatives[0]
            if hasattr(alternative, 'sentiment') and alternative.sentiment:
                sentiment_data = alternative.sentiment
                sentiment_info = {
                    "sentiment": sentiment_data.sentiment if hasattr(sentiment_data, 'sentiment') else "neutral",
                    "sentiment_score": sentiment_data.sentiment_score if hasattr(sentiment_data, 'sentiment_score') else 0
                }
                print(f"Got sentiment from alternative: {sentiment_info['sentiment']}, score: {sentiment_info['sentiment_score']}")

        if sentiment_info["sentiment"] == "neutral" and hasattr(result, 'sentiments') and result.sentiments:
            if hasattr(result.sentiments, 'average') and result.sentiments.average:
                avg = result.sentiments.average
                sentiment_info = {
                    "sentiment": avg.sentiment if hasattr(avg, 'sentiment') else "neutral",
                    "sentiment_score": avg.sentiment_score if hasattr(avg, 'sentiment_score') else 0
                }
                print(f"Got sentiment from sentiments.average: {sentiment_info['sentiment']}, score: {sentiment_info['sentiment_score']}")

        transcription_result["average_sentiment"] = sentiment_info
        summary = "No summary available."

        if hasattr(result, 'summary') and result.summary:
            if hasattr(result.summary, 'short'):
                summary = result.summary.short
            elif hasattr(result.summary, 'text'):
                summary = result.summary.text

            print(f"Got summary: {summary[:50]}...")

        transcription_result["summary"] = summary

        print(f"Transcription completed with {len(transcription_result['words'])} words")
        print(f"Result keys: {transcription_result.keys()}")
        print(f"Sample words: {transcription_result['words'][:2] if transcription_result['words'] else 'none'}")

        return transcription_result

    except Exception as e:
        print(f"Error in transcription: {str(e)}")
        print(traceback.format_exc())
        return {
            "text": "Transcription failed.",
            "error": "internal_error",
            "words": [],
            "average_sentiment": {"sentiment": "neutral", "sentiment_score": 0},
            "summary": "No summary available due to transcription error."
        }
