"""
Idempotent Receiver Middleware for TaskFlow.

Ensures that mutation requests (POST, PUT, PATCH, DELETE) carrying an
X-Idempotency-Key header are processed at most once.  If the backend
receives the same key again (e.g. because the client's retry loop
re-sent a request whose response was lost in transit), it returns the
previously cached response instead of executing the handler twice.

Storage: In-memory dict with TTL-based eviction.
This is appropriate for a single-instance Render free-tier deployment.
"""

import time
import threading
from typing import Dict, Tuple, Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

# TTL for cached idempotency responses (10 minutes)
IDEMPOTENCY_TTL_SECONDS = 600

# Max entries before forced cleanup
MAX_CACHE_ENTRIES = 2000


class _IdempotencyStore:
    """Thread-safe in-memory store for idempotency keys with TTL eviction."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        # key -> (response_status, response_body_bytes, response_headers_dict, expires_at)
        self._cache: Dict[str, Tuple[int, bytes, dict, float]] = {}
        # key -> True means "currently being processed (in-flight)"
        self._inflight: Dict[str, bool] = {}

    def _evict_expired(self) -> None:
        now = time.time()
        expired = [k for k, v in self._cache.items() if v[3] < now]
        for k in expired:
            del self._cache[k]

    def get(self, key: str) -> Optional[Tuple[int, bytes, dict]]:
        with self._lock:
            self._evict_expired()
            entry = self._cache.get(key)
            if entry and entry[3] >= time.time():
                return entry[0], entry[1], entry[2]
            return None

    def is_inflight(self, key: str) -> bool:
        with self._lock:
            return self._inflight.get(key, False)

    def mark_inflight(self, key: str) -> None:
        with self._lock:
            self._inflight[key] = True

    def store(self, key: str, status: int, body: bytes, headers: dict) -> None:
        with self._lock:
            if len(self._cache) >= MAX_CACHE_ENTRIES:
                self._evict_expired()
            self._cache[key] = (status, body, headers, time.time() + IDEMPOTENCY_TTL_SECONDS)
            self._inflight.pop(key, None)

    def clear_inflight(self, key: str) -> None:
        with self._lock:
            self._inflight.pop(key, None)


_store = _IdempotencyStore()

# Methods that are mutations and should be idempotency-checked
_MUTATION_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class IdempotencyMiddleware(BaseHTTPMiddleware):
    """
    Starlette middleware that intercepts requests with an X-Idempotency-Key
    header and ensures at-most-once processing.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Only apply to mutation methods
        if request.method not in _MUTATION_METHODS:
            return await call_next(request)

        idem_key = request.headers.get("x-idempotency-key")
        if not idem_key:
            # No idempotency key provided — process normally
            return await call_next(request)

        # 1. Check if we already have a cached response for this key
        cached = _store.get(idem_key)
        if cached is not None:
            status, body, headers = cached
            return Response(content=body, status_code=status, headers=headers)

        # 2. Check if this key is currently being processed (parallel duplicate)
        if _store.is_inflight(idem_key):
            return JSONResponse(
                status_code=409,
                content={"detail": "Esta solicitud ya se está procesando. Por favor espera."},
            )

        # 3. Mark as in-flight and process
        _store.mark_inflight(idem_key)
        try:
            response = await call_next(request)

            # Read the response body to cache it
            body = b""
            async for chunk in response.body_iterator:
                body += chunk if isinstance(chunk, bytes) else chunk.encode()

            # Build cacheable headers (only content-type)
            cache_headers = {}
            if "content-type" in response.headers:
                cache_headers["content-type"] = response.headers["content-type"]

            _store.store(idem_key, response.status_code, body, cache_headers)

            return Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers),
            )
        except Exception:
            _store.clear_inflight(idem_key)
            raise
