from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from app.api.routes import auth, queue, admission, admin, public
from app.database import Base, engine
from app.config import settings

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Admission Queue API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://queue.mnu.kz", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.options("/{path:path}")
async def handle_options():
    return Response(status_code=204)

app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(queue.router, prefix="/api")  # Добавьте префикс /api
app.include_router(admission.router, prefix="/api/admission", tags=["admission"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(public.router, prefix="/api", tags=["public"])  # Это уже правильно

@app.get("/")
def read_root():
    return {"message": "Welcome to Admission Queue API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        ssl_keyfile="/etc/letsencrypt/live/queue.mnu.kz/privkey.pem",
        ssl_certfile="/etc/letsencrypt/live/queue.mnu.kz/fullchain.pem"
    )