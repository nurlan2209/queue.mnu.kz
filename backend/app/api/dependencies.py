from fastapi import Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.security import (
    get_current_user,
    get_current_active_user,
    get_admission_user,
    get_admin_user
)

# Security scheme
security = HTTPBearer()

# Dependencies for protecting routes
def get_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Extract JWT token from authorization header"""
    return credentials.credentials