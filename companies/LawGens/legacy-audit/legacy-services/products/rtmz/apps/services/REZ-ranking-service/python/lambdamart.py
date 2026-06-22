"""
LambdaMART implementation for Learning to Rank.
LambdaMART is a listwise learning-to-rank algorithm that uses gradient boosted trees.
"""

import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import pickle
import os


@dataclass
class Document:
    """Represents a document to be ranked."""
    doc_id: str
    features: np.ndarray
    relevance: float = 0.0  # Ground truth relevance (0-4 scale typical)
    predicted_score: float = 0.0


class LambdaMART:
    """
    LambdaMART: Lambda Gradient Boosted Decision Trees for Learning to Rank.

    This implementation follows the algorithm described in:
    "LambdaMART: A Machine Learning Algorithm for Relevance Ranking"

    Features:
    - Gradient boosted trees with Lambda gradient
    - NDCG optimization
    - Feature importance tracking
    - Model persistence
    """

    def __init__(
        self,
        n_estimators: int = 100,
        max_depth: int = 5,
        learning_rate: float = 0.1,
        min_samples_leaf: int = 10,
        feature_fraction: float = 0.8,
        subsample: float = 0.8,
        random_state: int = 42
    ):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.learning_rate = learning_rate
        self.min_samples_leaf = min_samples_leaf
        self.feature_fraction = feature_fraction
        self.subsample = subsample
        self.random_state = random_state

        self.trees: List[Dict] = []
        self.feature_importances_: np.ndarray = None
        self.feature_names: List[str] = None
        self.n_features: int = 0
        self.base_scores: List[float] = []

        np.random.seed(random_state)

    def _calculate_dcg(self, relevance: np.ndarray, k: Optional[int] = None) -> float:
        """Calculate Discounted Cumulative Gain."""
        if k is not None:
            relevance = relevance[:k]
        gains = 2 ** relevance - 1
        discounts = np.log2(np.arange(len(relevance)) + 2)
        return np.sum(gains / discounts)

    def _calculate_ndcg(
        self,
        predicted_order: List[Document],
        k: Optional[int] = None
    ) -> float:
        """Calculate Normalized Discounted Cumulative Gain."""
        if len(predicted_order) == 0:
            return 0.0

        # Get predicted relevance scores
        predicted_relevance = np.array([d.relevance for d in predicted_order])

        # Get ideal relevance scores (sorted descending)
        ideal_relevance = np.sort(predicted_relevance)[::-1]

        dcg = self._calculate_dcg(predicted_relevance, k)
        idcg = self._calculate_dcg(ideal_relevance, k)

        if idcg == 0:
            return 0.0

        return dcg / idcg

    def _calculate_lambda(
        self,
        relevance: np.ndarray,
        scores: np.ndarray
    ) -> Tuple[np.ndarray, float]:
        """
        Calculate Lambda gradient for each document.
        Lambda represents the gradient that will be used to train the trees.
        """
        n = len(relevance)

        # Get the ranking permutation
        ranking = np.argsort(-scores)
        sorted_relevance = relevance[ranking]
        sorted_scores = scores[ranking]

        # Calculate NDCG at current position
        dcg = self._calculate_dcg(sorted_relevance)
        ideal_dcg = self._calculate_dcg(np.sort(relevance)[::-1])

        if ideal_dcg == 0:
            return np.zeros(n), 0.0

        ndcg = dcg / ideal_dcg

        # Calculate Lambda for each document pair
        lambdas = np.zeros(n)
        delta_ndcg = np.zeros((n, n))

        for i in range(n):
            for j in range(n):
                if i == j:
                    continue

                # Relevance difference
                rel_diff = abs(sorted_relevance[i] - sorted_relevance[j])

                # Position changes
                if sorted_relevance[i] > sorted_relevance[j]:
                    delta_ndcg[i][j] = rel_diff * (
                        1 / np.log2(i + 2) - 1 / np.log2(j + 2)
                    )
                elif sorted_relevance[i] < sorted_relevance[j]:
                    delta_ndcg[i][j] = rel_diff * (
                        1 / np.log2(j + 2) - 1 / np.log2(i + 2)
                    )

        # Calculate Lambda
        for i in range(n):
            for j in range(n):
                if i != j:
                    if ideal_dcg > 0:
                        lambdas[i] += (2 ** sorted_relevance[i] - 2 ** sorted_relevance[j]) * delta_ndcg[i][j]

        return lambdas[ranking], ndcg

    def _build_decision_tree(
        self,
        X: np.ndarray,
        y: np.ndarray,
        lambdas: np.ndarray,
        depth: int = 0,
        indices: Optional[np.ndarray] = None
    ) -> Dict:
        """Build a single decision tree using Lambda gradients."""

        if indices is None:
            indices = np.arange(len(X))

        n_samples = len(indices)

        # Leaf node
        if depth >= self.max_depth or n_samples < self.min_samples_leaf:
            return {
                'type': 'leaf',
                'value': np.sum(lambdas[indices]) / n_samples,
                'count': n_samples
            }

        # Select random feature subset
        n_features_available = X.shape[1]
        n_features_to_try = max(1, int(n_features_available * self.feature_fraction))
        feature_indices = np.random.choice(
            n_features_available,
            n_features_to_try,
            replace=False
        )

        # Find best split
        best_feature = -1
        best_threshold = 0.0
        best_gain = -np.inf

        for feature_idx in feature_indices:
            thresholds = np.percentile(X[indices, feature_idx], [25, 50, 75])

            for threshold in thresholds:
                left_mask = X[indices, feature_idx] <= threshold
                right_mask = ~left_mask

                left_indices = indices[left_mask]
                right_indices = indices[right_mask]

                if len(left_indices) < self.min_samples_leaf or len(right_indices) < self.min_samples_leaf:
                    continue

                # Calculate gain (variance reduction with Lambda)
                left_lambda_sum = np.sum(lambdas[left_indices])
                right_lambda_sum = np.sum(lambdas[right_indices])

                gain = abs(left_lambda_sum) + abs(right_lambda_sum)

                if gain > best_gain:
                    best_gain = gain
                    best_feature = feature_idx
                    best_threshold = threshold

        # No valid split found
        if best_feature == -1:
            return {
                'type': 'leaf',
                'value': np.sum(lambdas[indices]) / n_samples,
                'count': n_samples
            }

        # Split data
        left_mask = X[indices, best_feature] <= best_threshold
        right_mask = ~left_mask

        return {
            'type': 'split',
            'feature': best_feature,
            'threshold': best_threshold,
            'left': self._build_decision_tree(X, y, lambdas, depth + 1, indices[left_mask]),
            'right': self._build_decision_tree(X, y, lambdas, depth + 1, indices[right_mask])
        }

    def fit(self, X: np.ndarray, y: np.ndarray, groups: List[int]) -> 'LambdaMART':
        """
        Fit the LambdaMART model.

        Args:
            X: Feature matrix (n_samples, n_features)
            y: Relevance labels (n_samples,)
            groups: Group sizes for queries (list of ints)
        """
        self.n_features = X.shape[1]
        self.trees = []
        self.base_scores = []

        # Normalize features
        X = self._normalize_features(X)

        # Initialize predictions
        predictions = np.zeros(len(y))

        for tree_idx in range(self.n_estimators):
            tree_lambdas = np.zeros(len(y))
            group_start = 0

            # Calculate Lambda for each query group
            for group_size in groups:
                group_end = group_start + group_size
                group_indices = np.arange(group_start, group_end)

                group_relevance = y[group_indices]
                group_predictions = predictions[group_indices]

                lambdas, _ = self._calculate_lambda(group_relevance, group_predictions)
                tree_lambdas[group_indices] = lambdas

                group_start = group_end

            # Build tree with Lambda gradients
            tree = self._build_decision_tree(X, y, tree_lambdas)
            self.trees.append(tree)

            # Update predictions
            tree_predictions = self._predict_tree(X, tree)
            predictions += self.learning_rate * tree_predictions

            self.base_scores.append(self.learning_rate)

            # Update feature importances
            self._update_feature_importances(tree)

        return self

    def _normalize_features(self, X: np.ndarray) -> np.ndarray:
        """Normalize features to prevent large values affecting splits."""
        mean = np.mean(X, axis=0)
        std = np.std(X, axis=0)
        std[std == 0] = 1  # Prevent division by zero
        return (X - mean) / std

    def _predict_tree(self, X: np.ndarray, tree: Dict) -> np.ndarray:
        """Predict using a single tree."""
        predictions = np.zeros(len(X))

        for i in range(len(X)):
            predictions[i] = self._predict_sample(X[i], tree)

        return predictions

    def _predict_sample(self, x: np.ndarray, tree: Dict) -> float:
        """Predict for a single sample."""
        if tree['type'] == 'leaf':
            return tree['value']

        if x[tree['feature']] <= tree['threshold']:
            return self._predict_sample(x, tree['left'])
        else:
            return self._predict_sample(x, tree['right'])

    def _update_feature_importances(self, tree: Dict, depth: int = 0):
        """Update feature importance scores."""
        if self.feature_importances_ is None:
            self.feature_importances_ = np.zeros(self.n_features)

        if tree['type'] == 'leaf':
            return

        self.feature_importances_[tree['feature']] += tree.get('count', 1) * (1 / (depth + 1))

        self._update_feature_importances(tree['left'], depth + 1)
        self._update_feature_importances(tree['right'], depth + 1)

    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Predict scores for documents.

        Args:
            X: Feature matrix (n_samples, n_features)

        Returns:
            Predicted scores
        """
        if len(self.trees) == 0:
            raise ValueError("Model not fitted")

        X = self._normalize_features(X)
        predictions = np.zeros(len(X))

        for tree in self.trees:
            predictions += self.learning_rate * self._predict_tree(X, tree)

        return predictions

    def rank(self, X: np.ndarray) -> List[int]:
        """
        Rank documents and return sorted indices.

        Args:
            X: Feature matrix (n_samples, n_features)

        Returns:
            Indices sorted by predicted relevance
        """
        scores = self.predict(X)
        return np.argsort(-scores).tolist()

    def get_feature_importance(self) -> List[Tuple[int, float]]:
        """Get feature importances sorted by importance."""
        if self.feature_importances_ is None:
            return []

        importances = self.feature_importances_ / np.sum(self.feature_importances_)
        indices = np.argsort(importances)[::-1]

        return [(int(i), float(importances[i])) for i in indices]

    def save(self, filepath: str):
        """Save model to disk."""
        model_data = {
            'trees': self.trees,
            'n_estimators': self.n_estimators,
            'max_depth': self.max_depth,
            'learning_rate': self.learning_rate,
            'feature_importances_': self.feature_importances_,
            'n_features': self.n_features,
            'base_scores': self.base_scores
        }

        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)

    @classmethod
    def load(cls, filepath: str) -> 'LambdaMART':
        """Load model from disk."""
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)

        model = cls(
            n_estimators=model_data['n_estimators'],
            max_depth=model_data['max_depth'],
            learning_rate=model_data['learning_rate']
        )

        model.trees = model_data['trees']
        model.feature_importances_ = model_data['feature_importances_']
        model.n_features = model_data['n_features']
        model.base_scores = model_data['base_scores']

        return model


def create_training_data(
    clicks: List[Dict],
    impressions: List[Dict]
) -> Tuple[np.ndarray, np.ndarray, List[int]]:
    """
    Create training data from click and impression logs.

    Args:
        clicks: List of click events with features and relevance
        impressions: List of impression events for context

    Returns:
        X: Feature matrix
        y: Relevance labels
        groups: Group sizes for queries
    """
    X = []
    y = []
    groups = []

    # Process clicks as positive signals
    # Higher click-through rate = higher relevance
    click_counts = {}
    impression_counts = {}

    for impression in impressions:
        query_id = impression.get('query_id', 'default')
        doc_id = impression.get('doc_id')

        if doc_id not in impression_counts:
            impression_counts[doc_id] = 0
        impression_counts[doc_id] += 1

    for click in clicks:
        query_id = click.get('query_id', 'default')
        doc_id = click.get('doc_id')

        if doc_id not in click_counts:
            click_counts[doc_id] = 0
        click_counts[doc_id] += 1

    # Calculate relevance based on CTR
    all_docs = set(list(click_counts.keys()) + list(impression_counts.keys()))

    # Group by query
    query_docs = {}
    for doc_id in all_docs:
        # Extract query from doc_id or use default
        query_id = doc_id.split('_')[0] if '_' in doc_id else 'default'

        if query_id not in query_docs:
            query_docs[query_id] = []

        ctr = click_counts.get(doc_id, 0) / max(1, impression_counts.get(doc_id, 1))

        # Convert CTR to relevance grade (0-4 scale)
        if ctr >= 0.8:
            relevance = 4
        elif ctr >= 0.5:
            relevance = 3
        elif ctr >= 0.2:
            relevance = 2
        elif ctr >= 0.05:
            relevance = 1
        else:
            relevance = 0

        query_docs[query_id].append({
            'doc_id': doc_id,
            'relevance': relevance
        })

    # Create feature matrix and labels
    for query_id, docs in query_docs.items():
        for doc in docs:
            # Extract features from doc_id or use zeros
            features = np.random.rand(10)  # Placeholder - real implementation would extract features
            X.append(features)
            y.append(doc['relevance'])

        groups.append(len(docs))

    return np.array(X), np.array(y), groups


if __name__ == '__main__':
    # Example usage
    np.random.seed(42)

    # Generate synthetic data
    n_queries = 100
    docs_per_query = 10
    n_features = 10

    X = []
    y = []
    groups = []

    for _ in range(n_queries):
        query_X = np.random.rand(docs_per_query, n_features)
        query_y = np.random.randint(0, 5, docs_per_query)

        X.append(query_X)
        y.append(query_y)
        groups.append(docs_per_query)

    X = np.vstack(X)
    y = np.concatenate(y)

    # Train model
    model = LambdaMART(n_estimators=50, max_depth=4, learning_rate=0.1)
    model.fit(X, y, groups)

    # Predict
    predictions = model.predict(X[:docs_per_query])
    ranking = model.rank(X[:docs_per_query])

    print("Feature importances:", model.get_feature_importance()[:5])
    print("Ranking for first query:", ranking)
