import json
from sklearn.model_selection import train_test_split

from app.config import METRICS_FILE, MODEL_DIR, MODEL_FILE, TRAINING_DATA
from app.model import evaluate_model, save_model, train_model
from app.utils import augment_dataset, load_dataset


def main():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    base_df = load_dataset(TRAINING_DATA)
    df = augment_dataset(base_df, copies=18)
    train_df, test_df = train_test_split(
        df,
        test_size=0.2,
        random_state=42,
        stratify=df["performance_category"],
    )
    pipeline = train_model(train_df)
    save_model(pipeline, MODEL_FILE)
    metrics = evaluate_model(pipeline, test_df)
    METRICS_FILE.write_text(json.dumps(metrics, indent=2))
    print(f"Model saved to {MODEL_FILE}")
    print(f"Metrics saved to {METRICS_FILE}")


if __name__ == "__main__":
    main()
