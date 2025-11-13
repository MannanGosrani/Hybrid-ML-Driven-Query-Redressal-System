/**
 * ML Classification Service
 * 
 * This module provides ticket classification using either:
 * 1. External ML API (if ML_API_URL is configured)
 * 2. Local keyword-based heuristic (free, no API required)
 */

interface ClassificationResult {
  predicted_category: string;
  confidence: number;
}

// Department code mapping for classification
const CATEGORY_MAPPINGS: Record<string, { keywords: string[]; code: string }> = {
  FEES: {
    keywords: ['fees', 'payment', 'challan', 'tuition', 'scholarship', 'refund', 'billing'],
    code: 'FEES'
  },
  IT_SUPPORT: {
    keywords: ['wifi', 'portal', 'lms', 'blackboard', 'login', 'email', 'password', 'internet', 'network', 'moodle'],
    code: 'IT_SUPPORT'
  },
  LIB: {
    keywords: ['library', 'book', 'issue', 'return', 'borrow', 'journal', 'reading'],
    code: 'LIB'
  },
  HOSTEL: {
    keywords: ['hostel', 'room', 'mess', 'accommodation', 'dorm', 'residence'],
    code: 'HOSTEL'
  },
  EXAMS: {
    keywords: ['exam', 'grade', 'revaluation', 'marks', 'result', 'assessment', 'test'],
    code: 'EXAMS'
  },
  ACAD_OFFICE: {
    keywords: ['timetable', 'course', 'faculty', 'schedule', 'syllabus', 'curriculum', 'academic'],
    code: 'ACAD_OFFICE'
  },
  SECURITY: {
    keywords: ['id card', 'security', 'gate', 'access', 'entry', 'badge'],
    code: 'SECURITY'
  },
  INFRA: {
    keywords: ['maintenance', 'ac', 'lift', 'classroom', 'infrastructure', 'repair', 'fan', 'light', 'toilet'],
    code: 'INFRA'
  },
  PLACEMENT: {
    keywords: ['placement', 'job', 'recruitment', 'interview', 'company'],
    code: 'PLACEMENT'
  },
  INTERNSHIPS: {
    keywords: ['internship', 'intern', 'industry project', 'summer training'],
    code: 'INTERNSHIPS'
  },
  SPORTS: {
    keywords: ['sports', 'gym', 'fitness', 'athletic', 'tournament', 'game'],
    code: 'SPORTS'
  },
  CULTURAL: {
    keywords: ['cultural', 'fest', 'event', 'performance', 'club activity'],
    code: 'CULTURAL'
  },
  STU_COUNCIL: {
    keywords: ['council', 'student body', 'representation', 'mpstme'],
    code: 'STU_COUNCIL'
  },
  LABS: {
    keywords: ['lab', 'laboratory', 'equipment', 'experiment', 'practical'],
    code: 'LABS'
  },
  TRANSPORT: {
    keywords: ['bus', 'transport', 'shuttle', 'commute', 'vehicle'],
    code: 'TRANSPORT'
  },
  CANTEEN: {
    keywords: ['canteen', 'cafeteria', 'food', 'mess', 'dining'],
    code: 'CANTEEN'
  },
};

/**
 * Local keyword-based classification (free, no API required)
 */
function classifyLocally(title: string, body: string): ClassificationResult {
  const text = `${title} ${body}`.toLowerCase();
  
  const scores: Record<string, number> = {};
  
  // Calculate match scores for each category
  for (const [category, { keywords }] of Object.entries(CATEGORY_MAPPINGS)) {
    let score = 0;
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        score += matches.length;
      }
    }
    scores[category] = score;
  }
  
  // Find category with highest score
  let maxScore = 0;
  let predictedCategory = 'ACAD_OFFICE'; // default fallback
  
  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      predictedCategory = category;
    }
  }
  
  // Calculate confidence based on match strength
  const totalWords = text.split(/\s+/).length;
  const confidence = Math.min(0.9, 0.65 + (maxScore / totalWords) * 0.25);
  
  return {
    predicted_category: predictedCategory,
    confidence: Number(confidence.toFixed(2))
  };
}

/**
 * External ML API classification
 */
async function classifyWithAPI(title: string, body: string): Promise<ClassificationResult> {
  const ML_API_URL = import.meta.env.VITE_ML_API_URL;
  const ML_API_KEY = import.meta.env.VITE_ML_API_KEY;
  
  if (!ML_API_URL) {
    throw new Error('ML_API_URL not configured');
  }
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (ML_API_KEY) {
    headers['Authorization'] = `Bearer ${ML_API_KEY}`;
  }
  
  // Use title as the query for the HF Space API
  const query = title;
  
  const response = await fetch(ML_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('ML API error:', response.status, errorText);
    throw new Error(`ML API error: ${response.status}`);
  }
  
  const result = await response.json();
  console.log('ML API Response:', result);
  
  // Return the department name directly from API
  // The frontend will look up the department by name in the database
  return {
    predicted_category: result.department,
    confidence: result.confidence || 0.85
  };
}

/**
 * Main classification function
 * Automatically uses external API if configured, otherwise uses local heuristic
 */
export async function classifyTicket(params: {
  title: string;
  body: string;
}): Promise<ClassificationResult> {
  const { title, body } = params;
  
  // Check if external ML API is configured
  const ML_API_URL = import.meta.env.VITE_ML_API_URL;
  
  if (ML_API_URL) {
    try {
      return await classifyWithAPI(title, body);
    } catch (error) {
      console.warn('ML API call failed, falling back to local classification:', error);
      return classifyLocally(title, body);
    }
  }
  
  // Use local classification by default
  return classifyLocally(title, body);
}
