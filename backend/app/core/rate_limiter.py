"""Simple in-memory rate limiter for authentication endpoints."""
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from typing import Dict, List
from fastapi import HTTPException, status, Request
from app.core.error_codes import ErrorCode, create_error_response


class RateLimiter:
    """In-memory rate limiter using sliding window algorithm."""
    
    def __init__(self, max_requests: int, window_seconds: int):
        """
        Initialize rate limiter.
        
        Args:
            max_requests: Maximum number of requests allowed in the time window
            window_seconds: Time window in seconds
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[datetime]] = defaultdict(list)
    
    def _get_client_id(self, request: Request) -> str:
        """Get unique client identifier (IP + User-Agent)."""
        # Use X-Forwarded-For if behind proxy, otherwise use client IP
        ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
        user_agent = request.headers.get("User-Agent", "")
        return f"{ip}:{user_agent}"
    
    def _clean_old_requests(self, client_id: str, now: datetime):
        """Remove requests outside the current time window."""
        cutoff = now - timedelta(seconds=self.window_seconds)
        self.requests[client_id] = [
            req_time for req_time in self.requests[client_id]
            if req_time > cutoff
        ]
    
    async def check_rate_limit(self, request: Request):
        """
        Check if request exceeds rate limit.
        
        Raises:
            HTTPException: 429 Too Many Requests if rate limit exceeded
        """
        client_id = self._get_client_id(request)
        now = datetime.now(timezone.utc)
        
        # Clean old requests
        self._clean_old_requests(client_id, now)
        
        # Check if limit exceeded
        if len(self.requests[client_id]) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=create_error_response(ErrorCode.RATE_LIMIT_EXCEEDED)
            )
        
        # Add current request
        self.requests[client_id].append(now)


# Rate limiter instances
# Refresh token: 10 requests per 60 seconds (1 minute)
refresh_rate_limiter = RateLimiter(max_requests=10, window_seconds=60)

# Login: 5 requests per 60 seconds (to prevent brute force)
login_rate_limiter = RateLimiter(max_requests=5, window_seconds=60)
