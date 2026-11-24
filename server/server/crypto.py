import os
import base64
import hashlib
from cryptography.fernet import Fernet
from django.conf import settings

_fernet_instance = None

def get_fernet() -> Fernet:
    global _fernet_instance
    if _fernet_instance is None:
        raw_key = getattr(settings, 'DATA_SECURITY_KEY', None) or os.environ.get('DATA_SECURITY_KEY')
        if not raw_key:
            # Fallback derivation from SECRET_KEY if DATA_SECURITY_KEY is not set
            base_secret = getattr(settings, 'SECRET_KEY', 'default-security-key-fallback')
            derived_bytes = hashlib.sha256(base_secret.encode('utf-8')).digest()
            raw_key = base64.urlsafe_b64encode(derived_bytes).decode('utf-8')
        
        # Ensure it is a valid 32-byte url-safe base64 string
        try:
            _fernet_instance = Fernet(raw_key.encode('utf-8'))
        except Exception:
            # If invalid format, hash and base64 encode
            derived_bytes = hashlib.sha256(raw_key.encode('utf-8')).digest()
            fernet_key = base64.urlsafe_b64encode(derived_bytes)
            _fernet_instance = Fernet(fernet_key)
            
    return _fernet_instance

ENCRYPTION_PREFIX = "enc::"

def encrypt_data(plain_text: str) -> str:
    """
    Encrypts plain text string using AES-CBC/HMAC Fernet algorithm.
    Prefixed with 'enc::' for transparent detection.
    """
    if plain_text is None:
        return None
    plain_str = str(plain_text).strip()
    if not plain_str or plain_str.startswith(ENCRYPTION_PREFIX):
        return plain_str

    fernet = get_fernet()
    encrypted_bytes = fernet.encrypt(plain_str.encode('utf-8'))
    return f"{ENCRYPTION_PREFIX}{encrypted_bytes.decode('utf-8')}"

def decrypt_data(cipher_text: str) -> str:
    """
    Decrypts encrypted string.
    If the string is not encrypted (does not start with 'enc::'),
    it gracefully returns the string untouched.
    """
    if cipher_text is None:
        return None
    cipher_str = str(cipher_text).strip()
    if not cipher_str.startswith(ENCRYPTION_PREFIX):
        return cipher_str

    try:
        raw_cipher = cipher_str[len(ENCRYPTION_PREFIX):]
        fernet = get_fernet()
        decrypted_bytes = fernet.decrypt(raw_cipher.encode('utf-8'))
        return decrypted_bytes.decode('utf-8')
    except Exception as e:
        # If decryption fails, return original to avoid catastrophic failure
        return cipher_str

def is_encrypted(val: str) -> bool:
    return bool(val and str(val).startswith(ENCRYPTION_PREFIX))
