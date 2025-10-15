"""Tests for security module."""
from jose import jwt

from app.core.security import (
    hash_password, 
    verify_password, 
    create_access_token, 
    decode_token
)
from app.core.config import settings


class TestSecurity:
    """Test cases for security functions."""

    def test_hash_password(self):
        """Test password hashing."""
        password = "test_password_123"
        hashed = hash_password(password)
        
        assert hashed != password
        assert isinstance(hashed, str)
        assert len(hashed) > 0

    def test_verify_password_correct(self):
        """Test password verification with correct password."""
        password = "test_password_123"
        hashed = hash_password(password)
        
        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password."""
        password = "test_password_123"
        wrong_password = "wrong_password"
        hashed = hash_password(password)
        
        assert verify_password(wrong_password, hashed) is False

    def test_create_access_token_string_subject(self):
        """Test creating access token with string subject."""
        subject = "test_user_123"
        token = create_access_token(subject=subject)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Decode to verify content
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_alg])
        assert payload["sub"] == subject

    def test_create_access_token_int_subject(self):
        """Test creating access token with integer subject."""
        subject = 123
        token = create_access_token(subject=subject)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Decode to verify content
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_alg])
        assert payload["sub"] == str(subject)

    def test_decode_token_valid(self):
        """Test token decoding with valid token."""
        subject = "test_user_123"
        token = create_access_token(subject=subject)
        
        payload = decode_token(token)
        
        assert payload is not None
        assert payload.get("sub") == subject

    def test_decode_token_invalid(self):
        """Test token decoding with invalid token."""
        invalid_token = "invalid.token.here"
        
        try:
            decode_token(invalid_token)
            assert False, "Should have raised ValueError"
        except ValueError as e:
            assert "Invalid token" in str(e)

    def test_decode_token_expired(self):
        """Test token decoding with expired token."""
        # Create token with negative expiration (expired)
        import datetime
        from jose import jwt
        
        payload = {
            "sub": "test_user",
            "exp": datetime.datetime.utcnow() - datetime.timedelta(hours=1)
        }
        expired_token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_alg)
        
        try:
            decode_token(expired_token)
            assert False, "Should have raised ValueError"
        except ValueError as e:
            assert "Invalid token" in str(e)

    def test_decode_token_malformed(self):
        """Test token decoding with malformed token."""
        malformed_tokens = [
            "not.a.token",
            "header.payload",  # Missing signature
            "",
            "malformed_token_without_dots"
        ]
        
        for token in malformed_tokens:
            try:
                decode_token(token)
                assert False, f"Token '{token}' should be invalid"
            except ValueError:
                pass  # Expected
            