"""
NMIMS MPSTME Grievance Classification API
Hierarchical ML model with database code mapping
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import spacy
import re
from typing import Dict, Tuple
import uvicorn

# ============= MODEL LOADING =============
print("Loading models...")
try:
    nlp = spacy.load("en_core_web_sm")
    broad_clf = joblib.load("broad_classifier.pkl")
    admin_clf = joblib.load("admin_classifier.pkl")
    tech_clf = joblib.load("tech_classifier.pkl")
    print("✓ All models loaded successfully")
except Exception as e:
    print(f"ERROR loading models: {e}")
    raise

# ============= DEPARTMENT CODE MAPPING =============
# Maps ML model predictions (34 categories) to database codes (32 departments)
DEPT_CODE_MAP: Dict[str, str] = {
    # Academic & Administration
    "Academics / Program Office": "ACAD_OFFICE",
    "Examination Cell": "EXAMS",
    "Registrar / Administration": "REG_ADMIN",
    "Dean's Office": "DEAN",
    
    # Engineering Departments
    "Computer Engineering Department": "CSE",
    "IT Engineering Department": "IT_ENG",
    "AI & Data Science Department": "AIDS",
    "Electronics & Telecommunication Department": "EXTC",
    "Mechanical/Mechatronics Department": "MECH",
    "Civil Engineering Department": "CIVIL",
    
    # Engineering Specializations → Main departments
    "Computer Engineering": "CSE",
    "IT Engineering": "IT_ENG",
    "AI & Data Science": "AIDS",
    "Electronics Engineering": "EXTC",
    "Mechanical Engineering": "MECH",
    "CSBS": "CSE",  # Computer Science & Business Systems
    "Cyber Security": "CSE",
    
    # Finance & Fees
    "Accounts / Fees Department": "FEES",
    "Scholarship & Financial Aid Office": "SCHOLAR",
    
    # Learning & Student Support
    "Library": "LIB",
    "IT Support / LMS": "IT_SUPPORT",
    "Laboratories & Technical Support": "LABS",
    "Computer Lab": "LABS",
    "Electronics Lab": "LABS",
    
    # Campus & Facilities
    "Hostel Office": "HOSTEL",
    "Transport Office": "TRANSPORT",
    "Canteen / Cafeteria Services": "CANTEEN",
    "Infrastructure & Maintenance": "INFRA",
    "Security Office / ID Card Cell": "SECURITY",
    
    # Student Experience
    "Student Council (MPSTME)": "STU_COUNCIL",
    "Cultural Committee": "CULTURAL",
    "Sports Committee": "SPORTS",
    "Clubs & Chapters": "CLUBS",
    "IEEE Student Branch": "CLUBS",
    "CSI Chapter": "CLUBS",
    "NSS / Social Service Cell": "NSS",
    "Anti-Ragging / Discipline Committee": "DISCIPLINE",
    
    # Career & External Relations
    "Placement Cell / Corporate Relations": "PLACEMENT",
    "Internship & Industry Projects Office": "INTERNSHIPS",
    "Alumni Relations Office": "ALUMNI",
    "Entrepreneurship Cell (I-Cell)": "ICELL",
    
    # Well-being & Special Services
    "Counseling & Student Wellness Cell": "COUNSEL",
    "Equal Opportunity / Gender Cell": "EOGC",
    
    # Fallback
    "Other": "ACAD_OFFICE"
}

# ============= TEXT PREPROCESSING =============
def preprocess_text(text: str) -> str:
    """
    Preprocess text using spaCy (matches training preprocessing)
    - Lowercase
    - Remove special characters
    - Lemmatization
    - Remove stopwords
    """
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', '', text)
    
    doc = nlp(text)
    tokens = [
        token.lemma_ 
        for token in doc 
        if not token.is_stop and not token.is_punct and len(token.text) > 2
    ]
    
    return ' '.join(tokens)

# ============= RULE-BASED ROUTING =============
def rule_based_exam_router(title: str, body: str) -> str | None:
    """
    Rule-based routing for specific patterns
    Returns department name (not code) if matched, None otherwise
    """
    text = f"{title} {body}".lower()
    
    # Exam-related queries
    exam_keywords = [
        'exam', 'examination', 'grade', 'marks', 'revaluation', 
        'result', 'assessment', 'test', 'quiz', 'midterm', 'final'
    ]
    if any(keyword in text for keyword in exam_keywords):
        return "Examination Cell"
    
    # IT Support (WiFi, Portal, LMS)
    it_keywords = [
        'wifi', 'portal', 'lms', 'blackboard', 'moodle', 
        'login', 'password', 'email', 'network', 'internet'
    ]
    if any(keyword in text for keyword in it_keywords):
        return "IT Support / LMS"
    
    # Fees and payments
    fee_keywords = ['fee', 'payment', 'challan', 'scholarship', 'refund']
    if any(keyword in text for keyword in fee_keywords):
        return "Accounts / Fees Department"
    
    return None

# ============= HIERARCHICAL ML CLASSIFICATION =============
def predict_department(title: str, body: str) -> Tuple[str, float]:
    """
    Hierarchical classification with department code mapping
    
    Returns:
        (department_code, confidence): e.g. ("CSE", 0.87)
    """
    # Step 1: Rule-based check
    rule_dept = rule_based_exam_router(title, body)
    if rule_dept:
        dept_code = DEPT_CODE_MAP.get(rule_dept, "ACAD_OFFICE")
        return dept_code, 0.95  # High confidence for rule-based
    
    # Step 2: Preprocess text
    combined_text = f"{title} {body}"
    processed = preprocess_text(combined_text)
    
    # Step 3: Broad classification (Admin vs Tech)
    broad_pred = broad_clf.predict([processed])[0]
    
    # Step 4: Specialized classification
    if broad_pred == "Admin":
        dept_name = admin_clf.predict([processed])[0]
        decision_vals = admin_clf.decision_function([processed])[0]
    else:  # Tech
        dept_name = tech_clf.predict([processed])[0]
        decision_vals = tech_clf.decision_function([processed])[0]
    
    # Step 5: Calculate confidence
    # For multi-class SVM, decision_function returns array of scores
    if isinstance(decision_vals, (list, tuple)) or hasattr(decision_vals, '__iter__'):
        max_score = max(decision_vals)
        second_max = sorted(decision_vals)[-2] if len(decision_vals) > 1 else 0
        margin = max_score - second_max
        confidence = min(0.95, 0.60 + (margin / 10))
    else:
        confidence = 0.75  # Default for binary classification
    
    # Step 6: Map to database code
    dept_code = DEPT_CODE_MAP.get(dept_name, "ACAD_OFFICE")
    
    return dept_code, round(confidence, 2)

# ============= FASTAPI SETUP =============
app = FastAPI(
    title="NMIMS Grievance Classifier",
    description="Hierarchical ML classification API for NMIMS MPSTME grievances",
    version="2.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============= REQUEST/RESPONSE MODELS =============
class ClassifyRequest(BaseModel):
    title: str
    body: str

class ClassifyResponse(BaseModel):
    predicted_category: str  # Department code (e.g., "CSE", "FEES")
    confidence: float

# ============= API ENDPOINTS =============
@app.get("/")
def root():
    """API health check"""
    return {
        "status": "online",
        "model": "Hierarchical SVM Classifier",
        "version": "2.0",
        "departments": len(DEPT_CODE_MAP),
        "endpoints": {
            "classify": "/classify",
            "health": "/health"
        }
    }

@app.get("/health")
def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "models_loaded": {
            "broad_classifier": broad_clf is not None,
            "admin_classifier": admin_clf is not None,
            "tech_classifier": tech_clf is not None,
            "spacy": nlp is not None
        },
        "total_departments": len(DEPT_CODE_MAP)
    }

@app.post("/classify", response_model=ClassifyResponse)
def classify_ticket(request: ClassifyRequest):
    """
    Classify a grievance ticket and return department code
    
    Example Request:
    {
        "title": "WiFi not working in library",
        "body": "I cannot connect to the campus WiFi in the library area"
    }
    
    Example Response:
    {
        "predicted_category": "IT_SUPPORT",
        "confidence": 0.95
    }
    """
    try:
        dept_code, confidence = predict_department(request.title, request.body)
        
        return ClassifyResponse(
            predicted_category=dept_code,
            confidence=confidence
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Classification error: {str(e)}"
        )

# ============= RUN SERVER =============
if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=7860,  # Default Hugging Face Space port
        log_level="info"
    )
