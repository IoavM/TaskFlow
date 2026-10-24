import time
from collections import defaultdict
from threading import Lock
from fastapi import Request, HTTPException, status

class InMemoryRateLimiter:
    """
    Sliding-window in-memory rate limiter.
    Limits requests based on client IP and target endpoint action.
    """
    def __init__(self):
        self._records = defaultdict(list)
        self._lock = Lock()

    def check_rate_limit(self, key: str, max_requests: int, window_seconds: int) -> None:
        now = time.time()
        window_start = now - window_seconds

        with self._lock:
            # Purge timestamps outside the current sliding window
            valid_timestamps = [t for t in self._records[key] if t > window_start]
            
            if len(valid_timestamps) >= max_requests:
                oldest_in_window = valid_timestamps[0]
                retry_after = int(oldest_in_window + window_seconds - now) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Demasiados intentos. Por seguridad, por favor espera {retry_after} segundos antes de volver a intentar.",
                    headers={"Retry-After": str(retry_after)}
                )

            valid_timestamps.append(now)
            self._records[key] = valid_timestamps

    def cleanup(self) -> None:
        """Removes keys with no active timestamps to prevent unbounded memory growth."""
        now = time.time()
        with self._lock:
            empty_keys = [k for k, timestamps in self._records.items() if not timestamps or timestamps[-1] < (now - 3600)]
            for k in empty_keys:
                del self._records[k]

limiter = InMemoryRateLimiter()

def get_client_ip(request: Request) -> str:
    """Extracts client IP considering standard reverse-proxy headers (Render, Vercel, Cloudflare)."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def rate_limit(max_requests: int, window_seconds: int):
    """
    FastAPI dependency to rate limit specific sensitive endpoints.
    """
    def dependency(request: Request):
        client_ip = get_client_ip(request)
        key = f"{request.url.path}:{client_ip}"
        limiter.check_rate_limit(key, max_requests=max_requests, window_seconds=window_seconds)
    return dependency
