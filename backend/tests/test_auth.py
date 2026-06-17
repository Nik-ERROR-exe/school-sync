import pytest
from datetime import timedelta
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.core.exceptions import CredentialsException

def test_password_hashing():
    """
    Tests that plain passwords can be securely hashed and verified.
    """
    password = "MySecurePassword123"
    hashed = get_password_hash(password)
    
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong_password", hashed) is False

def test_jwt_generation_and_decoding():
    """
    Tests that JWT access tokens can be signed and decoded to verify claims.
    """
    payload_data = {"sub": "12345", "role": "ADMIN"}
    token = create_access_token(data=payload_data, expires_delta=timedelta(minutes=5))
    
    assert isinstance(token, str)
    assert len(token) > 0
    
    decoded = decode_access_token(token)
    assert decoded["sub"] == "12345"
    assert decoded["role"] == "ADMIN"
    assert "exp" in decoded

def test_jwt_invalid_token():
    """
    Tests that decode_access_token raises CredentialsException when passed an invalid token.
    """
    with pytest.raises(CredentialsException):
        decode_access_token("invalid.token.signature")
