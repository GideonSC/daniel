from pydantic import AliasChoices, BaseModel, Field


class StudentInput(BaseModel):
    student_id: str = Field(min_length=1, max_length=50)
    student_name: str = Field(min_length=1, max_length=100)
    attendance_percentage: float = Field(ge=0, le=100, validation_alias=AliasChoices("attendance_percentage", "attendance"))
    assignment_score: float = Field(ge=0, le=100, validation_alias=AliasChoices("assignment_score", "exam_score"))
    quiz_score: float = Field(ge=0, le=100, validation_alias=AliasChoices("quiz_score", "quiz"))
    test_score: float = Field(ge=0, le=100, validation_alias=AliasChoices("test_score", "test"))
    ca_score: float = Field(ge=0, le=100, validation_alias=AliasChoices("ca_score", "continuous_assessment"))
    previous_gpa: float = Field(ge=0, le=5)
    missed_classes: int = Field(ge=0)
    lms_engagement: float = Field(ge=0, le=100)
    study_hours: float = Field(ge=0)
    department: str
    level: int = Field(ge=100, le=500)


class PredictionResponse(BaseModel):
    record_id: int
    student_id: str
    student_name: str
    predicted_category: str
    confidence: float
    created_at: str


class StudentForecastRequest(BaseModel):
    student_name: str = Field(min_length=1, max_length=100)


class StudentForecastResponse(BaseModel):
    student_name: str
    record_count: int
    estimated_future_score: float
    average_gpa: float
    predicted_category: str
    confidence: float
    department: str
    level: int


class StudentRecord(BaseModel):
    id: int
    student_id: str
    student_name: str
    attendance_percentage: float
    assignment_score: float
    quiz_score: float
    test_score: float
    ca_score: float
    previous_gpa: float
    missed_classes: int
    lms_engagement: float
    study_hours: float
    department: str
    level: int
    predicted_category: str
    confidence: float
    created_at: str


class BulkUploadResponse(BaseModel):
    uploaded_count: int
    failed_count: int
    message: str
    records: list[PredictionResponse] = Field(default_factory=list)
