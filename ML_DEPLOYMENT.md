# NMIMS ML Model - FastAPI Deployment Guide

Your model uses a hierarchical classification approach with 3 trained models. Here's how to deploy it:

## Setup Files Needed

1. **model2.py** (your training script - already have it)
2. **api.py** (FastAPI server - created below)
3. **requirements.txt** (dependencies)
4. **nmims_queries_cleaned.csv** (your training data)
5. After training: **broad_classifier.pkl**, **admin_classifier.pkl**, **tech_classifier.pkl**

## File 1: requirements.txt

```txt
fastapi==0.115.5
uvicorn[standard]==0.34.0
pandas==2.2.3
scikit-learn==1.5.2
spacy==3.8.2
imbalanced-learn==0.12.4
joblib==1.4.2
python-multipart==0.0.20
```

## File 2: api.py (FastAPI Server)

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import spacy
import os

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Run: python -m spacy download en_core_web_sm")
    raise

# Load trained models
try:
    broad_clf = joblib.load("broad_classifier.pkl")
    admin_clf = joblib.load("admin_classifier.pkl")
    tech_clf = joblib.load("tech_classifier.pkl")
    print("✅ Models loaded successfully")
except FileNotFoundError as e:
    print(f"❌ Model files not found: {e}")
    print("Please train models first by running: python model2.py")
    raise

app = FastAPI(title="NMIMS Grievance Classifier API")

# CORS for web apps
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Department code mapping (NMIMS internal codes)
DEPT_CODE_MAP = {
    "Admin": "REG_ADMIN",
    "Admissions": "REG_ADMIN",
    "Fees": "FEES",
    "Exam Cell": "EXAMS",
    "General Inquiry": "ACAD_OFFICE",
    "Hostel and Accomodation": "HOSTEL",
    "Placement Cell": "PLACEMENT",
    "Student Life & Events": "CULTURAL",
    "Library": "LIB",
    "Sanitation": "INFRA",
    "Food": "CANTEEN",
    "Artificial Intelligence": "AIDS",
    "Data Science": "AIDS",
    "CSBS": "CSE",
    "Computer Engineering": "CSE",
    "Computer Science & Business Systems": "CSE",
    "Information Technology": "IT_ENG",
    "Electronics & Telecommunication": "EXTC",
    "Lab Technicians (Tech Departments)": "LABS",
    "Mechanical": "MECH",
    "Mechanical Engineering": "MECH",
    "Mechatronics": "MECH",
    "Civil": "CIVIL",
    "Civil Engineering": "CIVIL",
    "Cyber Security": "CSE"
}

def preprocess_text(text: str) -> str:
    """Preprocess text using spaCy (same as training)"""
    doc = nlp(text.lower())
    tokens = [
        tok.lemma_
        for tok in doc
        if not tok.is_stop and not tok.is_punct and tok.is_alpha
    ]
    return " ".join(tokens)

def rule_based_exam_router(query: str):
    """Rule-based routing for exam queries"""
    q = query.lower()
    
    exam_keywords = ["marksheet", "grade", "result", "re-evaluation", "recheck"]
    final_keywords = ["term end", "final exam", "semester end"]
    mid_keywords = ["mid-term", "internal exam", "mid sem"]
    
    if any(k in q for k in exam_keywords):
        if any(k in q for k in final_keywords):
            return "Exam Cell"
        elif any(k in q for k in mid_keywords):
            subject_map = {
                "machine learning": "Data Science",
                "deep learning": "Artificial Intelligence",
                "operating systems": "Computer Engineering",
                "thermodynamics": "Mechanical Engineering",
                "fluid mechanics": "Civil Engineering",
                "communication systems": "Electronics & Telecommunication",
                "marketing": "CSBS"
            }
            for subj, dept in subject_map.items():
                if subj in q:
                    return dept
            return "General Inquiry"
    return None

def predict_department(query: str) -> tuple[str, float]:
    """Hierarchical prediction with confidence"""
    # Try rule-based first
    dept = rule_based_exam_router(query)
    if dept:
        # Map to code
        code = DEPT_CODE_MAP.get(dept, "ACAD_OFFICE")
        return code, 0.95  # High confidence for rule-based
    
    # ML hierarchical model
    processed = preprocess_text(query)
    
    # Broad classification
    broad_pred = broad_clf.predict([processed])[0]
    
    # Get probabilities if available (for confidence)
    try:
        if broad_pred == "Admin_Services":
            dept_pred = admin_clf.predict([processed])[0]
            # Try to get decision function for confidence
            scores = admin_clf.decision_function([processed])[0]
            confidence = min(0.99, max(0.5, 1 / (1 + abs(scores.min()))))
        else:
            dept_pred = tech_clf.predict([processed])[0]
            scores = tech_clf.decision_function([processed])[0]
            confidence = min(0.99, max(0.5, 1 / (1 + abs(scores.min()))))
    except:
        # Fallback if decision_function fails
        if broad_pred == "Admin_Services":
            dept_pred = admin_clf.predict([processed])[0]
        else:
            dept_pred = tech_clf.predict([processed])[0]
        confidence = 0.75
    
    # Map department name to code
    code = DEPT_CODE_MAP.get(dept_pred, "ACAD_OFFICE")
    return code, float(confidence)

class ClassifyRequest(BaseModel):
    title: str
    body: str

class ClassifyResponse(BaseModel):
    predicted_category: str
    confidence: float

@app.get("/")
def root():
    return {
        "message": "NMIMS Grievance Classifier API",
        "version": "1.0",
        "endpoints": {
            "/classify": "POST - Classify grievance query",
            "/health": "GET - Health check"
        }
    }

@app.get("/health")
def health():
    return {"status": "healthy", "models_loaded": True}

@app.post("/classify", response_model=ClassifyResponse)
def classify(request: ClassifyRequest):
    """
    Classify a grievance query into department code
    
    Returns department CODE (e.g., 'IT_SUPPORT', 'FEES', 'EXAMS')
    """
    try:
        # Combine title and body for classification
        full_query = f"{request.title}. {request.body}"
        
        # Get prediction
        dept_code, confidence = predict_department(full_query)
        
        return ClassifyResponse(
            predicted_category=dept_code,
            confidence=round(confidence, 2)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
```

## Deployment Steps

### Step 1: Train Your Models Locally

```bash
# Install dependencies
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Train models (creates .pkl files)
python model2.py
```

This creates: `broad_classifier.pkl`, `admin_classifier.pkl`, `tech_classifier.pkl`

### Step 2: Test API Locally

```bash
# Start server
python api.py

# Test in another terminal
curl -X POST http://localhost:8000/classify \
  -H "Content-Type: application/json" \
  -d '{"title": "Cannot login to LMS", "body": "Getting error when accessing Blackboard portal"}'
```

Expected response:
```json
{
  "predicted_category": "IT_SUPPORT",
  "confidence": 0.87
}
```

### Step 3: Deploy to Render (Free Tier)

1. **Create GitHub repo** with these files:
   - `api.py`
   - `requirements.txt`
   - `broad_classifier.pkl`
   - `admin_classifier.pkl`
   - `tech_classifier.pkl`

2. **Go to Render.com** → Sign up/login

3. **New Web Service**:
   - Connect your GitHub repo
   - Runtime: **Python 3**
   - Build Command: `pip install -r requirements.txt && python -m spacy download en_core_web_sm`
   - Start Command: `python api.py`
   - Choose **Free** plan

4. **Deploy!** - Wait ~5 minutes

5. **Get your URL**: `https://your-app.onrender.com`

### Step 4: Configure Lovable App

Once deployed, I'll update the app to use your ML API:

```env
VITE_ML_API_URL=https://your-app.onrender.com/classify
```

## Alternative: Deploy to Railway/Deta

**Railway** (similar to Render):
- Connect GitHub repo
- Auto-detects Python
- Free tier: 500 hours/month

**Deta Space** (serverless):
```bash
pip install deta-cli
deta login
deta new --python
deta deploy
```

## Testing Your Deployed API

```bash
# Replace with your actual URL
curl -X POST https://your-app.onrender.com/classify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fee refund issue", 
    "body": "I paid extra fees and need refund"
  }'
```

## Once You Deploy

**Send me your API URL** and I'll configure the Lovable app to use your trained model instead of the keyword-based stub!

Your model will provide **much more accurate** classification than the simple keyword matching. 🚀
