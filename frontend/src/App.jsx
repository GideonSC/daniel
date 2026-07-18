import { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8003";
const AUTH_STORAGE_KEY = "student-performance-auth";

const defaultAuthForm = {
  username: "daniel",
  email: "",
  password: "",
  full_name: "Daniel User",
};

const defaultForm = {
  previous_gpa: 3.4,
  exam_score: 80,
  test_score: 76,
  continuous_assessment: 82,
  attendance: 85,
  quiz: 78,
  id_year: "2021",
  id_faculty: "CP",
  id_department: "CSC",
  id_number: "0282",
  student_name: "Amina Bello",
  missed_classes: 2,
  lms_engagement: 88,
  study_hours: 12,
  department: "Computer Science",
  level: 300,
};

const performanceFields = [
  ["previous_gpa", "Previous GPA", "number", "0.1"],
  ["exam_score", "Exam score", "number", "0"],
  ["test_score", "Test score", "number", "0"],
  ["continuous_assessment", "Continuous assessment", "number", "0"],
  ["attendance", "Attendance", "number", "0"],
  ["quiz", "Quiz", "number", "0"],
];

const studentFields = [
  ["id_year", "Year of admission", "text", "2021"],
  ["id_faculty", "Faculty", "text", "CP"],
  ["id_department", "Department code", "text", "CSC"],
  ["id_number", "Serial No.", "text", "0282"],
  ["student_name", "Student name", "text", ""],
  ["missed_classes", "Missed classes", "number", "1"],
  ["lms_engagement", "LMS engagement", "number", "0"],
  ["study_hours", "Study hours", "number", "0.5"],
];

const navItems = [
  { label: "Dashboard", target: "overview-section" },
  { label: "Students", target: "prediction-section" },
  { label: "Data Records", target: "records-section" },
  { label: "Upload", target: "upload-section" },
  { label: "Prediction", target: "overview-section" },
  { label: "Analytics", target: "analytics-section" },
  { label: "Reports", target: "records-section" },
  { label: "Alerts", target: "risk-section" },
];

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function average(values) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (!filtered.length) return 0;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatPercent(value) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "N/A";
}

function formatGpa(value) {
  return typeof value === "number" ? value.toFixed(2) : "N/A";
}

function buildStudentId(form) {
  const year = String(form.id_year ?? "").trim();
  const faculty = String(form.id_faculty ?? "").trim().toUpperCase();
  const department = String(form.id_department ?? "").trim().toUpperCase();
  const number = String(form.id_number ?? "").trim();
  return [year, faculty, department, number].filter(Boolean).join("/");
}

function normalizePayload(form) {
  return {
    student_id: buildStudentId(form),
    student_name: form.student_name.trim(),
    attendance_percentage: Number(form.attendance),
    assignment_score: Number(form.exam_score),
    quiz_score: Number(form.quiz),
    test_score: Number(form.test_score),
    ca_score: Number(form.continuous_assessment),
    previous_gpa: Number(form.previous_gpa),
    missed_classes: Number(form.missed_classes),
    lms_engagement: Number(form.lms_engagement),
    study_hours: Number(form.study_hours),
    department: form.department,
    level: Number(form.level),
  };
}

async function readResponseData(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}

function buildPerformanceScore(record) {
  return average([
    toNumber(record.attendance_percentage),
    toNumber(record.assignment_score),
    toNumber(record.quiz_score),
    toNumber(record.test_score),
    toNumber(record.ca_score),
    toNumber(record.previous_gpa) * 20,
    toNumber(record.lms_engagement),
  ]);
}

function deriveCategory(record) {
  const label = String(record?.predicted_category ?? "").toLowerCase();
  if (label.includes("high")) return "High";
  if (label.includes("average")) return "Average";
  if (label.includes("low")) return "Low";

  const score = buildPerformanceScore(record);
  if (score >= 70) return "High";
  if (score >= 50) return "Average";
  return "Low";
}

function deriveRiskLevel(category) {
  if (category === "High") return "Low Risk";
  if (category === "Average") return "Medium Risk";
  return "High Risk";
}

function categoryMeta(category) {
  const tone = deriveCategory({ predicted_category: category });
  if (tone === "High") {
    return { label: "Above Average", note: "Top 35% of students", badge: "Good Performance", tone: "success" };
  }
  if (tone === "Average") {
    return { label: "On Track", note: "Stable progression", badge: "Moderate Performance", tone: "warning" };
  }
  return { label: "Needs Support", note: "Requires attention", badge: "At Risk", tone: "danger" };
}

function studentInitials(name) {
  return String(name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "ST";
}

function buildPreviewRecord(form) {
  const payload = normalizePayload(form);
  const score = buildPerformanceScore(payload);
  const category = deriveCategory(payload);
  return {
    id: "preview",
    student_id: payload.student_id,
    student_name: payload.student_name || "Live preview",
    department: payload.department,
    level: payload.level,
    attendance_percentage: payload.attendance_percentage,
    assignment_score: payload.assignment_score,
    quiz_score: payload.quiz_score,
    test_score: payload.test_score,
    ca_score: payload.ca_score,
    previous_gpa: payload.previous_gpa,
    missed_classes: payload.missed_classes,
    lms_engagement: payload.lms_engagement,
    study_hours: payload.study_hours,
    performance_score: score,
    estimated_gpa: clamp(score / 20, 0, 5),
    predicted_category: category,
    confidence: 0,
    created_at: "Live input",
  };
}

function linePath(values, width = 100, height = 36, padding = 4) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (!filtered.length) return "";

  const min = Math.min(...filtered);
  const max = Math.max(...filtered);
  const range = max - min || 1;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  return filtered
    .map((value, index) => {
      const x = padding + (usableWidth * index) / Math.max(filtered.length - 1, 1);
      const y = padding + usableHeight - ((value - min) / range) * usableHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildScaledPath(values, width, height, padding) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (!filtered.length) return "";

  const min = Math.min(...filtered);
  const max = Math.max(...filtered);
  const range = max - min || 1;
  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;

  return filtered
    .map((value, index) => {
      const x = padding.left + (usableWidth * index) / Math.max(filtered.length - 1, 1);
      const y = padding.top + usableHeight - ((value - min) / range) * usableHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function Sparkline({ values, color }) {
  const path = linePath(values, 120, 42, 4);
  return (
    <svg className="sparkline" viewBox="0 0 120 42" aria-hidden="true">
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendChart({ labels, series }) {
  const width = 560;
  const height = 260;
  const padding = { top: 20, right: 18, bottom: 38, left: 36 };
  const values = series.flatMap((item) => item.values).filter((value) => Number.isFinite(value));
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);
  const range = max - min || 1;
  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;
  const x = (index) => padding.left + (usableWidth * index) / Math.max(labels.length - 1, 1);
  const y = (value) => padding.top + usableHeight - ((value - min) / range) * usableHeight;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="trend-chart" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((tick) => {
        const tickY = padding.top + (usableHeight * tick) / 4;
        return <line key={tick} x1={padding.left} x2={width - padding.right} y1={tickY} y2={tickY} className="trend-grid-line" />;
      })}

      {series.map((item) => (
        <g key={item.label}>
          <path
            d={buildScaledPath(item.values, width, height, padding)}
            fill="none"
            stroke={item.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={item.dashed ? "6 5" : undefined}
          />
          {item.values.map((value, index) => (
            <circle key={`${item.label}-${index}`} cx={x(index)} cy={y(value)} r="4" fill={item.color} />
          ))}
        </g>
      ))}

      {labels.map((label, index) => (
        <text key={label} x={x(index)} y={height - 14} textAnchor="middle" className="trend-label">
          {label}
        </text>
      ))}
    </svg>
  );
}

function DonutChart({ items, total }) {
  const palette = ["#22c55e", "#f59e0b", "#ef4444"];
  const parts = items
    .filter((item) => item.value > 0)
    .map((item, index) => `${palette[index % palette.length]} ${item.percentStart}% ${item.percentEnd}%`)
    .join(", ");
  const style = parts ? { background: `conic-gradient(${parts})` } : { background: "#e5e7eb" };

  return (
    <div className="donut-wrap">
      <div className="donut-chart" style={style}>
        <div className="donut-center">
          <strong>{total}</strong>
          <span>Students</span>
        </div>
      </div>
      <div className="donut-legend">
        {items.map((item, index) => (
          <div className="donut-legend-item" key={item.label}>
            <span className="donut-swatch" style={{ background: palette[index % palette.length] }} />
            <div>
              <strong>{item.label}</strong>
              <p>
                {item.value} ({item.percent}%)
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [authSession, setAuthSession] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY)) ?? null;
    } catch {
      return null;
    }
  });
  const [authForm, setAuthForm] = useState(defaultAuthForm);
  const [authMode, setAuthMode] = useState("login");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [result, setResult] = useState(null);
  const [featuredRecord, setFeaturedRecord] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [activeNav, setActiveNav] = useState("Dashboard");

  const authHeaders = authSession?.access_token
    ? { Authorization: `Bearer ${authSession.access_token}` }
    : {};

  const apiFetch = (path, options = {}) => {
    const headers = {
      ...authHeaders,
      ...(options.headers ?? {}),
    };
    return fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  };

  const handleUnauthorized = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthSession(null);
    setAuthError("Please sign in again to continue.");
  };

  const loadSummary = () => {
    return apiFetch("/summary")
      .then(async (response) => {
        const data = await readResponseData(response);
        if (response.status === 401) {
          handleUnauthorized();
          return null;
        }
        if (!response.ok) {
          throw new Error(data?.detail || `Summary request failed (${response.status})`);
        }
        setSummary(data);
        return data;
      })
      .catch((summaryError) => {
        console.error(summaryError);
        setSummary(null);
        return null;
      });
  };

  const loadRecords = () => {
    return apiFetch("/records")
      .then(async (response) => {
        const data = await readResponseData(response);
        if (response.status === 401) {
          handleUnauthorized();
          return [];
        }
        if (!response.ok) {
          throw new Error(data?.detail || `Records request failed (${response.status})`);
        }
        const nextRecords = Array.isArray(data) ? data : [];
        setRecords(nextRecords);
        setFeaturedRecord((current) => {
          if (current && current.id !== "preview" && nextRecords.some((record) => record.id === current.id)) {
            return current;
          }
          return nextRecords[0] ?? null;
        });
        return data;
      })
      .catch((recordsError) => {
        console.error(recordsError);
        setRecords([]);
        return [];
      });
  };

  useEffect(() => {
    if (authSession?.access_token) {
      loadSummary();
      loadRecords();
    }
  }, [authSession?.access_token]);

  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.classList.add("sidebar-open");
    } else {
      document.body.classList.remove("sidebar-open");
    }

    return () => {
      document.body.classList.remove("sidebar-open");
    };
  }, [mobileSidebarOpen]);

  const departments = summary?.sample_departments?.length
    ? summary.sample_departments
    : ["Computer Science", "Mathematics", "Engineering", "Business"];

  const totalStoredStudents = summary?.stored_records_total ?? records.length;
  const accuracy = totalStoredStudents ? summary?.metrics?.accuracy ?? 0 : 0;
  const activeQuery = searchQuery.trim().toLowerCase();
  const searchableRecords = activeQuery
    ? records.filter((record) =>
        [record.student_name, record.student_id, record.department]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(activeQuery)),
      )
    : records;

  const heroRecord =
    searchableRecords[0] ?? featuredRecord ?? (records.length ? records[0] : null) ?? buildPreviewRecord(form);
  const heroCategory = deriveCategory(heroRecord);
  const heroMeta = categoryMeta(heroCategory);
  const heroScore = buildPerformanceScore(heroRecord);
  const heroGpa = heroRecord?.estimated_gpa ?? clamp(heroScore / 20, 0, 5);

  const categoryCounts = {
    High: 0,
    Average: 0,
    Low: 0,
  };
  records.forEach((record) => {
    const category = deriveCategory(record);
    categoryCounts[category] += 1;
  });

  const summaryCards = [
    {
      icon: "ST",
      iconClass: "summary-icon blue",
      label: "Total Students",
      value: totalStoredStudents,
      note: "Stored records in the system",
    },
    {
      icon: "AC",
      iconClass: "summary-icon green",
      label: "Prediction Accuracy",
      value: formatPercent(accuracy),
      note: summary?.metrics ? "Latest trained model" : "Waiting for model data",
    },
    {
      icon: "AR",
      iconClass: "summary-icon amber",
      label: "At-Risk Students",
      value: categoryCounts.Low + categoryCounts.Average,
      note: "Based on current stored data",
    },
    {
      icon: "HP",
      iconClass: "summary-icon purple",
      label: "High Performers",
      value: categoryCounts.High,
      note: "Based on current stored data",
    },
  ];

  const recentRecords = showAllRecords ? searchableRecords : searchableRecords.slice(0, 4);
  const riskRecords = [...searchableRecords]
    .map((record) => ({
      ...record,
      score: buildPerformanceScore(record),
      category: deriveCategory(record),
    }))
    .sort((left, right) => left.score - right.score)
    .slice(0, 5);

  const recentTrendRecords = [...records].slice(0, 4).reverse();
  const trendLabels = recentTrendRecords.length
    ? recentTrendRecords.map((record, index) => record.student_name?.split(" ")[0] || `Rec ${index + 1}`)
    : ["Sem 1", "Sem 2", "Sem 3", "Sem 4"];
  const trendValues = recentTrendRecords.map((record) => clamp(buildPerformanceScore(record) / 20, 0, 5));
  const classAverage = clamp(average(records.map((record) => buildPerformanceScore(record))) / 20, 0, 5);
  const departmentAverage = clamp(
    average(records.filter((record) => record.department === heroRecord.department).map((record) => buildPerformanceScore(record))) / 20,
    0,
    5,
  );
  const trendSeries = [
    { label: "GPA Trend", values: trendValues.length ? trendValues : [3.1, 3.2, 3.3, 3.4], color: "#2563eb" },
    {
      label: "Class Average",
      values: (trendValues.length ? trendValues : [3.1, 3.2, 3.3, 3.4]).map(() => classAverage || 3.0),
      color: "#94a3b8",
      dashed: true,
    },
    {
      label: "Department Average",
      values: (trendValues.length ? trendValues : [3.1, 3.2, 3.3, 3.4]).map(() => departmentAverage || 2.8),
      color: "#a855f7",
      dashed: true,
    },
  ];

  const distribution = summary?.performance_distribution?.length
    ? summary.performance_distribution
    : [
        { label: "High", value: categoryCounts.High },
        { label: "Average", value: categoryCounts.Average },
        { label: "Low", value: categoryCounts.Low },
      ];
  const distributionTotal = distribution.reduce((sum, item) => sum + item.value, 0) || totalStoredStudents || 1;
  let percentCursor = 0;
  const donutItems = distribution.map((item) => {
    const percent = Math.round((item.value / distributionTotal) * 100);
    const percentStart = percentCursor;
    const percentEnd = percentCursor + percent;
    percentCursor = percentEnd;
    return {
      label: item.label,
      value: item.value,
      percent,
      percentStart,
      percentEnd,
    };
  });

  const indicatorDefs = [
    {
      label: "Attendance",
      value: heroRecord.attendance_percentage ?? 0,
      status: heroRecord.attendance_percentage >= 80 ? "Excellent" : "Needs work",
      color: "#3b82f6",
      values: recentTrendRecords.map((record) => record.attendance_percentage ?? 0),
    },
    {
      label: "Exam",
      value: heroRecord.assignment_score ?? 0,
      status: heroRecord.assignment_score >= 80 ? "Good" : "Focus",
      color: "#22c55e",
      values: recentTrendRecords.map((record) => record.assignment_score ?? 0),
    },
    {
      label: "Quizzes",
      value: heroRecord.quiz_score ?? 0,
      status: heroRecord.quiz_score >= 75 ? "Good" : "Review",
      color: "#8b5cf6",
      values: recentTrendRecords.map((record) => record.quiz_score ?? 0),
    },
    {
      label: "Tests",
      value: heroRecord.test_score ?? 0,
      status: heroRecord.test_score >= 75 ? "Good" : "Review",
      color: "#f59e0b",
      values: recentTrendRecords.map((record) => record.test_score ?? 0),
    },
    {
      label: "Engagement",
      value: heroRecord.lms_engagement ?? 0,
      status: heroRecord.lms_engagement >= 80 ? "Very Good" : "Low",
      color: "#ef4444",
      values: recentTrendRecords.map((record) => record.lms_engagement ?? 0),
    },
  ];

  const factorRows = [
    { label: "Previous GPA", value: clamp(((heroRecord.previous_gpa ?? 0) / 5) * 100, 0, 100) },
    { label: "Attendance Rate", value: clamp(heroRecord.attendance_percentage ?? 0, 0, 100) },
    { label: "Exam Scores", value: clamp(heroRecord.assignment_score ?? 0, 0, 100) },
    { label: "Assignment / CA", value: clamp(heroRecord.ca_score ?? 0, 0, 100) },
    { label: "Engagement Level", value: clamp(heroRecord.lms_engagement ?? 0, 0, 100) },
  ];

  const onAuthChange = (key, value) => {
    setAuthForm((current) => ({ ...current, [key]: value }));
  };

  const onAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const payload = {
        username: authForm.username.trim(),
        password: authForm.password,
      };
      if (authMode === "register") {
        payload.full_name = authForm.full_name.trim();
        payload.email = authForm.email.trim();
      }

      const response = await fetch(`${API_BASE}/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readResponseData(response);
      if (!response.ok) throw new Error(data?.detail || "Authentication failed");

      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
      setAuthSession(data);
      setAuthForm((current) => ({ ...current, password: "" }));
    } catch (loginError) {
      setAuthError(loginError.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthSession(null);
    setSummary(null);
    setRecords([]);
    setFeaturedRecord(null);
    setSelectedRecord(null);
    setError("");
    setUploadMessage("");
  };

  const scrollToSection = (target, label) => {
    setActiveNav(label);
    setMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openRecordModal = (record) => setSelectedRecord(record);
  const closeRecordModal = () => setSelectedRecord(null);

  const onChange = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const payload = normalizePayload(form);
      const response = await apiFetch("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readResponseData(response);
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!response.ok) throw new Error(data?.detail || "Prediction failed");

      setResult(data);
      const nextRecord = {
        id: data.record_id,
        student_id: data.student_id ?? payload.student_id,
        student_name: data.student_name ?? payload.student_name,
        attendance_percentage: payload.attendance_percentage,
        assignment_score: payload.assignment_score,
        quiz_score: payload.quiz_score,
        test_score: payload.test_score,
        ca_score: payload.ca_score,
        previous_gpa: payload.previous_gpa,
        missed_classes: payload.missed_classes,
        lms_engagement: payload.lms_engagement,
        study_hours: payload.study_hours,
        department: payload.department,
        level: payload.level,
        predicted_category: data.predicted_category,
        confidence: data.confidence,
        created_at: data.created_at,
      };

      setRecords((current) => [nextRecord, ...current.filter((record) => record.id !== nextRecord.id)]);
      setFeaturedRecord(nextRecord);
      await Promise.all([loadSummary(), loadRecords()]);
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setLoading(false);
    }
  };

  const onUpload = async (event) => {
    event.preventDefault();
    if (!uploadFile) {
      setUploadMessage("Choose an Excel file first.");
      return;
    }

    setUploading(true);
    setUploadMessage("");

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);

      const response = await apiFetch("/upload-excel", {
        method: "POST",
        body: formData,
      });
      const data = await readResponseData(response);
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!response.ok) throw new Error(data?.detail || "Excel upload failed");

      setUploadMessage(`Uploaded ${data.uploaded_count} rows. ${data.failed_count} failed.`);
      setUploadFile(null);
      await Promise.all([loadSummary(), loadRecords()]);
    } catch (uploadError) {
      setUploadMessage(uploadError.message);
    } finally {
      setUploading(false);
    }
  };

  const displayFields = [
    ["preview_student", "Student", heroRecord.student_name ?? "N/A"],
    ["preview_id", "Matric No.", heroRecord.student_id ?? "N/A"],
    ["preview_department", "Department", heroRecord.department ?? "N/A"],
    ["preview_level", "Level", heroRecord.level ?? "N/A"],
  ];

  const recentRecordsButtonLabel = showAllRecords ? "Show recent" : "View all";
  const resetAllData = async () => {
    const confirmed = window.confirm("Delete all stored student records and reset the dashboard?");
    if (!confirmed) return;

    try {
      const response = await apiFetch("/records", { method: "DELETE" });
      const data = await readResponseData(response);
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!response.ok) {
        throw new Error(data?.detail || data?.message || "Reset failed");
      }

      setRecords([]);
      setFeaturedRecord(null);
      setSelectedRecord(null);
      setShowAllRecords(false);
      setSearchQuery("");
      setUploadFile(null);
      setUploadMessage("");
      setError("");
      setResult(null);
      setForm(defaultForm);
      await Promise.all([loadSummary(), loadRecords()]);
    } catch (resetError) {
      setError(resetError.message);
    }
  };

  const showSummary = activeNav === "Dashboard";
  const showHero = ["Dashboard", "Students", "Prediction"].includes(activeNav);
  const showIndicators = ["Dashboard", "Students", "Prediction"].includes(activeNav);
  const showAnalytics = ["Dashboard", "Analytics", "Reports"].includes(activeNav);
  const showPredictionForm = ["Students", "Prediction"].includes(activeNav);
  const showRecords = ["Dashboard", "Data Records", "Reports"].includes(activeNav);
  const showUpload = activeNav === "Upload";
  const showAlerts = ["Dashboard", "Alerts"].includes(activeNav);
  const showFactors = ["Dashboard", "Analytics"].includes(activeNav);
  const hasMainContent = showHero || showIndicators || showAnalytics || showPredictionForm || showRecords;
  const hasSideContent = showUpload || showAlerts || showFactors;

  if (!authSession?.access_token) {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <div className="auth-copy">
            <p className="eyebrow">Secure access</p>
            <h1>Student Performance Intelligence</h1>
            <p>Sign in to manage predictions, uploads, records, and at-risk student insights.</p>
          </div>

          <form className="auth-card" onSubmit={onAuthSubmit}>
            <div className="auth-tabs" aria-label="Authentication mode">
              <button
                type="button"
                className={authMode === "login" ? "active" : ""}
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                className={authMode === "register" ? "active" : ""}
                onClick={() => {
                  setAuthMode("register");
                  setAuthError("");
                }}
              >
                Create account
              </button>
            </div>

            <label className="form-field">
              <span>Username</span>
              <input
                type="text"
                value={authForm.username}
                minLength="3"
                autoComplete="username"
                onChange={(event) => onAuthChange("username", event.target.value)}
              />
            </label>

            {authMode === "register" ? (
              <>
                <label className="form-field">
                  <span>Full name</span>
                  <input
                    type="text"
                    value={authForm.full_name}
                    minLength="1"
                    autoComplete="name"
                    onChange={(event) => onAuthChange("full_name", event.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={authForm.email}
                    minLength="5"
                    autoComplete="email"
                    onChange={(event) => onAuthChange("email", event.target.value)}
                  />
                </label>
              </>
            ) : null}

            <label className="form-field">
              <span>Password</span>
              <div className="password-field">
                <input
                  type={passwordVisible ? "text" : "password"}
                  value={authForm.password}
                  minLength="6"
                  autoComplete={authMode === "login" ? "current-password" : "new-password"}
                  onChange={(event) => onAuthChange("password", event.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setPasswordVisible((current) => !current)}
                  aria-label={passwordVisible ? "Hide password" : "Show password"}
                  title={passwordVisible ? "Hide password" : "Show password"}
                >
                  {passwordVisible ? "◉" : "◎"}
                </button>
              </div>
            </label>

            {authError ? <div className="message error">{authError}</div> : null}

            <button type="submit" className="cta-button" disabled={authLoading}>
              {authLoading ? "Please wait..." : authMode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileSidebarOpen ? "open" : ""}`}>
        <div className="brand-block">
          <div className="brand-mark">
            <span />
            <span />
            <span />
          </div>
          <div>
            <strong>Predictive Intelligence System</strong>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`sidebar-link ${activeNav === item.label ? "active" : ""}`}
              onClick={() => scrollToSection(item.target, item.label)}
            >
              <span className="sidebar-dot" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="avatar-chip">{studentInitials(authSession.user?.full_name)}</div>
          <div>
            <strong>{authSession.user?.full_name ?? authSession.user?.username}</strong>
            <p>{authSession.user?.username}</p>
          </div>
          <button type="button" className="logout-button" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      {mobileSidebarOpen ? <div className="sidebar-backdrop" onClick={() => setMobileSidebarOpen(false)} /> : null}

      <main className="app-main">
        <header className="topbar" id="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="menu-button"
              onClick={() => setMobileSidebarOpen((current) => !current)}
              aria-label="Toggle navigation"
              aria-expanded={mobileSidebarOpen}
            >
              ☰
            </button>
            <div>
              <p className="eyebrow">Workspace</p>
              <h1>{activeNav}</h1>
            </div>
          </div>

          <div className="topbar-actions">
            <label className="search-field">
              <span className="search-icon">⌕</span>
              <input
                type="search"
                placeholder="Search student..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <select className="session-select" defaultValue="2024/2025 Session">
              <option>2024/2025 Session</option>
              <option>2023/2024 Session</option>
              <option>2022/2023 Session</option>
            </select>
          </div>
        </header>

        {showSummary ? (
          <section className="summary-grid" id="overview-section">
            {summaryCards.map((card) => (
              <article className="summary-card" key={card.label}>
                <div className={card.iconClass}>{card.icon}</div>
                <div>
                  <strong>{card.value}</strong>
                  <span>{card.label}</span>
                  <p>{card.note}</p>
                </div>
              </article>
            ))}
          </section>
        ) : null}

        <div className={`dashboard-grid ${!hasMainContent || !hasSideContent ? "single-page" : ""}`}>
          {hasMainContent ? (
          <section className="content-column">
            {showHero ? (
            <article className="card hero-card" id="prediction-section">
              <div className="card-header hero-header">
                <div>
                  <p className="section-label">Student Performance Prediction</p>
                  <h2>{heroRecord.student_name}</h2>
                  <div className="hero-meta">
                    <span>Matric No: {heroRecord.student_id || "N/A"}</span>
                    <span>Department: {heroRecord.department || "N/A"}</span>
                    <span>Level: {heroRecord.level || "N/A"}</span>
                  </div>
                </div>
                <button type="button" className="primary-button" onClick={() => scrollToSection("prediction-form", "Prediction")}>
                  Predict Again
                </button>
              </div>

              {error ? <div className="message error">{error}</div> : null}

              <div className="hero-body">
                <div className="hero-avatar">{studentInitials(heroRecord.student_name)}</div>
                <div className="hero-score-block">
                  <span>Predicted GPA</span>
                  <strong>
                    {formatGpa(heroGpa)} <small>/ 5.00</small>
                  </strong>
                  <p>{heroMeta.badge}</p>
                </div>
                <div className="hero-stat">
                  <span>Performance Category</span>
                  <strong>{heroMeta.label}</strong>
                  <p>{heroMeta.note}</p>
                </div>
                <div className="hero-stat">
                  <span>Risk Level</span>
                  <strong>{deriveRiskLevel(heroCategory)}</strong>
                  <p>Continue current effort</p>
                </div>
              </div>
            </article>
            ) : null}

            {showIndicators ? (
            <section className="indicator-grid">
              {indicatorDefs.map((item) => (
                <article className="indicator-card" key={item.label}>
                  <div className="indicator-head">
                    <div>
                      <span>{item.label}</span>
                      <strong>{Math.round(item.value)}%</strong>
                    </div>
                    <p>{item.status}</p>
                  </div>
                  <Sparkline values={item.values.length ? item.values : [item.value]} color={item.color} />
                </article>
              ))}
            </section>
            ) : null}

            {showAnalytics ? (
            <section className="analytics-grid" id="analytics-section">
              <article className="card chart-card">
                <div className="card-header">
                  <div>
                    <p className="section-label">Performance Trend</p>
                    <h2>Recent Records</h2>
                  </div>
                  <span className="muted">Recent 4 records</span>
                </div>
                <TrendChart labels={trendLabels} series={trendSeries} />
                <div className="chart-legend">
                  {trendSeries.map((item) => (
                    <span key={item.label} className={item.dashed ? "legend-dashed" : ""}>
                      <i style={{ background: item.color }} />
                      {item.label}
                    </span>
                  ))}
                </div>
              </article>

              <article className="card donut-card">
                <div className="card-header">
                  <div>
                    <p className="section-label">Prediction Distribution</p>
                    <h2>Model spread</h2>
                  </div>
                </div>
                <DonutChart items={donutItems} total={totalStoredStudents} />
              </article>
            </section>
            ) : null}

            {showPredictionForm ? (
            <article className="card form-card" id="prediction-form">
              <div className="card-header">
                <div>
                  <p className="section-label">Live prediction</p>
                  <h2>Student data entry</h2>
                </div>
                <div className="mini-status">
                  <span>Prediction</span>
                  <strong>{result?.predicted_category ?? heroMeta.label}</strong>
                </div>
              </div>

              <form className="predict-form" onSubmit={onSubmit}>
                <div className="form-section">
                  <div className="form-section-header">
                    <p className="section-label">Performance data</p>
                    <h3>Assessment inputs</h3>
                  </div>
                  <div className="form-grid">
                    {performanceFields.map(([key, label, type, step]) => (
                      <label className="form-field" key={key}>
                        <span>{label}</span>
                        <input
                          type={type}
                          step={step}
                          min={key === "previous_gpa" ? "0" : "0"}
                          value={form[key]}
                          onChange={(event) => onChange(key, event.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-header">
                    <p className="section-label">Student details</p>
                    <h3>Identity inputs</h3>
                  </div>
                  <div className="form-grid">
                    {studentFields.map(([key, label, type, step]) => {
                      if (key === "department") {
                        return (
                          <label className="form-field" key={key}>
                            <span>{label}</span>
                            <select value={form.department} onChange={(event) => onChange("department", event.target.value)}>
                              {departments.map((department) => (
                                <option key={department} value={department}>
                                  {department}
                                </option>
                              ))}
                            </select>
                          </label>
                        );
                      }

                      if (key === "level") {
                        return (
                          <label className="form-field" key={key}>
                            <span>{label}</span>
                            <select value={form.level} onChange={(event) => onChange("level", event.target.value)}>
                              {[100, 200, 300, 400, 500].map((level) => (
                                <option key={level} value={level}>
                                  {level}
                                </option>
                              ))}
                            </select>
                          </label>
                        );
                      }

                      return (
                        <label className="form-field" key={key}>
                          <span>{label}</span>
                          <input
                            type={type}
                            step={step}
                            value={form[key]}
                            onChange={(event) => onChange(key, event.target.value)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button type="submit" className="cta-button" disabled={loading}>
                  {loading ? "Analyzing..." : "Run prediction"}
                </button>
              </form>
            </article>
            ) : null}

            {showRecords ? (
            <article className="card records-card" id="records-section">
              <div className="card-header">
                <div>
                  <p className="section-label">Student Records</p>
                  <h2>Recent records</h2>
                </div>
                <div className="card-actions">
                  <button type="button" className="text-button" onClick={() => setShowAllRecords((current) => !current)}>
                    {recentRecordsButtonLabel}
                  </button>
                  <button type="button" className="text-button danger-button" onClick={resetAllData}>
                    Reset all data
                  </button>
                </div>
              </div>

              <p className="upload-help">
                {showAllRecords
                  ? `Showing all ${searchableRecords.length} record${searchableRecords.length === 1 ? "" : "s"}`
                  : `Showing ${recentRecords.length} of ${searchableRecords.length} record${searchableRecords.length === 1 ? "" : "s"}`}
              </p>

              <div className="record-list">
                {recentRecords.length ? (
                  recentRecords.map((record) => {
                    const category = deriveCategory(record);
                    const meta = categoryMeta(category);
                    return (
                      <button
                        key={record.id}
                        type="button"
                        className="record-row"
                        onClick={() => openRecordModal(record)}
                      >
                        <div className="record-avatar">{studentInitials(record.student_name)}</div>
                        <div className="record-main">
                          <strong>{record.student_name}</strong>
                          <span>{record.student_id}</span>
                        </div>
                        <div className="record-side">
                          <strong>{formatGpa(clamp(buildPerformanceScore(record) / 20, 0, 5))}</strong>
                          <span className={`pill ${meta.tone}`}>{category}</span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="records-empty">No saved student records yet.</div>
                )}
              </div>
            </article>
            ) : null}
          </section>
          ) : null}

          {hasSideContent ? (
          <aside className="side-column">
            {showUpload ? (
            <article className="card side-card" id="upload-section">
              <div className="card-header">
                <div>
                  <p className="section-label">Bulk Upload</p>
                  <h2>Excel records</h2>
                </div>
              </div>

              <form className="upload-form" onSubmit={onUpload}>
                <p className="upload-help">
                  Upload the Excel file with student data. The system will analyze every row and add the results to the dashboard.
                </p>

                <label className="upload-field">
                  <span>Select file</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                  />
                </label>

                <div className="upload-file-name">{uploadFile ? uploadFile.name : "No file selected yet"}</div>

                <button type="submit" className="upload-button" disabled={uploading}>
                  {uploading ? "Uploading..." : "Upload Excel"}
                </button>

                {uploadMessage ? <p className="upload-message">{uploadMessage}</p> : null}
              </form>
            </article>
            ) : null}

            {showAlerts ? (
            <article className="card side-card" id="risk-section">
              <div className="card-header">
                <div>
                  <p className="section-label">Top At-Risk Students</p>
                  <h2>Attention list</h2>
                </div>
                <button type="button" className="text-button">View all</button>
              </div>

              <div className="at-risk-list">
                {riskRecords.length ? (
                  riskRecords.map((record) => {
                    const category = deriveCategory(record);
                    const meta = categoryMeta(category);
                    const predictedGpa = clamp(buildPerformanceScore(record) / 20, 0, 5);
                    return (
                      <button key={record.id} type="button" className="risk-row" onClick={() => openRecordModal(record)}>
                        <div className="record-avatar small">{studentInitials(record.student_name)}</div>
                        <div className="risk-main">
                          <strong>{record.student_name}</strong>
                        </div>
                        <div className="risk-side">
                          <span className={`pill ${meta.tone}`}>{deriveRiskLevel(category)}</span>
                          <small>Predicted GPA: {predictedGpa.toFixed(2)}</small>
                          <small className="risk-id">{record.student_id}</small>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="records-empty">No at-risk students yet.</div>
                )}
              </div>
            </article>
            ) : null}

            {showFactors ? (
            <article className="card side-card">
              <div className="card-header">
                <div>
                  <p className="section-label">Top Factors Affecting Prediction</p>
                  <h2>Signal strength</h2>
                </div>
              </div>

              <div className="factor-list">
                {factorRows.map((item) => (
                  <div className="factor-row" key={item.label}>
                    <div className="factor-title">
                      <span>{item.label}</span>
                      <strong>{Math.round(item.value)}%</strong>
                    </div>
                    <div className="factor-bar">
                      <div className="factor-fill" style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="info-banner">
                These factors are the most influential signals in the model&apos;s current analysis.
              </div>
            </article>
            ) : null}
          </aside>
          ) : null}
        </div>
      </main>

      {selectedRecord ? (
        <div className="record-modal-backdrop" onClick={closeRecordModal}>
          <div
            className="record-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="record-modal-header">
              <div>
                <p className="section-label">Student record</p>
                <h2 id="record-modal-title">{selectedRecord.student_name}</h2>
              </div>
              <button type="button" className="record-modal-close" onClick={closeRecordModal}>
                Close
              </button>
            </div>

            <div className="record-modal-grid">
              <div className="record-modal-item">
                <span>Student ID</span>
                <strong>{selectedRecord.student_id ?? "N/A"}</strong>
              </div>
              <div className="record-modal-item">
                <span>Department</span>
                <strong>{selectedRecord.department ?? "N/A"}</strong>
              </div>
              <div className="record-modal-item">
                <span>Level</span>
                <strong>{selectedRecord.level ?? "N/A"}</strong>
              </div>
              <div className="record-modal-item">
                <span>Previous GPA</span>
                <strong>{selectedRecord.previous_gpa ?? "N/A"}</strong>
              </div>
              <div className="record-modal-item">
                <span>Attendance</span>
                <strong>{selectedRecord.attendance_percentage ?? "N/A"}</strong>
              </div>
              <div className="record-modal-item">
                <span>Exam score</span>
                <strong>{selectedRecord.assignment_score ?? "N/A"}</strong>
              </div>
              <div className="record-modal-item">
                <span>Quiz score</span>
                <strong>{selectedRecord.quiz_score ?? "N/A"}</strong>
              </div>
              <div className="record-modal-item">
                <span>Test score</span>
                <strong>{selectedRecord.test_score ?? "N/A"}</strong>
              </div>
              <div className="record-modal-item">
                <span>Continuous assessment</span>
                <strong>{selectedRecord.ca_score ?? "N/A"}</strong>
              </div>
              <div className="record-modal-item">
                <span>Missed classes</span>
                <strong>{selectedRecord.missed_classes ?? "N/A"}</strong>
              </div>
              <div className="record-modal-item">
                <span>LMS engagement</span>
                <strong>{selectedRecord.lms_engagement ?? "N/A"}</strong>
              </div>
              <div className="record-modal-item">
                <span>Study hours</span>
                <strong>{selectedRecord.study_hours ?? "N/A"}</strong>
              </div>
              <div className="record-modal-item">
                <span>Prediction</span>
                <strong>{selectedRecord.predicted_category ?? "N/A"}</strong>
              </div>
              <div className="record-modal-item">
                <span>Confidence</span>
                <strong>{formatPercent(selectedRecord.confidence)}</strong>
              </div>
              <div className="record-modal-item">
                <span>Created at</span>
                <strong>{selectedRecord.created_at ?? "N/A"}</strong>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
