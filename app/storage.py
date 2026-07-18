import sqlite3
from datetime import datetime, timezone
from pathlib import Path


def _connect(path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    return connection


def init_records_db(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with _connect(path) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS student_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id TEXT NOT NULL,
                student_name TEXT NOT NULL,
                attendance_percentage REAL NOT NULL,
                assignment_score REAL NOT NULL,
                quiz_score REAL NOT NULL,
                test_score REAL NOT NULL,
                ca_score REAL NOT NULL,
                previous_gpa REAL NOT NULL,
                missed_classes INTEGER NOT NULL,
                lms_engagement REAL NOT NULL,
                study_hours REAL NOT NULL,
                department TEXT NOT NULL,
                level INTEGER NOT NULL,
                predicted_category TEXT NOT NULL,
                confidence REAL NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL DEFAULT '',
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        try:
            connection.execute("ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT ''")
        except sqlite3.OperationalError:
            pass
        connection.commit()


def insert_user(path: Path, user: dict) -> dict:
    created_at = datetime.now(timezone.utc).isoformat()
    with _connect(path) as connection:
        cursor = connection.execute(
            """
            INSERT INTO users (
                username,
                email,
                password_hash,
                full_name,
                created_at
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (
                user["username"],
                user["email"],
                user["password_hash"],
                user["full_name"],
                created_at,
            ),
        )
        connection.commit()
        return {
            "id": cursor.lastrowid,
            "username": user["username"],
            "email": user["email"],
            "full_name": user["full_name"],
            "created_at": created_at,
        }


def fetch_user_by_username(path: Path, username: str) -> dict | None:
    normalized_username = str(username).strip().lower()
    if not normalized_username:
        return None

    with _connect(path) as connection:
        row = connection.execute(
            """
            SELECT
                id,
                username,
                email,
                password_hash,
                full_name,
                created_at
            FROM users
            WHERE username = ?
            """,
            (normalized_username,),
        ).fetchone()

    return dict(row) if row else None


def insert_student_record(path: Path, record: dict) -> dict:
    created_at = record.get("created_at") or datetime.now(timezone.utc).isoformat()
    with _connect(path) as connection:
        cursor = connection.execute(
            """
            INSERT INTO student_records (
                student_id,
                student_name,
                attendance_percentage,
                assignment_score,
                quiz_score,
                test_score,
                ca_score,
                previous_gpa,
                missed_classes,
                lms_engagement,
                study_hours,
                department,
                level,
                predicted_category,
                confidence,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record["student_id"],
                record["student_name"],
                record["attendance_percentage"],
                record["assignment_score"],
                record["quiz_score"],
                record["test_score"],
                record["ca_score"],
                record["previous_gpa"],
                record["missed_classes"],
                record["lms_engagement"],
                record["study_hours"],
                record["department"],
                record["level"],
                record["predicted_category"],
                record["confidence"],
                created_at,
            ),
        )
        connection.commit()
        return {"id": cursor.lastrowid, "created_at": created_at}


def fetch_student_records(path: Path) -> list[dict]:
    with _connect(path) as connection:
        rows = connection.execute(
            """
            SELECT
                id,
                student_id,
                student_name,
                attendance_percentage,
                assignment_score,
                quiz_score,
                test_score,
                ca_score,
                previous_gpa,
                missed_classes,
                lms_engagement,
                study_hours,
                department,
                level,
                predicted_category,
                confidence,
                created_at
            FROM student_records
            ORDER BY id DESC
            """
        ).fetchall()

    return [dict(row) for row in rows]


def fetch_student_records_by_name(path: Path, student_name: str) -> list[dict]:
    normalized_name = " ".join(str(student_name).strip().split()).casefold()
    if not normalized_name:
        return []

    with _connect(path) as connection:
        rows = connection.execute(
            """
            SELECT
                id,
                student_id,
                student_name,
                attendance_percentage,
                assignment_score,
                quiz_score,
                test_score,
                ca_score,
                previous_gpa,
                missed_classes,
                lms_engagement,
                study_hours,
                department,
                level,
                predicted_category,
                confidence,
                created_at
            FROM student_records
            WHERE LOWER(TRIM(student_name)) = ?
            ORDER BY id DESC
            """,
            (normalized_name,),
        ).fetchall()

    return [dict(row) for row in rows]


def clear_student_records(path: Path) -> int:
    with _connect(path) as connection:
        cursor = connection.execute("DELETE FROM student_records")
        try:
            connection.execute("DELETE FROM sqlite_sequence WHERE name = 'student_records'")
        except sqlite3.OperationalError:
            pass
        connection.commit()
        return cursor.rowcount if cursor.rowcount is not None else 0
