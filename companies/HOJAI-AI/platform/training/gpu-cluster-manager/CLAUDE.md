# GPU Cluster Manager

**Version:** 1.0.0
**Port:** 4778
**Status:** ✅ NEW (June 19, 2026)
**Layer:** HOJAI AI Training & Model Platform (Division 7)

## What This Is

Tracks GPU nodes, allocates them to training jobs, monitors utilization, schedules queue. Models the cluster as a registry of nodes with capacity, allocated memory, current job, and live metrics. The fine-tuning-pipeline (4776) pulls allocations from here.

7 supported GPU models: H100-80GB, A100-80GB, A100-40GB, L40S-48GB, RTX-4090, T4-16GB, V100-32GB — each with VRAM, FP16 TFLOPS, bandwidth, and recommended workloads.

Seeded with 4 demo nodes (1 H100-80GB×8, 1 A100-80GB×8, 1 L40S-48GB×4, 1 RTX-4090) = 21 GPUs, 1496 GB VRAM.

In production this would talk to k8s GPU operator, slurm, ray, or cloud GPU instance APIs.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/nodes` | Register a GPU node |
| GET | `/api/nodes` | List nodes (filter by `?status=`, `?region=`) |
| GET | `/api/nodes/:id` | Get node details |
| POST | `/api/nodes/:id/heartbeat` | Update utilization metrics |
| DELETE | `/api/nodes/:id` | Deregister a node |
| POST | `/api/allocate` | Allocate GPU for a job |
| POST | `/api/release/:allocationId` | Release GPU |
| GET | `/api/cluster/stats` | Cluster-wide stats |
| GET | `/api/gpu-models` | Supported GPU catalog |

## Quick Start

```bash
cd services/gpu-cluster-manager
npm install
npm start  # port 4778

# Allocate 80GB for a fine-tune job
curl -X POST http://localhost:4778/api/allocate \
  -H "Content-Type: application/json" \
  -d '{"jobId":"ft-123","vramNeeded":80,"gpuModel":"A100-80GB"}'
```

## Integration

- **fine-tuning-pipeline (4776)** — pulls allocations from here
- **inference-gateway (4770)** — also uses this for serving-side GPU
- **model-registry (4773)** — track which GPUs are running which model versions
