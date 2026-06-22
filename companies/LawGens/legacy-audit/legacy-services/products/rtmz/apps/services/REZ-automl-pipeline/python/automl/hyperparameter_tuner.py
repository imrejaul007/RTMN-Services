"""
Hyperparameter Tuner - RandomizedSearchCV Wrapper for AutoML Pipeline

Performs hyperparameter optimization using RandomizedSearchCV
with support for various distributions and parallel execution.
"""

import argparse
import json
import sys
import time
from typing import Any, Dict, List, Optional, Union
import numpy as np
from scipy.stats import randint, uniform, loguniform, expon

# Output progress indicator
def print_progress(stage: str, message: str, progress: float = 0):
    """Print progress in a parseable format."""
    print(f"STAGE:{stage}:{message}", flush=True)
    print(f"PROGRESS:{progress}:{message}", flush=True)


class HyperparameterTuner:
    """
    Hyperparameter tuning using RandomizedSearchCV.
    Supports various parameter distributions and parallel execution.
    """

    # Default parameter distributions for classifiers
    DEFAULT_CLASSIFIER_PARAMS = {
        'LogisticRegression': {
            'C': uniform(0.001, 10),
            'penalty': ['l1', 'l2'],
            'solver': ['liblinear', 'saga'],
            'max_iter': [500, 1000, 2000]
        },
        'RandomForestClassifier': {
            'n_estimators': randint(50, 500),
            'max_depth': [None, 5, 10, 15, 20, 30],
            'min_samples_split': randint(2, 20),
            'min_samples_leaf': randint(1, 10),
            'max_features': ['sqrt', 'log2', None],
            'bootstrap': [True, False]
        },
        'GradientBoostingClassifier': {
            'n_estimators': randint(50, 500),
            'learning_rate': uniform(0.01, 0.3),
            'max_depth': randint(3, 15),
            'min_samples_split': randint(2, 20),
            'min_samples_leaf': randint(1, 10),
            'subsample': uniform(0.6, 0.4),
            'max_features': ['sqrt', 'log2', None]
        },
        'SVM': {
            'C': uniform(0.1, 100),
            'kernel': ['rbf', 'poly', 'sigmoid'],
            'gamma': ['scale', 'auto', uniform(0.001, 1)],
            'degree': [2, 3, 4]  # For poly kernel
        },
        'KNeighborsClassifier': {
            'n_neighbors': randint(3, 50),
            'weights': ['uniform', 'distance'],
            'metric': ['euclidean', 'manhattan', 'minkowski'],
            'p': [1, 2, 3]  # Power parameter for minkowski
        },
        'DecisionTreeClassifier': {
            'max_depth': [None, 5, 10, 15, 20, 30],
            'min_samples_split': randint(2, 20),
            'min_samples_leaf': randint(1, 10),
            'max_features': ['sqrt', 'log2', None],
            'criterion': ['gini', 'entropy']
        },
        'GaussianNB': {
            'var_smoothing': uniform(1e-12, 1e-6)
        },
        'MLPClassifier': {
            'hidden_layer_sizes': [(50,), (100,), (50, 50), (100, 50), (100, 100)],
            'activation': ['relu', 'tanh'],
            'alpha': uniform(0.0001, 0.01),
            'learning_rate': ['constant', 'adaptive'],
            'max_iter': [500, 1000]
        }
    }

    # Default parameter distributions for regressors
    DEFAULT_REGRESSOR_PARAMS = {
        'LinearRegression': {},
        'Ridge': {
            'alpha': uniform(0.01, 100),
            'solver': ['auto', 'svd', 'cholesky', 'lsqr']
        },
        'Lasso': {
            'alpha': uniform(0.001, 10),
            'selection': ['cyclic', 'random']
        },
        'RandomForestRegressor': {
            'n_estimators': randint(50, 500),
            'max_depth': [None, 5, 10, 15, 20, 30],
            'min_samples_split': randint(2, 20),
            'min_samples_leaf': randint(1, 10),
            'max_features': ['sqrt', 'log2', None],
            'bootstrap': [True, False]
        },
        'GradientBoostingRegressor': {
            'n_estimators': randint(50, 500),
            'learning_rate': uniform(0.01, 0.3),
            'max_depth': randint(3, 15),
            'min_samples_split': randint(2, 20),
            'min_samples_leaf': randint(1, 10),
            'subsample': uniform(0.6, 0.4),
            'max_features': ['sqrt', 'log2', None]
        },
        'SVR': {
            'C': uniform(0.1, 100),
            'kernel': ['rbf', 'poly', 'sigmoid'],
            'gamma': ['scale', 'auto', uniform(0.001, 1)],
            'epsilon': uniform(0.01, 0.5)
        },
        'KNeighborsRegressor': {
            'n_neighbors': randint(3, 50),
            'weights': ['uniform', 'distance'],
            'metric': ['euclidean', 'manhattan', 'minkowski'],
            'p': [1, 2, 3]
        },
        'DecisionTreeRegressor': {
            'max_depth': [None, 5, 10, 15, 20, 30],
            'min_samples_split': randint(2, 20),
            'min_samples_leaf': randint(1, 10),
            'max_features': ['sqrt', 'log2', None],
            'criterion': ['squared_error', 'absolute_error', 'friedman_mse']
        }
    }

    def __init__(
        self,
        model_type: str,
        task_type: str = 'classification',
        n_iter: int = 30,
        cv_folds: int = 5,
        scoring: Optional[str] = None,
        random_seed: int = 42,
        n_jobs: int = -1
    ):
        """
        Initialize the hyperparameter tuner.

        Args:
            model_type: Type of model to tune
            task_type: 'classification' or 'regression'
            n_iter: Number of parameter combinations to try
            cv_folds: Number of cross-validation folds
            scoring: Scoring metric to use
            random_seed: Random seed for reproducibility
            n_jobs: Number of parallel jobs (-1 for all cores)
        """
        self.model_type = model_type
        self.task_type = task_type
        self.n_iter = n_iter
        self.cv_folds = cv_folds
        self.random_seed = random_seed
        self.n_jobs = n_jobs
        self.best_params: Dict[str, Any] = {}
        self.best_score: float = 0.0
        self.cv_results: Dict[str, Any] = {}
        self.best_model = None

        # Set default scoring based on task type
        if scoring:
            self.scoring = scoring
        else:
            self.scoring = 'accuracy' if task_type == 'classification' else 'r2'

        # Load default parameters
        if task_type == 'classification':
            self.default_params = self.DEFAULT_CLASSIFIER_PARAMS
        else:
            self.default_params = self.DEFAULT_REGRESSOR_PARAMS

    def _get_model(self, params: Optional[Dict[str, Any]] = None):
        """Get model instance with given parameters."""
        import importlib

        # Map model type to module and class
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
            'Lasso': ('sklearn.linear_model', 'Lasso')
        }

        if self.model_type not in model_map:
            raise ValueError(f"Unknown model type: {self.model_type}")

        module_name, class_name = model_map[self.model_type]
        module = importlib.import_module(module_name)
        model_class = getattr(module, class_name)

        # Merge default params with provided params
        default_params = self.default_params.get(self.model_type, {})
        if params:
            model_params = {**default_params, **params}
        else:
            model_params = default_params

        return model_class(**model_params)

    def _get_cross_validator(self, y: np.ndarray):
        """Get cross-validator based on task type."""
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

    def tune(
        self,
        X: np.ndarray,
        y: np.ndarray,
        param_distributions: Optional[Dict[str, Any]] = None,
        custom_params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Perform hyperparameter tuning.

        Args:
            X: Feature matrix
            y: Target vector
            param_distributions: Parameter distributions for RandomizedSearchCV
            custom_params: Custom fixed parameters for the model

        Returns:
            Dictionary with tuning results
        """
        from sklearn.model_selection import RandomizedSearchCV

        print_progress('tuning', f'Starting hyperparameter tuning for {self.model_type}')

        start_time = time.time()

        # Use provided distributions or defaults
        if param_distributions:
            distributions = param_distributions
        elif custom_params:
            distributions = {**self.default_params.get(self.model_type, {}), **custom_params}
        else:
            distributions = self.default_params.get(self.model_type, {})

        if not distributions:
            print_progress('warning', 'No parameter distributions provided, using defaults', 0.5)
            distributions = {}

        print_progress('tuning', f'Tuning with {self.n_iter} iterations, {self.cv_folds}-fold CV')

        # Create base model
        base_model = self._get_model(custom_params)

        # Create cross-validator
        cv = self._get_cross_validator(y)

        # Create RandomizedSearchCV
        search = RandomizedSearchCV(
            estimator=base_model,
            param_distributions=distributions,
            n_iter=self.n_iter,
            scoring=self.scoring,
            cv=cv,
            random_state=self.random_seed,
            n_jobs=self.n_jobs,
            verbose=1,
            return_train_score=True
        )

        print_progress('tuning', 'Fitting models...', 0.2)

        # Run search
        search.fit(X, y)

        print_progress('tuning', 'Extracting results...', 0.9)

        # Store results
        self.best_params = search.best_params_
        self.best_score = search.best_score_
        self.best_model = search.best_estimator_
        self.cv_results = search.cv_results_

        training_time = time.time() - start_time

        # Build results
        results = {
            'best_params': self.best_params,
            'best_score': float(self.best_score),
            'model_type': self.model_type,
            'scoring_metric': self.scoring,
            'n_iter': self.n_iter,
            'cv_folds': self.cv_folds,
            'training_time': training_time,
            'cv_results_summary': {
                'mean_test_score': float(np.mean(search.cv_results_['mean_test_score'])),
                'std_test_score': float(np.std(search.cv_results_['mean_test_score'])),
                'mean_fit_time': float(np.mean(search.cv_results_['mean_fit_time'])),
                'std_fit_time': float(np.std(search.cv_results_['std_fit_time'])),
                'rank_best': int(search.cv_results_['rank_test_score'][0])
            },
            'top_configurations': self._get_top_configurations(5),
            'success': True
        }

        print_progress('complete', f'Tuning complete. Best score: {self.best_score:.4f}', 1.0)

        return results

    def _get_top_configurations(self, n: int = 5) -> List[Dict[str, Any]]:
        """Get top n configurations from CV results."""
        if not self.cv_results:
            return []

        indices = np.argsort(self.cv_results['mean_test_score'])[::-1][:n]

        configurations = []
        for idx in indices:
            config = {
                'rank': len(configurations) + 1,
                'params': {k: v[idx] for k, v in self.cv_results['params'][idx].items()},
                'mean_test_score': float(self.cv_results['mean_test_score'][idx]),
                'std_test_score': float(self.cv_results['std_test_score'][idx]),
                'mean_fit_time': float(self.cv_results['mean_fit_time'][idx])
            }
            configurations.append(config)

        return configurations

    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance if available."""
        if self.best_model is None:
            return {}

        # Check for feature_importances_ attribute
        if hasattr(self.best_model, 'feature_importances_'):
            importances = self.best_model.feature_importances_
            return {f'feature_{i}': float(v) for i, v in enumerate(importances)}

        # Check for coef_ attribute (linear models)
        if hasattr(self.best_model, 'coef_'):
            coefs = self.best_model.coef_
            if len(coefs.shape) == 1:
                return {f'feature_{i}': float(v) for i, v in enumerate(coefs)}
            else:
                # Average across classes for multi-class
                return {f'feature_{i}': float(np.mean(v)) for i, v in enumerate(coefs.T)}

        return {}


def main():
    """Main entry point for command-line usage."""
    parser = argparse.ArgumentParser(description='AutoML Hyperparameter Tuner')

    # Data parameters
    parser.add_argument('--features', type=str, help='JSON encoded features array')
    parser.add_argument('--labels', type=str, help='JSON encoded labels array')

    # Model parameters
    parser.add_argument('--model-type', type=str, required=True,
                        help='Model type to tune')
    parser.add_argument('--task-type', type=str, default='classification',
                        choices=['classification', 'regression'],
                        help='Task type')
    parser.add_argument('--hyperparameters', type=str, default=None,
                        help='JSON encoded custom hyperparameters')

    # Tuning parameters
    parser.add_argument('--n-iter', type=int, default=30,
                        help='Number of parameter combinations to try')
    parser.add_argument('--cv-folds', type=int, default=5,
                        help='Number of cross-validation folds')
    parser.add_argument('--scoring', type=str, default=None,
                        help='Scoring metric')
    parser.add_argument('--random-seed', type=int, default=42,
                        help='Random seed')

    # Output parameters
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

        # Parse hyperparameters
        custom_params = None
        if args.hyperparameters:
            custom_params = json.loads(args.hyperparameters)

        # Create tuner
        tuner = HyperparameterTuner(
            model_type=args.model_type,
            task_type=args.task_type,
            n_iter=args.n_iter,
            cv_folds=args.cv_folds,
            scoring=args.scoring,
            random_seed=args.random_seed
        )

        # Run tuning
        result = tuner.tune(X, y, custom_params=custom_params)

        # Get feature importance
        importance = tuner.get_feature_importance()
        result['feature_importance'] = importance

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
