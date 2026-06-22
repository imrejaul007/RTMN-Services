# REZ AutoML Pipeline

**Port:** 5001

Automated hyperparameter tuning and model selection service for ML models.

## Features

- **Auto Model Selection** - Automatically selects best model for your data
- **Hyperparameter Tuning** - RandomizedSearchCV for parameter optimization
- **Model Registry** - Version control and metadata storage
- **Experiment Tracking** - Track metrics across runs
- **Model Comparison** - Compare model performance
- **Python Integration** - Seamless Python ML execution

## Architecture

```
AutoML Pipeline
├── API Server (Node.js)           # Orchestration
├── Training Workers (Python)       # Hyperparameter search
├── Model Registry                 # Versioning
└── Experiment Tracker             # Metrics history
```

## Supported Models

### Classifiers
- Logistic Regression
- Random Forest
- Gradient Boosting
- XGBoost
- Support Vector Machine
- K-Nearest Neighbors
- Naive Bayes
- Decision Tree

### Regressors
- Linear Regression
- Ridge Regression
- Lasso Regression
- Random Forest Regressor
- Gradient Boosting Regressor
- XGBoost Regressor
- Support Vector Regressor
- ElasticNet

## Quick Start

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
cd python && pip install -r requirements.txt && cd ..

# Configure environment
cp .env.example .env

# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Experiments

```bash
# Create experiment
POST /api/experiments
{
  "name": "churn_prediction_v1",
  "problemType": "classification",
  "targetColumn": "churned",
  "metrics": ["accuracy", "roc_auc", "f1"]
}

# List experiments
GET /api/experiments

# Get experiment results
GET /api/experiments/:id/results
```

### Training Jobs

```bash
# Start training job
POST /api/training/start
{
  "experimentId": "exp_123",
  "dataset": { "url": "s3://bucket/data.csv" },
  "config": {
    "models": ["random_forest", "xgboost", "gradient_boosting"],
    "cvFolds": 5,
    "maxIterations": 100
  }
}

# Get job status
GET /api/training/:jobId/status

# Cancel job
DELETE /api/training/:jobId
```

### Model Registry

```bash
# List models
GET /api/models

# Get model details
GET /api/models/:id

# Compare models
POST /api/models/compare
{
  "modelIds": ["model_1", "model_2", "model_3"],
  "metrics": ["accuracy", "roc_auc"]
}

# Register model
POST /api/models
{
  "name": "churn_model_v1",
  "type": "classifier",
  "framework": "xgboost",
  "artifactUrl": "s3://bucket/models/churn_v1.pkl"
}
```

## Example Usage

### 1. Create Experiment
```bash
curl -X POST http://localhost:5001/api/experiments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "customer_churn_prediction",
    "problemType": "classification",
    "targetColumn": "churned",
    "metrics": ["accuracy", "roc_auc", "precision", "recall"]
  }'
```

### 2. Start Training
```bash
curl -X POST http://localhost:5001/api/training/start \
  -H "Content-Type: application/json" \
  -d '{
    "experimentId": "exp_abc123",
    "config": {
      "models": ["random_forest", "gradient_boosting", "xgboost"],
      "cvFolds": 5,
      "maxIterations": 50,
      "testSize": 0.2
    }
  }'
```

### 3. Get Results
```bash
curl http://localhost:5001/api/experiments/exp_abc123/results
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5001 |
| `MONGODB_URI` | MongoDB connection | mongodb://localhost:27017/rez-automl |
| `PYTHON_PATH` | Python executable path | python3 |
| `MODEL_STORAGE_URL` | S3/GCS URL for models | ./models |
| `NODE_ENV` | Environment | development |

## Model Configuration

```typescript
interface TrainingConfig {
  models: ModelType[];
  cvFolds: number;        // Cross-validation folds (default: 5)
  testSize: number;        // Test split ratio (default: 0.2)
  maxIterations: number;   // Max hyperparameter iterations (default: 100)
  scoring: Metric;         // Optimization metric
}

type ModelType = 
  | 'logistic_regression'
  | 'random_forest'
  | 'gradient_boosting'
  | 'xgboost'
  | 'svm'
  | 'knn'
  | 'naive_bayes'
  | 'decision_tree';

type Metric = 
  | 'accuracy'
  | 'roc_auc'
  | 'f1'
  | 'precision'
  | 'recall'
  | 'mae'
  | 'rmse'
  | 'r2';
```

## Metrics Tracked

- Training time
- Inference latency
- Feature importance
- Cross-validation scores
- Learning curves
- Confusion matrix
- ROC curve data

## Health Checks

```bash
curl http://localhost:5001/health
curl http://localhost:5001/ready
```

## License

MIT
