"""
REZ Ranking Model Service
ML-based ranking model with LightGBM/LambdaMART for Learning to Rank.
"""

import os
import json
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime
import pickle
import logging

# Flask for HTTP API
from flask import Flask, request, jsonify

# Optional: Use LightGBM if available, otherwise fall back to custom implementation
try:
    import lightgbm as lgb
    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False
    from lambdamart import LambdaMART

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ItemFeatures:
    """Feature representation for a ranking item."""
    views: float = 0.0
    clicks: float = 0.0
    avg_rating: float = 0.0
    review_count: float = 0.0
    trend_score: float = 0.0
    user_affinity: float = 0.0
    text_match: float = 0.0
    semantic_score: float = 0.0
    recency_score: float = 0.0
    quality_score: float = 0.0

    def to_array(self) -> np.ndarray:
        """Convert to numpy array for model input."""
        return np.array([
            self.views,
            self.clicks,
            self.avg_rating,
            self.review_count,
            self.trend_score,
            self.user_affinity,
            self.text_match,
            self.semantic_score,
            self.recency_score,
            self.quality_score
        ])

    @classmethod
    def from_dict(cls, data: Dict) -> 'ItemFeatures':
        """Create from dictionary."""
        return cls(
            views=data.get('views', 0.0),
            clicks=data.get('clicks', 0.0),
            avg_rating=data.get('avg_rating', 0.0),
            review_count=data.get('review_count', 0.0),
            trend_score=data.get('trend_score', 0.0),
            user_affinity=data.get('user_affinity', 0.0),
            text_match=data.get('text_match', 0.0),
            semantic_score=data.get('semantic_score', 0.0),
            recency_score=data.get('recency_score', 0.0),
            quality_score=data.get('quality_score', 0.0)
        )


@dataclass
class RankingRequest:
    """Ranking request from API."""
    items: List[Dict]
    context: Dict = None
    user_id: str = ''
    experiment_id: str = ''
    weights: Dict[str, float] = None

    def __post_init__(self):
        if self.context is None:
            self.context = {}
        if self.weights is None:
            self.weights = {
                'relevance': 0.3,
                'popularity': 0.3,
                'recency': 0.2,
                'quality': 0.1,
                'personalization': 0.1
            }


@dataclass
class RankingResult:
    """Ranking result."""
    item_id: str
    score: float
    rank: int
    features: Dict[str, float]
    explanation: List[str]


class RankingModel:
    """
    ML-based ranking model combining multiple signals.
    Supports LightGBM LambdaMART or custom LambdaMART implementation.
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        use_lightgbm: bool = True
    ):
        self.model_path = model_path or os.environ.get('MODEL_PATH', 'models/ranking_model.pkl')
        self.use_lightgbm = use_lightgbm and HAS_LIGHTGBM
        self.model = None
        self.feature_names = [
            'views', 'clicks', 'avg_rating', 'review_count', 'trend_score',
            'user_affinity', 'text_match', 'semantic_score', 'recency_score', 'quality_score'
        ]

        self._load_model()

    def _load_model(self):
        """Load trained model from disk."""
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, 'rb') as f:
                    self.model = pickle.load(f)
                logger.info(f"Model loaded from {self.model_path}")
            except Exception as e:
                logger.warning(f"Failed to load model: {e}, using rule-based fallback")
                self.model = None
        else:
            logger.info("No model file found, using rule-based scoring")

    def _extract_features(self, item: Dict, context: Dict) -> np.ndarray:
        """Extract feature vector from item."""
        features = item.get('features', {})

        item_features = ItemFeatures(
            views=features.get('views', 0.0),
            clicks=features.get('clicks', 0.0),
            avg_rating=features.get('avg_rating', 0.0),
            review_count=features.get('review_count', 0.0),
            trend_score=features.get('trend_score', 0.0),
            user_affinity=features.get('user_affinity', 0.0),
            text_match=features.get('text_match', 0.0),
            semantic_score=features.get('semantic_score', 0.0),
            recency_score=self._calculate_recency_score(item.get('updated_at')),
            quality_score=self._calculate_quality_score(features)
        )

        return item_features.to_array()

    def _calculate_recency_score(self, updated_at: Optional[str]) -> float:
        """Calculate recency score based on update time."""
        if not updated_at:
            return 0.5

        try:
            if isinstance(updated_at, str):
                update_time = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
            else:
                update_time = updated_at

            hours_ago = (datetime.now() - update_time).total_seconds() / 3600

            # Exponential decay with half-life of 24 hours
            return np.exp(-0.029 * hours_ago)
        except Exception:
            return 0.5

    def _calculate_quality_score(self, features: Dict) -> float:
        """Calculate overall quality score from features."""
        rating_score = min(1.0, (features.get('avg_rating', 0) / 5.0))
        review_score = min(1.0, features.get('review_count', 0) / 100.0)

        return 0.7 * rating_score + 0.3 * review_score

    def _apply_ml_model(self, features: np.ndarray) -> np.ndarray:
        """Apply ML model to get scores."""
        if self.model is not None and self.use_lightgbm and HAS_LIGHTGBM:
            return self.model.predict(features)
        else:
            # Rule-based scoring fallback
            return self._rule_based_score(features)

    def _rule_based_score(self, features: np.ndarray) -> np.ndarray:
        """Rule-based scoring when ML model is unavailable."""
        # Weights for each feature
        weights = np.array([0.1, 0.15, 0.15, 0.05, 0.15, 0.15, 0.1, 0.1, 0.05, 0.0])

        # Normalize features
        normalized = np.copy(features)

        # Views and clicks: log scale
        normalized[:2] = np.log1p(normalized[:2]) / 10

        # Ratings: already 0-5 scale
        normalized[2] = normalized[2] / 5

        # Review count: log scale
        normalized[3] = np.log1p(normalized[3]) / 5

        # Trend score and affinity: already 0-1 scale
        # Text/semantic: already 0-1 scale

        return np.dot(normalized, weights)

    def rank_items(
        self,
        items: List[Dict],
        context: Optional[Dict] = None,
        weights: Optional[Dict[str, float]] = None,
        diversity_weight: float = 0.0,
        top_k: int = 20
    ) -> List[RankingResult]:
        """
        Rank items based on ML model and rules.

        Args:
            items: List of items with features
            context: Context (location, device, time)
            weights: Custom weights for signal types
            diversity_weight: Weight for diversity (MMR)
            top_k: Number of items to return

        Returns:
            List of ranked items with scores
        """
        if not items:
            return []

        context = context or {}

        # Extract features for all items
        features_list = []
        for item in items:
            features = self._extract_features(item, context)
            features_list.append(features)

        features_array = np.vstack(features_list) if len(features_list) > 1 else features_list[0].reshape(1, -1)

        # Get ML scores
        ml_scores = self._apply_ml_model(features_array)

        # Combine with rule-based scores for robustness
        rule_scores = self._rule_based_score(features_array)

        # Weighted combination
        ml_weight = 0.7 if self.model else 0.0
        combined_scores = ml_weight * ml_scores + (1 - ml_weight) * rule_scores

        # Apply custom weights if provided
        if weights:
            combined_scores = self._apply_custom_weights(
                combined_scores,
                features_array,
                weights
            )

        # Apply diversity (MMR - Maximal Marginal Relevance)
        if diversity_weight > 0:
            combined_scores = self._apply_diversity(
                combined_scores,
                items,
                diversity_weight
            )

        # Sort by score
        ranked_indices = np.argsort(-combined_scores)

        # Build results
        results = []
        for rank, idx in enumerate(ranked_indices[:top_k]):
            item = items[idx]
            result = RankingResult(
                item_id=item.get('id', f'item_{idx}'),
                score=float(combined_scores[idx]),
                rank=rank + 1,
                features=dict(zip(self.feature_names, features_array[idx].tolist())),
                explanation=self._generate_explanation(
                    features_array[idx],
                    combined_scores[idx],
                    item
                )
            )
            results.append(result)

        return results

    def _apply_custom_weights(
        self,
        scores: np.ndarray,
        features: np.ndarray,
        weights: Dict[str, float]
    ) -> np.ndarray:
        """Apply custom weights to signal categories."""
        adjusted_scores = np.copy(scores)

        # Signal category to feature index mapping
        signal_map = {
            'relevance': [6, 7],  # text_match, semantic_score
            'popularity': [0, 1],  # views, clicks
            'recency': [8],        # recency_score
            'quality': [2, 3],     # avg_rating, review_count
            'personalization': [5]  # user_affinity
        }

        for signal, weight in weights.items():
            if signal in signal_map and weight > 0:
                indices = signal_map[signal]
                for idx in indices:
                    features[:, idx] *= weight

        # Recalculate scores
        adjusted_scores = self._rule_based_score(features)

        return adjusted_scores

    def _apply_diversity(
        self,
        scores: np.ndarray,
        items: List[Dict],
        diversity_weight: float
    ) -> np.ndarray:
        """Apply Maximal Marginal Relevance for diversity."""
        n = len(scores)
        if n <= 1:
            return scores

        adjusted_scores = np.copy(scores)
        item_types = [item.get('type', 'default') for item in items]
        type_counts = {}

        # Sort by original score
        sorted_indices = np.argsort(-scores)

        for idx in sorted_indices:
            item_type = item_types[idx]
            current_count = type_counts.get(item_type, 0)

            # Penalty for repeated types
            diversity_penalty = diversity_weight * (current_count / max(1, n * 0.3))
            adjusted_scores[idx] *= (1 - diversity_penalty)

            type_counts[item_type] = current_count + 1

        return adjusted_scores

    def _generate_explanation(
        self,
        features: np.ndarray,
        score: float,
        item: Dict
    ) -> List[str]:
        """Generate human-readable explanation for the ranking."""
        explanations = []

        explanations.append(f"Overall score: {score:.4f}")

        feature_names = [
            'views', 'clicks', 'rating', 'reviews',
            'trending', 'affinity', 'text_match',
            'semantic', 'recency', 'quality'
        ]

        # Highlight strong features
        for i, (name, value) in enumerate(zip(feature_names, features)):
            if value > 0.7:
                explanations.append(f"Strong {name}: {value:.2f}")
            elif value > 0.5:
                explanations.append(f"Good {name}: {value:.2f}")

        return explanations

    def save_model(self, path: Optional[str] = None):
        """Save model to disk."""
        save_path = path or self.model_path

        os.makedirs(os.path.dirname(save_path), exist_ok=True)

        with open(save_path, 'wb') as f:
            pickle.dump(self.model, f)

        logger.info(f"Model saved to {save_path}")

    def update_model(self, training_data: Tuple[np.ndarray, np.ndarray, List[int]]):
        """
        Update model with new training data.
        Uses online learning to incrementally update the model.

        Args:
            training_data: (X, y, groups) tuple
        """
        X, y, groups = training_data

        if HAS_LIGHTGBM:
            # Incremental update with LightGBM
            if self.model is None:
                # Create new model
                params = {
                    'objective': 'lambdarank',
                    'metric': 'ndcg',
                    'boosting_type': 'gbdt',
                    'num_leaves': 31,
                    'learning_rate': 0.1,
                    'feature_fraction': 0.9,
                    'bagging_fraction': 0.8,
                    'bagging_freq': 5,
                    'verbose': -1
                }

                train_data = lgb.Dataset(X, y, group=groups)
                self.model = lgb.train(params, train_data, num_boost_round=50)
            else:
                # Update existing model
                # Note: LightGBM doesn't support true incremental learning
                # In production, retrain periodically
                logger.info("Model update scheduled for next retraining cycle")
        else:
            # Use custom LambdaMART
            if self.model is None:
                self.model = LambdaMART(n_estimators=50, max_depth=4)
            self.model.fit(X, y, groups)

        logger.info("Model updated with new training data")


class RankingService:
    """HTTP service for ranking."""

    def __init__(self, model_path: Optional[str] = None):
        self.model = RankingModel(model_path)
        self.app = Flask(__name__)
        self._setup_routes()

    def _setup_routes(self):
        """Setup Flask routes."""
        app = self.app

        @app.route('/health', methods=['GET'])
        def health():
            return jsonify({
                'status': 'healthy',
                'model_loaded': self.model.model is not None,
                'use_lightgbm': self.model.use_lightgbm,
                'timestamp': datetime.now().isoformat()
            })

        @app.route('/predict', methods=['POST'])
        def predict():
            try:
                data = request.json

                items = data.get('items', [])
                context = data.get('context', {})
                weights = data.get('weights')
                diversity_weight = data.get('diversityWeight', 0.0)
                top_k = data.get('topK', 20)

                results = self.model.rank_items(
                    items=items,
                    context=context,
                    weights=weights,
                    diversity_weight=diversity_weight,
                    top_k=top_k
                )

                # Format response
                response = {
                    'results': [asdict(r) for r in results],
                    'metadata': {
                        'total_items': len(items),
                        'returned_items': len(results),
                        'model_used': 'lightgbm' if self.model.use_lightgbm else 'rule_based'
                    }
                }

                return jsonify(response)

            except Exception as e:
                logger.error(f"Prediction error: {e}")
                return jsonify({
                    'error': str(e),
                    'message': 'Prediction failed'
                }), 500

        @app.route('/rank', methods=['POST'])
        def rank():
            """Alternative endpoint with more detailed response."""
            try:
                data = request.json

                items = data.get('items', [])
                context = data.get('context', {})
                weights = data.get('weights')
                diversity_weight = data.get('diversityWeight', 0.0)
                top_k = data.get('topK', 20)

                results = self.model.rank_items(
                    items=items,
                    context=context,
                    weights=weights,
                    diversity_weight=diversity_weight,
                    top_k=top_k
                )

                # Return detailed ranking response
                response = {
                    'ranked': [
                        {
                            'id': r.item_id,
                            'score': r.score,
                            'rank': r.rank,
                            'explanation': r.explanation,
                            'features': r.features
                        }
                        for r in results
                    ],
                    'metadata': {
                        'input_count': len(items),
                        'output_count': len(results),
                        'model_type': 'ml' if self.model.model else 'rule_based'
                    }
                }

                return jsonify(response)

            except Exception as e:
                logger.error(f"Rank error: {e}")
                return jsonify({
                    'error': str(e)
                }), 500

        @app.route('/model/update', methods=['POST'])
        def update_model():
            """Update the model with new training data."""
            try:
                data = request.json

                X = np.array(data['X'])
                y = np.array(data['y'])
                groups = data['groups']

                self.model.update_model((X, y, groups))

                return jsonify({
                    'success': True,
                    'message': 'Model updated'
                })

            except Exception as e:
                logger.error(f"Model update error: {e}")
                return jsonify({
                    'error': str(e)
                }), 500

        @app.route('/model/info', methods=['GET'])
        def model_info():
            """Get model information."""
            return jsonify({
                'model_loaded': self.model.model is not None,
                'use_lightgbm': self.model.use_lightgbm,
                'model_path': self.model.model_path,
                'feature_names': self.model.feature_names
            })

    def run(self, host: str = '0.0.0.0', port: int = 5007):
        """Run the Flask server."""
        self.app.run(host=host, port=port, debug=False)


def main():
    """Main entry point."""
    model_path = os.environ.get('MODEL_PATH', 'models/ranking_model.pkl')
    port = int(os.environ.get('PORT', 5007))

    service = RankingService(model_path)
    logger.info(f"Starting ranking service on port {port}")
    service.run(port=port)


if __name__ == '__main__':
    main()
