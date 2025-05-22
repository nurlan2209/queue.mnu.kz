# app/services/captcha.py
import httpx
from app.config import settings

async def verify_captcha_v3(token: str, remote_ip: str, action: str = "submit") -> dict:
    """Verify reCAPTCHA v3 token and return score"""
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
        
        # v3 возвращает score от 0 до 1 (1 = человек, 0 = бот)
        # Также проверяем action для дополнительной безопасности
        success = result.get("success", False)
        score = result.get("score", 0.0)
        action_match = result.get("action", "") == action
        
        return {
            "success": success,
            "score": score,
            "action_match": action_match,
            "is_human": success and score >= 0.5 and action_match,  # Порог 0.5
            "error_codes": result.get("error-codes", [])
        }
        
    except Exception as e:
        print(f"reCAPTCHA v3 verification error: {e}")
        return {
            "success": False,
            "score": 0.0,
            "action_match": False,
            "is_human": False,
            "error_codes": ["network_error"]
        }

# Основная функция для проверки (используется в роутах)
async def verify_captcha(token: str, remote_ip: str) -> bool:
    """Main function for v3 verification - returns boolean"""
    result = await verify_captcha_v3(token, remote_ip, "submit")
    return result["is_human"]