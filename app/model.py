import pickle
import pandas as pd
from sklearn.metrics import confusion_matrix
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.metrics import accuracy_score, classification_report, f1_score, precision_score, recall_score
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier

NUMERIC_FEATURES = [
    "attendance_percentage",
    "assignment_score",
    "quiz_score",
    "test_score",
    "ca_score",
    "previous_gpa",
    "missed_classes",
    "lms_engagement",
    "study_hours",
    "level",
]

CATEGORICAL_FEATURES = ["department"]


def build_pipeline():
    numeric_transformer = Pipeline(steps=[("scaler", StandardScaler())])
    categorical_transformer = Pipeline(
        steps=[("onehot", OneHotEncoder(handle_unknown="ignore"))]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, NUMERIC_FEATURES),
            ("cat", categorical_transformer, CATEGORICAL_FEATURES),
        ]
    )

    ensemble = VotingClassifier(
        estimators=[
            ("dt", DecisionTreeClassifier(random_state=42)),
            ("rf", RandomForestClassifier(n_estimators=200, random_state=42)),
            (
                "mlp",
                MLPClassifier(
                    hidden_layer_sizes=(32, 16),
                    activation="relu",
                    max_iter=1000,
                    random_state=42,
                ),
            ),
        ],
        voting="soft",
    )

    return Pipeline(steps=[("preprocessor", preprocessor), ("model", ensemble)])


def train_model(df: pd.DataFrame):
    features = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    target = df["performance_category"]
    pipeline = build_pipeline()
    pipeline.fit(features, target)
    return pipeline


def evaluate_model(pipeline: Pipeline, df: pd.DataFrame):
    features = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    target = df["performance_category"]
    predictions = pipeline.predict(features)
    return {
        "accuracy": float(accuracy_score(target, predictions)),
        "precision": float(precision_score(target, predictions, average="weighted", zero_division=0)),
        "recall": float(recall_score(target, predictions, average="weighted", zero_division=0)),
        "f1_score": float(f1_score(target, predictions, average="weighted", zero_division=0)),
        "confusion_matrix": confusion_matrix(target, predictions).tolist(),
        "classification_report": classification_report(target, predictions, output_dict=True, zero_division=0),
    }


def predict_single(pipeline: Pipeline, payload: dict):
    frame = pd.DataFrame([payload])
    probs = pipeline.predict_proba(frame)[0]
    best_index = int(probs.argmax())
    predicted_category = pipeline.named_steps["model"].classes_[best_index]
    return str(predicted_category), float(probs[best_index])


def save_model(pipeline: Pipeline, path):
    with open(path, "wb") as file:
        pickle.dump(pipeline, file)


def load_model(path):
    with open(path, "rb") as file:
        return pickle.load(file)
