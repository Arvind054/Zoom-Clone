from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine
from meetings import router as meetings_router
from models import Base

app = FastAPI(title="Zoom Clone API")

Base.metadata.create_all(engine)
app.include_router(meetings_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "zoom-clone-api"}
