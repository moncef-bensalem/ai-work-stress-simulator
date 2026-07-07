from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AI Work Stress Simulator API",
    description="Plateforme interactive de sensibilisation à l'aliénation numérique",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "AI Work Stress Simulator API", "status": "running"}


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "backend"}
