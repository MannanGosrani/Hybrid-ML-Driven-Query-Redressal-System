# NMIMS Grievance Redressal System - Complete Setup Guide

## 🎯 Overview
A complete grievance management system built for NMIMS with React + Vite (frontend) and Supabase (backend). Features role-based access, ML-powered ticket routing, real-time updates, and comprehensive ticket management.

## 📋 Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage, RLS)
- **Routing**: React Router v6
- **ML**: Local keyword-based stub (switchable to external API)
- **Validation**: Zod
- **Date/Time**: Day.js (Asia/Kolkata timezone)

## ⚙️ Prerequisites
1. Node.js 18+ installed
2. Create a Supabase project at https://supabase.com

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create `.env.local` in project root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Optional: External ML API (if not set, uses local keyword classification)
# VITE_ML_API_URL=https://your-ml-api.com/classify
# VITE_ML_API_KEY=your_ml_api_key
```

Get these values from your Supabase project settings.

### 3. Run SQL Migrations

⚠️ **IMPORTANT**: Run these in order in your Supabase SQL Editor

Copy the complete SQL from `SQL_MIGRATIONS.md` and run each migration sequentially.

**Quick checklist:**
- ✅ Migration 1: Initial Schema (tables, types, triggers)
- ✅ Migration 2: RLS Policies (security)
- ✅ Migration 3: Seed Departments (32 departments)
- ✅ Migration 4: Storage Setup (file attachments bucket)

### 4. Optional: Disable Email Confirmation for Testing
In Supabase Dashboard:
1. Go to **Authentication** → **Providers** → **Email**
2. Disable **"Confirm email"** checkbox
3. Click **Save**

This allows immediate login during development without email verification.

### 5. Run Development Server
```bash
npm run dev
```

Visit http://localhost:5173

## 👥 Creating Demo Accounts

Since migrations don't create user accounts, you'll need to sign up manually:

### Main Admin
1. Go to http://localhost:5173/auth/teacher/sign-up
2. Sign up with:
   - Email: `main.admin@nmims.edu`
   - Password: `Admin@12345`
   - Full Name: `Main Administrator`

3. In Supabase SQL Editor, run:
```sql
UPDATE profiles 
SET role = 'main_admin' 
WHERE email = 'main.admin@nmims.edu';
```

### Department Admins
Repeat for each dept admin:

**IT Support Admin:**
```sql
-- Sign up first via /auth/teacher/sign-up as it.admin@nmims.edu / Dept@12345
UPDATE profiles 
SET role = 'dept_admin',
    department_id = (SELECT id FROM departments WHERE code = 'IT_SUPPORT')
WHERE email = 'it.admin@nmims.edu';
```

**Fees Department Admin:**
```sql
UPDATE profiles 
SET role = 'dept_admin',
    department_id = (SELECT id FROM departments WHERE code = 'FEES')
WHERE email = 'fees.admin@nmims.edu';
```

**Academic Office Admin:**
```sql
UPDATE profiles 
SET role = 'dept_admin',
    department_id = (SELECT id FROM departments WHERE code = 'ACAD_OFFICE')
WHERE email = 'acad.admin@nmims.edu';
```

### Test Student
Sign up normally via `/auth/student/sign-up` - no SQL changes needed!

## 🤖 ML Classification System

### Default: Local Keyword Matching (Free, No Setup)
The system uses intelligent keyword matching out of the box:

**Examples:**
- "Cannot access LMS portal" → **IT Support**
- "Fee payment issue" → **Accounts/Fees** 
- "Library book not available" → **Library**
- "Hostel room AC broken" → **Hostel Office**

Works for all 32 departments automatically!

### Optional: External ML API
For production use with a trained model:

1. Deploy your ML model as REST API (Python FastAPI example):

```python
# main.py
from fastapi import FastAPI, Header
from pydantic import BaseModel

app = FastAPI()

class ClassifyRequest(BaseModel):
    title: str
    body: str

@app.post("/classify")
def classify(
    req: ClassifyRequest,
    authorization: str = Header(None)
):
    # Your model logic here (TensorFlow, PyTorch, etc.)
    # Must return department CODE (not name)
    
    return {
        "predicted_category": "IT_SUPPORT",  # Department CODE
        "confidence": 0.87
    }
```

2. Deploy to Render/Railway/Deta (free tiers available)

3. Update `.env.local`:
```env
VITE_ML_API_URL=https://your-app.onrender.com/classify
VITE_ML_API_KEY=your_secret_token
```

**API Contract:**
- **Request**: `POST /classify` with `{ title, body }`
- **Response**: `{ predicted_category: "DEPT_CODE", confidence: 0.0-1.0 }`
- **Auth**: Optional Bearer token in `Authorization` header

## 📦 Deployment

### Vercel (Recommended)
```bash
# Build
npm run build

# Deploy
vercel
```

Set environment variables in Vercel dashboard.

### Netlify
```bash
npm run build
netlify deploy --prod
```

## 🏗️ Project Structure
```
src/
├── components/
│   ├── ui/              # shadcn components
│   ├── Layout.tsx       # App layout with header
│   ├── ProtectedRoute.tsx
│   └── StatusBadge.tsx
├── hooks/
│   └── useAuth.tsx      # Authentication hook
├── lib/
│   ├── supabase.ts      # Supabase client & types
│   ├── auth.ts          # Auth helpers
│   ├── ml.ts            # ML classification
│   └── ticketHelpers.ts
├── pages/
│   ├── auth/            # Sign in/up pages
│   ├── student/         # Student dashboard & tickets
│   ├── Index.tsx        # Root (redirects by role)
│   └── WelcomePage.tsx  # Landing page
└── App.tsx
```

## 🎯 Features Implemented

### ✅ Student/Teacher Portal
- Create tickets with ML auto-classification
- View ticket list with filters (status, priority, search)
- Ticket detail with timeline
- Add public comments
- Reopen resolved/closed tickets
- Real-time prediction confidence display

### ✅ Security
- Row-level security (RLS) on all tables
- Role-based access control (4 roles)
- Input validation with Zod
- Protected routes
- Secure file storage

### ⏳ Upcoming (Next Steps)
- Dept Admin dashboard & inbox
- Main Admin analytics & user management
- File attachment uploads
- Email notifications
- Advanced analytics charts

## 🔧 Troubleshooting

### "Missing environment variables"
- Check `.env.local` exists and has correct Supabase URL/key
- Restart dev server after creating `.env.local`

### "Cannot find module '@supabase/supabase-js'"
```bash
npm install
```

### "403 Forbidden" or "Row violates RLS"
- Check RLS policies are created (Migration 2)
- Verify user role in `profiles` table
- Check Supabase logs for detailed error

### Tickets not routing correctly
- Verify all 32 departments exist (Migration 3)
- Check department `code` values match ML output

## 📚 Documentation

- **SQL Migrations**: See `SQL_MIGRATIONS.md` for complete database schema
- **API Docs**: Supabase auto-generated docs in your project dashboard
- **Components**: shadcn/ui docs at https://ui.shadcn.com

## 🆘 Support

For issues:
1. Check browser console for errors
2. Check Supabase logs (Supabase Dashboard → Logs)
3. Verify environment variables
4. Ensure all migrations ran successfully

## 📄 License
MIT - NMIMS Internal Use
