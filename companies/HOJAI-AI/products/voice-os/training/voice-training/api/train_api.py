"""
Training Dashboard API

Real-time training monitoring and management:
- Start/Stop training
- View progress
- Download models
- View metrics

Usage:
    python api/train_api.py
"""

import os
import json
import asyncio
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional
from datetime import datetime
from enum import Enum

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ============================================================================
# MODELS
# ============================================================================

class ModelType(str, Enum):
    WHISPER = "whisper"
    INTENT = "intent"
    SPEAKER = "speaker"

class TrainingStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ModelInfo(BaseModel):
    id: str
    name: str
    type: ModelType
    status: TrainingStatus
    progress: float
    current_epoch: int
    total_epochs: int
    loss: Optional[float] = None
    accuracy: Optional[float] = None
    created_at: str
    updated_at: str
    model_path: Optional[str] = None

class TrainingConfig(BaseModel):
    type: ModelType
    dataset_path: str
    output_path: str
    epochs: int = 3
    batch_size: int = 8
    learning_rate: float = 1e-5

# ============================================================================
# STORE
# ============================================================================

class TrainingStore:
    def __init__(self):
        self.jobs: Dict[str, ModelInfo] = {}
        self.websockets: List[WebSocket] = []
        self.checkpoints: Dict[str, Dict] = {}

    def create_job(self, config: TrainingConfig) -> str:
        job_id = f"job_{len(self.jobs) + 1}_{datetime.now().strftime('%Y%m%d%H%M%S')}"

        job = ModelInfo(
            id=job_id,
            name=f"{config.type.value}_training",
            type=config.type,
            status=TrainingStatus.PENDING,
            progress=0.0,
            current_epoch=0,
            total_epochs=config.epochs,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
        )

        self.jobs[job_id] = job
        return job_id

    def update_job(self, job_id: str, **kwargs):
        if job_id in self.jobs:
            job = self.jobs[job_id]
            for key, value in kwargs.items():
                setattr(job, key, value)
            job.updated_at = datetime.now().isoformat()
            self.notify_websockets(job)

    def get_job(self, job_id: str) -> Optional[ModelInfo]:
        return self.jobs.get(job_id)

    def list_jobs(self) -> List[ModelInfo]:
        return list(self.jobs.values())

    async def add_websocket(self, websocket: WebSocket):
        await websocket.accept()
        self.websockets.append(websocket)

    def remove_websocket(self, websocket: WebSocket):
        if websocket in self.websockets:
            self.websockets.remove(websocket)

    async def notify_websockets(self, job: ModelInfo):
        for ws in self.websockets:
            try:
                await ws.send_json(asdict(job))
            except:
                pass

# ============================================================================
# SIMULATED TRAINING
# ============================================================================

class TrainingSimulator:
    def __init__(self, store: TrainingStore):
        self.store = store
        self.running_tasks: Dict[str, asyncio.Task] = {}

    async def start_training(self, job_id: str, config: TrainingConfig):
        """Simulate training with progress updates"""
        self.store.update_job(job_id, status=TrainingStatus.RUNNING)

        epochs = config.epochs
        for epoch in range(1, epochs + 1):
            # Check if cancelled
            job = self.store.get_job(job_id)
            if job and job.status == TrainingStatus.CANCELLED:
                return

            # Simulate training steps
            for step in range(100):
                # Update progress
                progress = ((epoch - 1) * 100 + step) / epochs / 100
                loss = max(0.1, 1.0 - (epoch / epochs) * 0.8 - (step / 100) * 0.1)
                accuracy = min(0.99, 0.5 + (epoch / epochs) * 0.4 + (step / 100) * 0.1)

                self.store.update_job(
                    job_id,
                    progress=progress,
                    current_epoch=epoch,
                    loss=loss,
                    accuracy=accuracy,
                )

                await asyncio.sleep(0.1)  # Simulate step time

            # Epoch complete
            self.store.update_job(
                job_id,
                current_epoch=epoch,
                progress=epoch / epochs,
            )

        # Training complete
        self.store.update_job(
            job_id,
            status=TrainingStatus.COMPLETED,
            progress=1.0,
            accuracy=0.95,
            model_path=f"./models/{config.type.value}_trained",
        )

    async def cancel_training(self, job_id: str):
        self.store.update_job(job_id, status=TrainingStatus.CANCELLED)

# ============================================================================
# API
# ============================================================================

app = FastAPI(title="Hojai Training API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

store = TrainingStore()
simulator = TrainingSimulator(store)

# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    return {"status": "ok", "service": "Hojai Training API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# Training Jobs

@app.post("/training/start", response_model=dict)
async def start_training(config: TrainingConfig):
    """Start a new training job"""
    job_id = store.create_job(config)

    # Start training in background
    task = asyncio.create_task(
        simulator.start_training(job_id, config)
    )
    simulator.running_tasks[job_id] = task

    return {"job_id": job_id, "status": "started"}

@app.get("/training/jobs")
async def list_jobs():
    """List all training jobs"""
    return {"jobs": [asdict(job) for job in store.list_jobs()]}

@app.get("/training/jobs/{job_id}")
async def get_job(job_id: str):
    """Get job details"""
    job = store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return asdict(job)

@app.post("/training/jobs/{job_id}/cancel")
async def cancel_job(job_id: str):
    """Cancel a running job"""
    await simulator.cancel_training(job_id)
    return {"job_id": job_id, "status": "cancelled"}

@app.delete("/training/jobs/{job_id}")
async def delete_job(job_id: str):
    """Delete a job"""
    if job_id in store.jobs:
        del store.jobs[job_id]
    return {"job_id": job_id, "status": "deleted"}

# WebSocket for real-time updates

@app.websocket("/training/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time training updates"""
    await store.add_websocket(websocket)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            # Could handle commands here
    except WebSocketDisconnect:
        store.remove_websocket(websocket)

# Models

@app.get("/models")
async def list_models():
    """List available trained models"""
    models_dir = Path("./models")
    if not models_dir.exists():
        return {"models": []}

    models = []
    for model_path in models_dir.glob("*"):
        if model_path.is_dir():
            models.append({
                "name": model_path.name,
                "path": str(model_path),
                "size": sum(f.stat().st_size for f in model_path.rglob("*") if f.is_file()),
                "created": datetime.fromtimestamp(
                    model_path.stat().st_mtime
                ).isoformat(),
            })

    return {"models": models}

@app.get("/models/{model_name}")
async def get_model(model_name: str):
    """Get model details"""
    model_path = Path(f"./models/{model_name}")
    if not model_path.exists():
        raise HTTPException(status_code=404, detail="Model not found")

    card_path = model_path / "model_card.json"
    card = {}
    if card_path.exists():
        card = json.loads(card_path.read_text())

    return {
        "name": model_name,
        "path": str(model_path),
        "card": card,
    }

@app.get("/models/{model_name}/download")
async def download_model(model_name: str):
    """Get download URL for model"""
    model_path = Path(f"./models/{model_name}")
    if not model_path.exists():
        raise HTTPException(status_code=404, detail="Model not found")

    # Return signed URL or local path
    return {
        "url": f"/models/{model_name}/files",
        "size": sum(f.stat().st_size for f in model_path.rglob("*") if f.is_file()),
    }

# Metrics

@app.get("/metrics")
async def get_metrics():
    """Get training metrics summary"""
    jobs = store.list_jobs()

    return {
        "total_jobs": len(jobs),
        "running": len([j for j in jobs if j.status == TrainingStatus.RUNNING]),
        "completed": len([j for j in jobs if j.status == TrainingStatus.COMPLETED]),
        "failed": len([j for j in jobs if j.status == TrainingStatus.FAILED]),
        "avg_accuracy": sum(
            j.accuracy for j in jobs if j.accuracy
        ) / max(1, len([j for j in jobs if j.accuracy])),
    }

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4560)
