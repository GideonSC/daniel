import numpy as np
import pandas as pd


def load_dataset(path):
    return pd.read_csv(path)


def build_student_id(year, faculty, department, number):
    parts = [
        str(year).strip(),
        str(faculty).strip().upper(),
        str(department).strip().upper(),
        str(number).strip(),
    ]
    return "/".join(part for part in parts if part)


def encode_target(value: str) -> int:
    mapping = {"Low": 0, "Average": 1, "High": 2}
    return mapping[value]


def decode_target(value: int) -> str:
    mapping = {0: "Low", 1: "Average", 2: "High"}
    return mapping[value]


def category_distribution(df: pd.DataFrame):
    if isinstance(df, list):
        counts = {}
        for row in df:
            label = row.get("performance_category") or row.get("predicted_category")
            if label:
                counts[str(label)] = counts.get(str(label), 0) + 1
        ordered = ["Low", "Average", "High"]
        return [{"label": item, "value": int(counts.get(item, 0))} for item in ordered]

    counts = df["performance_category"].value_counts().to_dict()
    ordered = ["Low", "Average", "High"]
    return [{"label": item, "value": int(counts.get(item, 0))} for item in ordered]


def numeric_summary(df: pd.DataFrame):
    return {
        "students": int(len(df)),
        "average_attendance": round(float(df["attendance_percentage"].mean()), 1),
        "average_gpa": round(float(df["previous_gpa"].mean()), 2),
        "average_study_hours": round(float(df["study_hours"].mean()), 1),
    }


def augment_dataset(df: pd.DataFrame, copies: int = 20, seed: int = 42):
    rng = np.random.default_rng(seed)
    numeric_cols = [
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

    rows = [df]
    for _ in range(copies):
        noisy = df.copy()
        for column in numeric_cols:
            scale = 2 if column not in {"previous_gpa", "missed_classes", "level", "study_hours"} else 0.5
            noise = rng.normal(0, scale, size=len(noisy))
            noisy[column] = noisy[column].astype(float) + noise

        noisy["attendance_percentage"] = noisy["attendance_percentage"].clip(0, 100)
        noisy["assignment_score"] = noisy["assignment_score"].clip(0, 100)
        noisy["quiz_score"] = noisy["quiz_score"].clip(0, 100)
        noisy["test_score"] = noisy["test_score"].clip(0, 100)
        noisy["ca_score"] = noisy["ca_score"].clip(0, 100)
        noisy["previous_gpa"] = noisy["previous_gpa"].clip(0, 5)
        noisy["missed_classes"] = noisy["missed_classes"].clip(0, 25).round().astype(int)
        noisy["lms_engagement"] = noisy["lms_engagement"].clip(0, 100)
        noisy["study_hours"] = noisy["study_hours"].clip(0, 40)
        noisy["level"] = noisy["level"].clip(100, 500).round().astype(int)

        rows.append(noisy)

    return pd.concat(rows, ignore_index=True)
