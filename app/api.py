import json
from io import BytesIO
from statistics import mean
from collections import Counter

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import METRICS_FILE, MODEL_FILE, RECORDS_DB, TRAINING_DATA
from app.model import load_model, predict_single
from app.schemas import (
    BulkUploadResponse,
    PredictionResponse,
    StudentForecastRequest,
    StudentForecastResponse,
    StudentInput,
    StudentRecord,
)
from app.storage import clear_student_records, fetch_student_records, fetch_student_records_by_name, init_records_db, insert_student_record
from app.utils import augment_dataset, build_student_id, category_distribution, load_dataset, numeric_summary


app = FastAPI(title="Student Performance Prediction API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
metrics = {}
base_dataset = load_dataset(TRAINING_DATA)
dataset = augment_dataset(base_dataset, copies=18)


@app.on_event("startup")
def startup_event():
    global model, metrics
    init_records_db(RECORDS_DB)
    if MODEL_FILE.exists():
        model = load_model(MODEL_FILE)
    if METRICS_FILE.exists():
        metrics = json.loads(METRICS_FILE.read_text())


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.get("/")
def root():
    return {
        "name": "Student Performance Prediction API",
        "health": "/health",
        "summary": "/summary",
        "predict": "/predict",
    }


@app.get("/summary")
def summary():
    stored_records = fetch_student_records(RECORDS_DB)
    stored_categories = category_distribution(stored_records)
    stored_at_risk_total = sum(item["value"] for item in stored_categories if item["label"] in {"Low", "Average"})
    stored_high_performers_total = sum(item["value"] for item in stored_categories if item["label"] == "High")
    return {
        "metrics": metrics,
        "dataset_summary": numeric_summary(dataset),
        "performance_distribution": category_distribution(dataset),
        "stored_performance_distribution": stored_categories,
        "sample_departments": sorted(dataset["department"].unique().tolist()),
        "confusion_matrix": metrics.get("confusion_matrix", []),
        "stored_records_total": len(stored_records),
        "stored_at_risk_total": stored_at_risk_total,
        "stored_high_performers_total": stored_high_performers_total,
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(student: StudentInput):
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded yet")
    return _predict_and_store(student.model_dump())


def _predict_and_store(payload: dict) -> PredictionResponse:
    prediction_payload = {
        key: value
        for key, value in payload.items()
        if key not in {"student_id", "student_name"}
    }
    predicted_category, confidence = predict_single(model, prediction_payload)
    record_base = dict(payload)
    record_base.update(
        {
            "predicted_category": predicted_category,
            "confidence": confidence,
        }
    )
    saved_record = insert_student_record(RECORDS_DB, record_base)
    return PredictionResponse(
        record_id=saved_record["id"],
        student_id=payload["student_id"],
        student_name=payload["student_name"],
        predicted_category=predicted_category,
        confidence=confidence,
        created_at=saved_record["created_at"],
    )


@app.get("/records", response_model=list[StudentRecord])
def records():
    return fetch_student_records(RECORDS_DB)


@app.delete("/records")
def delete_records():
    deleted_count = clear_student_records(RECORDS_DB)
    return {
        "message": "All student records deleted",
        "deleted_count": deleted_count,
    }


def _average(values: list[float]) -> float:
    return float(mean(values)) if values else 0.0


def _most_common(values: list[str]) -> str:
    if not values:
        return ""
    return Counter(values).most_common(1)[0][0]


def _forecast_from_history(student_name: str, history: list[dict]) -> StudentForecastResponse:
    latest = history[0]
    numeric_fields = [
        "attendance_percentage",
        "assignment_score",
        "quiz_score",
        "test_score",
        "ca_score",
        "previous_gpa",
        "missed_classes",
        "lms_engagement",
        "study_hours",
    ]
    averages = {
        field: _average([float(record[field]) for record in history if record.get(field) is not None])
        for field in numeric_fields
    }
    department = _most_common([str(record["department"]).strip() for record in history if record.get("department")]) or latest["department"]
    level = int(round(_average([float(record["level"]) for record in history if record.get("level") is not None]))) or int(latest["level"])

    forecast_payload = {
        "attendance_percentage": averages["attendance_percentage"],
        "assignment_score": averages["assignment_score"],
        "quiz_score": averages["quiz_score"],
        "test_score": averages["test_score"],
        "ca_score": averages["ca_score"],
        "previous_gpa": averages["previous_gpa"],
        "missed_classes": int(round(averages["missed_classes"])),
        "lms_engagement": averages["lms_engagement"],
        "study_hours": averages["study_hours"],
        "department": department,
        "level": level,
    }
    predicted_category, confidence = predict_single(model, forecast_payload)
    estimated_future_score = round(
        (
            (averages["assignment_score"] + averages["quiz_score"] + averages["test_score"] + averages["ca_score"]) / 4
            * 0.55
            + averages["attendance_percentage"] * 0.2
            + averages["lms_engagement"] * 0.1
            + min(averages["previous_gpa"] * 20, 100) * 0.15
        ),
        1,
    )
    return StudentForecastResponse(
        student_name=student_name,
        record_count=len(history),
        estimated_future_score=estimated_future_score,
        average_gpa=round(averages["previous_gpa"], 2),
        predicted_category=predicted_category,
        confidence=confidence,
        department=department,
        level=level,
    )


@app.post("/forecast-student", response_model=StudentForecastResponse)
def forecast_student(request: StudentForecastRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded yet")

    history = fetch_student_records_by_name(RECORDS_DB, request.student_name)
    if not history:
        raise HTTPException(
            status_code=404,
            detail="No saved records were found for that student name yet",
        )

    return _forecast_from_history(request.student_name.strip(), history)


def _normalize_bulk_row(row: dict) -> dict:
    def _value(*keys):
        for key in keys:
            if key in row and row.get(key) not in ("", None):
                return row.get(key)
        return None

    student_id = str(row.get("student_id", "")).strip()
    if not student_id:
        student_id = build_student_id(
            _value("id_year"),
            _value("id_faculty"),
            _value("id_department"),
            _value("id_number"),
        )

    payload = {
        "student_id": student_id,
        "student_name": str(_value("student_name") or "").strip(),
        "attendance_percentage": _value("attendance_percentage", "attendance"),
        "assignment_score": _value("assignment_score", "exam_score"),
        "quiz_score": _value("quiz_score", "quiz"),
        "test_score": _value("test_score", "test"),
        "ca_score": _value("ca_score", "continuous_assessment"),
        "previous_gpa": _value("previous_gpa"),
        "missed_classes": _value("missed_classes"),
        "lms_engagement": _value("lms_engagement"),
        "study_hours": _value("study_hours"),
        "department": str(_value("department") or "").strip(),
        "level": _value("level"),
    }
    return StudentInput(**payload).model_dump()


@app.post("/upload-excel", response_model=BulkUploadResponse)
async def upload_excel(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded yet")

    filename = (file.filename or "").lower()
    if not filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Please upload an Excel file with .xlsx or .xls extension")

    contents = await file.read()
    try:
        dataframe = pd.read_excel(BytesIO(contents))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Unable to read Excel file: {exc}") from exc

    required_column_groups = [
        {"student_name"},
        {"attendance_percentage", "attendance"},
        {"assignment_score", "exam_score"},
        {"quiz_score", "quiz"},
        {"test_score", "test"},
        {"ca_score", "continuous_assessment"},
        {"previous_gpa"},
        {"missed_classes"},
        {"lms_engagement"},
        {"study_hours"},
        {"department"},
        {"level"},
    ]
    id_columns = {"student_id", "id_year", "id_faculty", "id_department", "id_number"}
    missing_required = sorted(
        next(iter(group))
        for group in required_column_groups
        if not any(column in dataframe.columns for column in group)
    )
    has_id_source = "student_id" in dataframe.columns or id_columns.issubset(set(dataframe.columns))

    if missing_required or not has_id_source:
        raise HTTPException(
            status_code=400,
            detail=(
                "Excel file must include student_name, scores, department, level, "
                "and either student_id or id_year/id_faculty/id_department/id_number columns"
            ),
        )

    uploaded_records = []
    failed_count = 0
    for _, row in dataframe.iterrows():
        try:
            payload = _normalize_bulk_row(row.to_dict())
            uploaded_records.append(_predict_and_store(payload))
        except Exception:
            failed_count += 1

    return BulkUploadResponse(
        uploaded_count=len(uploaded_records),
        failed_count=failed_count,
        message="Excel file processed successfully",
        records=uploaded_records,
    )
