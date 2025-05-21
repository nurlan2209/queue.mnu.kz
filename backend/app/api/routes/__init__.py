# app/api/routes/__init__.py
from fastapi import APIRouter

from app.api.routes import auth, queue, admission, admin, public

router = APIRouter()

# Include all routers
router.include_router(auth.router)
router.include_router(queue.router)
router.include_router(admission.router, prefix="/admission")
router.include_router(admin.router, prefix="/admin")
router.include_router(public.router, prefix="/public")