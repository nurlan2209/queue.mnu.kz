# app/services/captcha.py
import httpx
from app.config import settings

async def verify_captcha(token: str, remote_ip: str) -> bool:
    """Verify reCAPTCHA token"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://www.google.com/recaptcha/api/siteverify",
                data={
                    "secret": settings.RECAPTCHA_SECRET_KEY,
                    "response": token,
                    "remoteip": remote_ip
                }
            )
        
        result = response.json()
        return result.get("success", False)
    except Exception as e:
        print(f"reCAPTCHA verification error: {e}")
        return False