Hybrid ML-Driven Query Redressal System

Live Demo: https://nmims-grievance.vercel.app/

Overview

A Hybrid Machine Learning–based Query Redressal System for higher educational institutions. It classifies student queries, routes them to the correct department, and provides an interface for students and admins to manage grievances. The system uses Logistic Regression, Random Forest, and SVM in a hybrid ensemble for improved accuracy.

Features

Automated query classification

Hybrid ML ensemble (LR, RF, SVM)

Student submission portal

Admin dashboard for query management

Status tracking

Scalable deployment on Vercel

Tech Stack

Frontend: React, Vite, Tailwind
Backend: Flask, Python, Scikit-learn
Database: MongoDB Atlas
Deployment: Vercel (frontend), Flask server for backend

Setup Instructions
Clone Repository
git clone https://github.com/your-username/repo-name.git
cd repo-name

Backend
cd backend
pip install -r requirements.txt
python app.py

Frontend
cd frontend
npm install
npm run dev

Project Structure
├── frontend/
├── backend/
│   ├── app.py
│   ├── model.pkl
│   ├── vectorizer.pkl
└── README.md

Contributors

Jignesh Desai
Rachit Khatri
Jahnvi Arora
Mannan Gosrani
Poulami Das

License

MIT License
