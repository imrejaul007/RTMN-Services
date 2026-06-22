"""
Model Selector - Auto Model Selection for AutoML Pipeline

Automatically selects the best model type for given data using
various sklearn classifiers and regressors.
"""

import argparse
import json
import sys
import time
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

# Output progress indicator
def print_progress(stage: str, message: str, progress: float = 0):
    """Print progress in a parseable format."""
    print(f"STAGE:{stage}:{message}", flush=True)
    print(f"PROGRESS:{progress}:{message}", flush=True)


def print_stdout(data: Any):
    """Print data as stdout for capture."""
    print(json.dumps(data), flush=True)


class ModelSelector:
    """
    Automatic model selection for classification and regression tasks.
    Tests multiple algorithms and returns the best performing one.
    """

    # Available classifiers
    CLASSIFIERS = {
        'LogisticRegression': {
            'module': 'sklearn.linear_model',
            'class': 'LogisticRegression',
            'params': {
                'max_iter': 1000,
                'random_state': 42
            }
        },
        'RandomForestClassifier': {
            'module': 'sklearn.ensemble',
            'class': 'RandomForestClassifier',
            'params': {
                'n_estimators': 100,
                'random_state': 42,
                'n_jobs': -1
            }
        },
        'GradientBoostingClassifier': {
            'module': 'sklearn.ensemble',
            'class': 'GradientBoostingClassifier',
            'params': {
                'n_estimators': 100,
                'random_state': 42
            }
        },
        'SVM': {
            'module': 'sklearn.svm',
            'class': 'SVC',
            'params': {
                'random_state': 42,
                'probability': True
            }
        },
        'KNeighborsClassifier': {
            'module': 'sklearn.neighbors',
            'class': 'KNeighborsClassifier',
            'params': {
                'n_neighbors': 5,
                'n_jobs': -1
            }
        },
        'DecisionTreeClassifier': {
            'module': 'sklearn.tree',
            'class': 'DecisionTreeClassifier',
            'params': {
                'random_state': 42
            }
        },
        'GaussianNB': {
            'module': 'sklearn.naive_bayes',
            'class': 'GaussianNB',
            'params': {}
        },
        'MLPClassifier': {
            'module': 'sklearn.neural_network',
            'class': 'MLPClassifier',
            'params': {
                'max_iter': 500,
                'random_state': 42
            }
        }
    }

    # Available regressors
    REGRESSORS = {
        'LinearRegression': {
            'module': 'sklearn.linear_model',
            'class': 'LinearRegression',
            'params': {}
        },
        'Ridge': {
            'module': 'sklearn.linear_model',
            'class': 'Ridge',
            'params': {
                'random_state': 42
            }
        },
        'Lasso': {
            'module': 'sklearn.linear_model',
            'class': 'Lasso',
            'params': {
                'random_state': 42
            }
        },
        'RandomForestRegressor': {
            'module': 'sklearn.ensemble',
            'class': 'RandomForestRegressor',
            'params': {
                'n_estimators': 100,
                'random_state': 42,
                'n_jobs': -1
            }
        },
        'GradientBoostingRegressor': {
            'module': 'sklearn.ensemble',
            'class': 'GradientBoostingRegressor',
            'params': {
                'n_estimators': 100,
                'random_state': 42
            }
        },
        'SVR': {
            'module': 'sklearn.svm',
            'class': 'SVR',
            'params': {}
        },
        'KNeighborsRegressor': {
            'module': 'sklearn.neighbors',
            'class': 'KNeighborsRegressor',
            'params': {
                'n_jobs': -1
            }
        },
        'DecisionTreeRegressor': {
            'module': 'sklearn.tree',
            'class': 'DecisionTreeRegressor',
            'params': {
                'random_state': 42
            }
        }
    }

    def __init__(
        self,
        task_type: str = 'classification',
        cv_folds: int = 5,
        scoring: Optional[str] = None,
        random_seed: int = 42
    ):
        """
        Initialize the model selector.

        Args:
            task_type: 'classification' or 'regression'
            cv_folds: Number of cross-validation folds
            scoring: Scoring metric to use
            random_seed: Random seed for reproducibility
        """
        self.task_type = task_type
        self.cv_folds = cv_folds
        self.random_seed = random_seed
        self.results: Dict[str, Dict[str, Any]] = {}
        self.best_model_name: Optional[str] = None
        self.best_score: float = -float('inf')
        self.best_model = None

        # Set default scoring based on task type
        if scoring:
            self.scoring = scoring
        else:
            self.scoring = 'accuracy' if task_type == 'classification' else 'r2'

        # Select model candidates based on task type
        if task_type == 'classification':
            self.model_configs = self.CLASSIFIERS
        elif task_type == 'regression':
            self.model_configs = self.REGRESSORS
        else:
            raise ValueError(f"Unknown task type: {task_type}")

    def _import_model(self, config: Dict[str, Any]):
        """Dynamically import a model class."""
        import importlib
        module = importlib.import_module(config['module'])
        return getattr(module, config['class'])

    def _get_model(self, model_name: str):
        """Get a fresh instance of a model."""
        config = self.model_configs[model_name]
        model_class = self._import_model(config)
        return model_class(**config['params'])

    def _score_to_higher_is_better(self, metric: str) -> bool:
        """Determine if higher scores are better for a metric."""
        higher_is_better = [
            'accuracy', 'precision', 'recall', 'f1', 'roc_auc',
            'r2', 'neg_mean_squared_error', 'neg_mean_absolute_error'
        ]
        return metric in higher_is_better

    def _get_cross_validator(self, X: np.ndarray):
        """Get cross-validator based on data size."""
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

    def evaluate_model(
        self,
        X: np.ndarray,
        y: np.ndarray,
        model_name: str,
        sample_weight: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """
        Evaluate a single model using cross-validation.

        Args:
            X: Feature matrix
            y: Target vector
            model_name: Name of the model to evaluate
            sample_weight: Optional sample weights

        Returns:
            Dictionary with evaluation results
        """
        from sklearn.model_selection import cross_val_score

        print_progress('evaluation', f'Evaluating {model_name}')

        try:
            model = self._get_model(model_name)
            cv = self._get_cross_validator(X)

            start_time = time.time()

            scores = cross_val_score(
                model, X, y,
                cv=cv,
                scoring=self.scoring,
                n_jobs=-1 if 'n_jobs' in self.model_configs[model_name]['params'] else 1,
                error_score='raise'
            )

            training_time = time.time() - start_time

            result = {
                'model_name': model_name,
                'cv_scores': scores.tolist(),
                'cv_mean': float(np.mean(scores)),
                'cv_std': float(np.std(scores)),
                'training_time': training_time,
                'success': True,
                'error': None
            }

            print_progress(
                'evaluation',
                f'{model_name}: {np.mean(scores):.4f} (+/- {np.std(scores):.4f})',
                0.8
            )

            return result

        except Exception as e:
            return {
                'model_name': model_name,
                'cv_scores': [],
                'cv_mean': 0.0,
                'cv_std': 0.0,
                'training_time': 0.0,
                'success': False,
                'error': str(e)
            }

    def select_best(
        self,
        X: np.ndarray,
        y: np.ndarray,
        model_names: Optional[List[str]] = None,
        top_k: int = 3
    ) -> Dict[str, Any]:
        """
        Select the best model from candidates.

        Args:
            X: Feature matrix
            y: Target vector
            model_names: List of model names to evaluate (None for all)
            top_k: Number of top models to return

        Returns:
            Dictionary with selection results
        """
        print_progress('selection', 'Starting model selection')

        # Select models to evaluate
        if model_names:
            models_to_eval = {k: v for k, v in self.model_configs.items() if k in model_names}
        else:
            models_to_eval = self.model_configs

        print_progress('selection', f'Evaluating {len(models_to_eval)} models')

        results = []
        total_models = len(models_to_eval)

        for idx, (model_name, _) in enumerate(models_to_eval.items()):
            progress = (idx + 1) / total_models
            print_progress('selection', f'Progress: {idx + 1}/{total_models}', progress * 0.5)

            result = self.evaluate_model(X, y, model_name)
            results.append(result)
            self.results[model_name] = result

            if result['success'] and result['cv_mean'] > self.best_score:
                self.best_score = result['cv_mean']
                self.best_model_name = model_name

        print_progress('selection', 'Selecting best model', 0.9)

        # Sort results by mean score
        successful_results = [r for r in results if r['success']]
        successful_results.sort(key=lambda x: x['cv_mean'], reverse=True)

        # Get top k models
        top_models = successful_results[:top_k]

        # Get best model
        if self.best_model_name:
            self.best_model = self._get_model(self.best_model_name)

        final_result = {
            'best_model': self.best_model_name,
            'best_score': self.best_score,
            'best_cv_std': self.results.get(self.best_model_name, {}).get('cv_std', 0),
            'all_results': {
                name: {
                    'cv_mean': r['cv_mean'],
                    'cv_std': r['cv_std'],
                    'training_time': r['training_time'],
                    'success': r['success'],
                    'error': r['error']
                }
                for name, r in self.results.items()
            },
            'top_models': top_models,
            'task_type': self.task_type,
            'scoring_metric': self.scoring,
            'total_evaluated': len(successful_results),
            'total_failed': len(results) - len(successful_results)
        }

        print_progress('complete', 'Model selection complete', 1.0)

        return final_result

    def get_feature_importance(
        self,
        X: np.ndarray,
        y: np.ndarray,
        feature_names: Optional[List[str]] = None
    ) -> Dict[str, float]:
        """
        Get feature importance from tree-based models.

        Args:
            X: Feature matrix
            y: Target vector
            feature_names: List of feature names

        Returns:
            Dictionary mapping feature names to importance scores
        """
        if not self.best_model:
            return {}

        # Check if model has feature_importances_
        if not hasattr(self.best_model, 'feature_importances_'):
            return {}

        # Fit the model if not already fitted
        if not hasattr(self.best_model, 'n_features_in_'):
            self.best_model.fit(X, y)

        importances = self.best_model.feature_importances_

        if feature_names is None:
            feature_names = [f'feature_{i}' for i in range(len(importances))]

        return dict(zip(feature_names, importances.tolist()))


def main():
    """Main entry point for command-line usage."""
    parser = argparse.ArgumentParser(description='AutoML Model Selector')

    # Data parameters
    parser.add_argument('--features', type=str, help='JSON encoded features array')
    parser.add_argument('--labels', type=str, help='JSON encoded labels array')
    parser.add_argument('--feature-names', type=str, help='JSON encoded feature names')

    # Model selection parameters
    parser.add_argument('--task-type', type=str, default='classification',
                        choices=['classification', 'regression'],
                        help='Task type')
    parser.add_argument('--cv-folds', type=int, default=5,
                        help='Number of cross-validation folds')
    parser.add_argument('--scoring', type=str, default=None,
                        help='Scoring metric')
    parser.add_argument('--random-seed', type=int, default=42,
                        help='Random seed')
    parser.add_argument('--model-types', type=str, default=None,
                        help='Comma-separated list of model types to evaluate')

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

        # Parse feature names
        feature_names = None
        if args.feature_names:
            feature_names = json.loads(args.feature_names)

        # Parse model types
        model_types = None
        if args.model_types:
            model_types = [m.strip() for m in args.model_types.split(',')]

        # Create selector
        selector = ModelSelector(
            task_type=args.task_type,
            cv_folds=args.cv_folds,
            scoring=args.scoring,
            random_seed=args.random_seed
        )

        # Run selection
        result = selector.select_best(X, y, model_types)

        # Get feature importance if applicable
        importance = selector.get_feature_importance(X, y, feature_names)
        result['feature_importance'] = importance

        # Output results
        if args.output_json:
            print(json.dumps(result, indent=2))
        else:
            print(json.dumps(result))

    except Exception as e:
        print(json.dumps({
            'error': str(e),
            'success': False,
            'traceback': str(sys.exc_info())
        }), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
