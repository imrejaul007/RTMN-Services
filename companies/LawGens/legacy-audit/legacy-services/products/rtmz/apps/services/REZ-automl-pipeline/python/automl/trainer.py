"""
Trainer - Model Training for AutoML Pipeline

Complete model training pipeline with evaluation, feature importance,
and model persistence using scikit-learn.
"""

import argparse
import json
import os
import pickle
import sys
import time
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np

# Output progress indicator
def print_progress(stage: str, message: str, progress: float = 0):
    """Print progress in a parseable format."""
    print(f"STAGE:{stage}:{message}", flush=True)
    print(f"PROGRESS:{progress}:{message}", flush=True)


class ModelTrainer:
    """
    Complete model training pipeline.
    Handles data preparation, model training, evaluation, and persistence.
    """

    def __init__(
        self,
        model_type: str = 'RandomForestClassifier',
        task_type: str = 'classification',
        test_size: float = 0.2,
        cv_folds: int = 5,
        random_seed: int = 42
    ):
        """
        Initialize the model trainer.

        Args:
            model_type: Type of model to train
            task_type: 'classification' or 'regression'
            test_size: Proportion of data for testing
            cv_folds: Number of cross-validation folds
            random_seed: Random seed for reproducibility
        """
        self.model_type = model_type
        self.task_type = task_type
        self.test_size = test_size
        self.cv_folds = cv_folds
        self.random_seed = random_seed
        self.model = None
        self.X_train = None
        self.X_test = None
        self.y_train = None
        self.y_test = None
        self.feature_names: Optional[List[str]] = None
        self.class_names: Optional[List[str]] = None

    def _get_model(self, hyperparameters: Optional[Dict[str, Any]] = None):
        """Get model instance with given hyperparameters."""
        import importlib

        # Model configuration map
        model_map = {
            'LogisticRegression': ('sklearn.linear_model', 'LogisticRegression'),
            'RandomForestClassifier': ('sklearn.ensemble', 'RandomForestClassifier'),
            'RandomForestRegressor': ('sklearn.ensemble', 'RandomForestRegressor'),
            'GradientBoostingClassifier': ('sklearn.ensemble', 'GradientBoostingClassifier'),
            'GradientBoostingRegressor': ('sklearn.ensemble', 'GradientBoostingRegressor'),
            'SVM': ('sklearn.svm', 'SVC'),
            'SVR': ('sklearn.svm', 'SVR'),
            'KNeighborsClassifier': ('sklearn.neighbors', 'KNeighborsClassifier'),
            'KNeighborsRegressor': ('sklearn.neighbors', 'KNeighborsRegressor'),
            'DecisionTreeClassifier': ('sklearn.tree', 'DecisionTreeClassifier'),
            'DecisionTreeRegressor': ('sklearn.tree', 'DecisionTreeRegressor'),
            'GaussianNB': ('sklearn.naive_bayes', 'GaussianNB'),
            'MLPClassifier': ('sklearn.neural_network', 'MLPClassifier'),
            'LinearRegression': ('sklearn.linear_model', 'LinearRegression'),
            'Ridge': ('sklearn.linear_model', 'Ridge'),
            'Lasso': ('sklearn.linear_model', 'Lasso'),
            'AdaBoostClassifier': ('sklearn.ensemble', 'AdaBoostClassifier'),
            'ExtraTreesClassifier': ('sklearn.ensemble', 'ExtraTreesClassifier'),
            'ExtraTreesRegressor': ('sklearn.ensemble', 'ExtraTreesRegressor'),
            'HistGradientBoostingClassifier': ('sklearn.ensemble', 'HistGradientBoostingClassifier'),
            'HistGradientBoostingRegressor': ('sklearn.ensemble', 'HistGradientBoostingRegressor')
        }

        if self.model_type not in model_map:
            raise ValueError(f"Unknown model type: {self.model_type}")

        module_name, class_name = model_map[self.model_type]
        module = importlib.import_module(module_name)
        model_class = getattr(module, class_name)

        # Default parameters for common models
        default_params = self._get_default_params()

        # Merge hyperparameters
        if hyperparameters:
            params = {**default_params, **hyperparameters}
        else:
            params = default_params

        return model_class(**params)

    def _get_default_params(self) -> Dict[str, Any]:
        """Get default parameters for the model type."""
        defaults = {
            'LogisticRegression': {'max_iter': 1000, 'random_state': self.random_seed},
            'RandomForestClassifier': {'n_estimators': 100, 'random_state': self.random_seed, 'n_jobs': -1},
            'RandomForestRegressor': {'n_estimators': 100, 'random_state': self.random_seed, 'n_jobs': -1},
            'GradientBoostingClassifier': {'n_estimators': 100, 'random_state': self.random_seed},
            'GradientBoostingRegressor': {'n_estimators': 100, 'random_state': self.random_seed},
            'SVM': {'random_state': self.random_seed, 'probability': True},
            'SVR': {},
            'KNeighborsClassifier': {'n_jobs': -1},
            'KNeighborsRegressor': {'n_jobs': -1},
            'DecisionTreeClassifier': {'random_state': self.random_seed},
            'DecisionTreeRegressor': {'random_state': self.random_seed},
            'GaussianNB': {},
            'MLPClassifier': {'max_iter': 500, 'random_state': self.random_seed},
            'LinearRegression': {},
            'Ridge': {'random_state': self.random_seed},
            'Lasso': {'random_state': self.random_seed},
            'AdaBoostClassifier': {'random_state': self.random_seed},
            'ExtraTreesClassifier': {'n_estimators': 100, 'random_state': self.random_seed, 'n_jobs': -1},
            'ExtraTreesRegressor': {'n_estimators': 100, 'random_state': self.random_seed, 'n_jobs': -1},
            'HistGradientBoostingClassifier': {'random_state': self.random_seed},
            'HistGradientBoostingRegressor': {'random_state': self.random_seed}
        }
        return defaults.get(self.model_type, {})

    def _prepare_data(
        self,
        X: np.ndarray,
        y: np.ndarray,
        feature_names: Optional[List[str]] = None,
        class_names: Optional[List[str]] = None
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Split data into train and test sets."""
        from sklearn.model_selection import train_test_split

        self.feature_names = feature_names or [f'feature_{i}' for i in range(X.shape[1])]
        self.class_names = class_names

        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=self.test_size,
            random_state=self.random_seed,
            stratify=y if self.task_type == 'classification' else None
        )

        return X_train, X_test, y_train, y_test

    def _get_cross_validator(self):
        """Get cross-validator."""
        from sklearn.model_selection import StratifiedKFold, KFold

        if self.task_type == 'classification':
            return StratifiedKFold(
                n_splits=self.cv_folds,
                shuffle=True,
                random_state=self.random_seed
            )
        else:
            return KFold(
                n_splits=self.cv_folds,
                shuffle=True,
                random_state=self.random_seed
            )

    def train(
        self,
        X: np.ndarray,
        y: np.ndarray,
        hyperparameters: Optional[Dict[str, Any]] = None,
        feature_names: Optional[List[str]] = None,
        class_names: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Train a model with the given data.

        Args:
            X: Feature matrix
            y: Target vector
            hyperparameters: Model hyperparameters
            feature_names: Names of features
            class_names: Names of classes (for classification)

        Returns:
            Dictionary with training results
        """
        from sklearn.model_selection import cross_val_score, cross_val_predict
        from sklearn.preprocessing import LabelEncoder

        print_progress('preparation', 'Preparing data', 0.1)

        # Encode labels if necessary
        if self.task_type == 'classification' and y.dtype == object:
            le = LabelEncoder()
            y = le.fit_transform(y)
            self.class_names = le.classes_.tolist()
        elif class_names:
            self.class_names = class_names

        # Prepare data
        self.X_train, self.X_test, self.y_train, self.y_test = self._prepare_data(
            X, y, feature_names, self.class_names
        )

        print_progress('preparation', f'Train size: {len(self.X_train)}, Test size: {len(self.X_test)}', 0.2)

        # Create model
        print_progress('training', f'Creating {self.model_type} model', 0.3)
        self.model = self._get_model(hyperparameters)

        # Train model
        print_progress('training', 'Training model...', 0.4)
        start_time = time.time()

        self.model.fit(self.X_train, self.y_train)

        training_time = time.time() - start_time

        print_progress('training', f'Training completed in {training_time:.2f}s', 0.7)

        # Evaluate
        print_progress('evaluation', 'Evaluating model', 0.8)
        metrics = self._evaluate()

        # Get predictions
        print_progress('finalization', 'Generating final results', 0.9)

        return {
            'model_type': self.model_type,
            'hyperparameters': hyperparameters or {},
            'metrics': metrics,
            'training_time': training_time,
            'feature_names': self.feature_names,
            'class_names': self.class_names,
            'feature_importance': self._get_feature_importance(),
            'success': True
        }

    def _evaluate(self) -> Dict[str, Any]:
        """Evaluate the trained model."""
        from sklearn.metrics import (
            accuracy_score, precision_score, recall_score, f1_score,
            roc_auc_score, confusion_matrix, classification_report,
            mean_squared_error, mean_absolute_error, r2_score
        )

        # Get predictions
        y_pred = self.model.predict(self.X_test)

        metrics: Dict[str, Any] = {'training_time': 0}

        if self.task_type == 'classification':
            # Basic metrics
            metrics['accuracy'] = float(accuracy_score(self.y_test, y_pred))
            metrics['precision'] = float(precision_score(self.y_test, y_pred, average='weighted', zero_division=0))
            metrics['recall'] = float(recall_score(self.y_test, y_pred, average='weighted', zero_division=0))
            metrics['f1_score'] = float(f1_score(self.y_test, y_pred, average='weighted', zero_division=0))

            # Confusion matrix
            metrics['confusion_matrix'] = confusion_matrix(self.y_test, y_pred).tolist()

            # Classification report
            report = classification_report(self.y_test, y_pred, output_dict=True, zero_division=0)
            metrics['classification_report'] = report

            # ROC AUC (if binary classification)
            if len(np.unique(self.y_test)) == 2:
                if hasattr(self.model, 'predict_proba'):
                    y_prob = self.model.predict_proba(self.X_test)[:, 1]
                    try:
                        metrics['roc_auc'] = float(roc_auc_score(self.y_test, y_prob))
                    except ValueError:
                        pass

            # Cross-validation score
            cv = self._get_cross_validator()
            cv_scores = cross_val_score(self.model, self.X_train, self.y_train, cv=cv, scoring='accuracy')
            metrics['cross_validation_score'] = float(np.mean(cv_scores))
            metrics['cross_validation_std'] = float(np.std(cv_scores))

        else:  # Regression
            metrics['rmse'] = float(np.sqrt(mean_squared_error(self.y_test, y_pred)))
            metrics['mae'] = float(mean_absolute_error(self.y_test, y_pred))
            metrics['r2_score'] = float(r2_score(self.y_test, y_pred))
            metrics['mse'] = float(mean_squared_error(self.y_test, y_pred))

            # Cross-validation score
            cv = self._get_cross_validator()
            cv_scores = cross_val_score(self.model, self.X_train, self.y_train, cv=cv, scoring='r2')
            metrics['cross_validation_score'] = float(np.mean(cv_scores))
            metrics['cross_validation_std'] = float(np.std(cv_scores))

        # Test score (same as main metric)
        if self.task_type == 'classification':
            metrics['test_score'] = metrics['accuracy']
        else:
            metrics['test_score'] = metrics['r2_score']

        return metrics

    def _get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance if available."""
        importance: Dict[str, float] = {}

        if self.model is None:
            return importance

        # Check for feature_importances_ attribute
        if hasattr(self.model, 'feature_importances_'):
            importances = self.model.feature_importances_
            for i, (name, imp) in enumerate(zip(self.feature_names or [], importances)):
                importance[name] = float(imp)

        # Check for coef_ attribute (linear models)
        elif hasattr(self.model, 'coef_'):
            coefs = self.model.coef_
            if len(coefs.shape) == 1:
                for i, (name, coef) in enumerate(zip(self.feature_names or [], coefs)):
                    importance[name] = float(abs(coef))
            else:
                # Average across classes for multi-class
                for i, (name, coef) in enumerate(zip(self.feature_names or [], np.mean(np.abs(coefs), axis=0))):
                    importance[name] = float(coef)

        return importance

    def save_model(self, filepath: str) -> bool:
        """Save the trained model to a file."""
        if self.model is None:
            return False

        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(filepath) or '.', exist_ok=True)

            # Create model package with metadata
            model_package = {
                'model': self.model,
                'model_type': self.model_type,
                'task_type': self.task_type,
                'feature_names': self.feature_names,
                'class_names': self.class_names,
                'random_seed': self.random_seed
            }

            with open(filepath, 'wb') as f:
                pickle.dump(model_package, f)

            return True
        except Exception as e:
            print(f"Error saving model: {e}", file=sys.stderr)
            return False

    def load_model(self, filepath: str) -> bool:
        """Load a trained model from a file."""
        try:
            with open(filepath, 'rb') as f:
                model_package = pickle.load(f)

            self.model = model_package['model']
            self.model_type = model_package['model_type']
            self.task_type = model_package['task_type']
            self.feature_names = model_package.get('feature_names')
            self.class_names = model_package.get('class_names')
            self.random_seed = model_package.get('random_seed', self.random_seed)

            return True
        except Exception as e:
            print(f"Error loading model: {e}", file=sys.stderr)
            return False


def main():
    """Main entry point for command-line usage."""
    parser = argparse.ArgumentParser(description='AutoML Model Trainer')

    # Data parameters
    parser.add_argument('--features', type=str, help='JSON encoded features array')
    parser.add_argument('--labels', type=str, help='JSON encoded labels array')
    parser.add_argument('--feature-names', type=str, help='JSON encoded feature names')
    parser.add_argument('--class-names', type=str, help='JSON encoded class names')

    # Model parameters
    parser.add_argument('--model-type', type=str, default='RandomForestClassifier',
                        help='Model type to train')
    parser.add_argument('--algorithm', type=str, default=None,
                        help='Alias for model-type')
    parser.add_argument('--task-type', type=str, default='classification',
                        choices=['classification', 'regression'],
                        help='Task type')
    parser.add_argument('--hyperparameters', type=str, default=None,
                        help='JSON encoded hyperparameters')

    # Training parameters
    parser.add_argument('--test-size', type=float, default=0.2,
                        help='Proportion of data for testing')
    parser.add_argument('--cv-folds', type=int, default=5,
                        help='Number of cross-validation folds')
    parser.add_argument('--random-seed', type=int, default=42,
                        help='Random seed')

    # Output parameters
    parser.add_argument('--model-path', type=str, default=None,
                        help='Path to save the trained model')
    parser.add_argument('--output-json', action='store_true',
                        help='Output results as JSON')

    args = parser.parse_args()

    try:
        # Parse input data
        if args.features and args.labels:
            X = np.array(json.loads(args.features))
            y = np.array(json.loads(args.labels))
        else:
            # Try reading from stdin
            input_data = json.loads(sys.stdin.read() if not sys.stdin.isatty() else '{}')
            X = np.array(input_data.get('features', []))
            y = np.array(input_data.get('labels', []))

        # Handle empty input
        if len(X) == 0 or len(y) == 0:
            print(json.dumps({
                'error': 'No data provided',
                'success': False
            }))
            return

        # Parse feature and class names
        feature_names = None
        if args.feature_names:
            feature_names = json.loads(args.feature_names)

        class_names = None
        if args.class_names:
            class_names = json.loads(args.class_names)

        # Parse hyperparameters
        hyperparameters = None
        if args.hyperparameters:
            hyperparameters = json.loads(args.hyperparameters)

        # Determine model type
        model_type = args.algorithm or args.model_type

        # Create trainer
        trainer = ModelTrainer(
            model_type=model_type,
            task_type=args.task_type,
            test_size=args.test_size,
            cv_folds=args.cv_folds,
            random_seed=args.random_seed
        )

        print_progress('init', f'Training {model_type} for {args.task_type}', 0.05)

        # Train model
        result = trainer.train(
            X, y,
            hyperparameters=hyperparameters,
            feature_names=feature_names,
            class_names=class_names
        )

        # Save model if path provided
        if args.model_path:
            success = trainer.save_model(args.model_path)
            result['model_saved'] = success
            result['model_path'] = args.model_path if success else None

        # Output results
        if args.output_json:
            print(json.dumps(result, indent=2, default=str))
        else:
            print(json.dumps(result, default=str))

    except Exception as e:
        import traceback
        print(json.dumps({
            'error': str(e),
            'success': False,
            'traceback': traceback.format_exc()
        }), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
