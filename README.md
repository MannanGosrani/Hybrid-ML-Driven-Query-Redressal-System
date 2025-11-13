# Hybrid ML-Driven Query Redressal System

Live Demo: https://nmims-grievance.vercel.app/

## Overview
This project implements a Hybrid Machine Learning–based Query Redressal System designed for higher educational institutions. It automates the classification of student grievances, routes them to the appropriate department, and provides dedicated interfaces for both students and administrators. The system uses Logistic Regression, Random Forest, and Support Vector Machine models combined through a hybrid ensemble to enhance accuracy and robustness. The platform is scalable, deployment-ready, and built for real-world academic use.

## Features
- Automated classification of student queries using hybrid ML models  
- Ensemble of LR, RF, and SVM for improved accuracy  
- Student portal to submit grievances and track their status  
- Admin dashboard for managing, categorizing, and resolving grievances  
- Real-time status updates and notifications  
- Secure and modular backend API built with Flask  
- Clean and responsive UI developed using React and Tailwind CSS  
- Architecture designed for easy model retraining and future updates  

## Tech Stack

### Frontend
- React  
- Vite  
- Tailwind CSS  
- Axios  

### Backend
- Flask (Python)  
- Scikit-learn  
- Pandas / NumPy  
- TF-IDF vectorizer  
- Machine Learning models (LR, RF, SVM)
- API hosted on HiggingFace

### Database
- Supabase 

### Deployment
- Vercel (Frontend)  

## Machine Learning Workflow
- Text cleaning and preprocessing  
- TF-IDF vectorization for textual data  
- Training three separate ML classifiers  
- Hybrid ensemble prediction using weighted or majority voting  
- Exported `.pkl` models for production-ready inference  
- Evaluation using accuracy and confusion matrix

## Use Cases
- Automating institutional grievance handling  
- Categorizing student issues for improved routing  
- Reducing administrative workload  
- Increasing transparency and response efficiency  

## Contributors
Jignesh Desai  
Rachit Khatri  
Jahnvi Arora  
Mannan Gosrani  
Poulami Das  

## License
MIT License  
You may use, modify, and distribute this project with proper attribution.

## Setup Instructions 
- Go through the SETUP.md file

### Clone Repository
```bash
git clone https://github.com/your-username/Hybrid-ML-Driven-Query-Redressal-System.git
cd Hybrid-ML-Driven-Query-Redressal-System
