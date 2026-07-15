from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "models"
TRAINING_DATA = DATA_DIR / "sample_students.csv"
MODEL_FILE = MODEL_DIR / "student_performance_model.joblib"
METRICS_FILE = MODEL_DIR / "training_metrics.json"
RECORDS_DB = DATA_DIR / "student_records.db"
