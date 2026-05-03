# 🧠 AI-First CRM – HCP Interaction Module

## 📌 Project Overview
This project is an AI-first CRM system designed for healthcare sales representatives to log and manage interactions with Healthcare Professionals (HCPs).

It allows users to:
- Log doctor interactions
- Use AI to process interaction data
- View past interaction history

---

## 🚀 Tech Stack

- Frontend: React
- Backend: FastAPI (Python)
- AI Framework: LangGraph
- LLM: Groq (LLaMA 3.1 / Gemma)
- Database: SQLite (can be replaced with MySQL/Postgres)

---

## 🧠 LangGraph AI Agent

The LangGraph agent processes user input through multiple tools to generate intelligent CRM outputs.

---

## 🔧 Implemented AI Tools

### 1. 📝 Log Interaction
- Stores raw interaction data
- Saves input in database

### 2. ✏️ Edit Interaction
- Improves conversation quality using AI

### 3. 🧠 Extract Entities
- Extracts Doctor, Hospital, Disease, Medicine

### 4. 📋 Summarize
- Converts interaction into CRM-friendly summary

### 5. 💡 Suggest Next Action
- Recommends next steps for sales rep

---

## 💻 Features

### 1. Conversational Input
- Users can type interaction in chat box

### 2. Structured Form
- Input fields:
  - Doctor Name
  - Hospital
  - Notes

### 3. AI Processing Buttons
- Edit
- Extract
- Summary
- Suggest
- Run All

### 4. History Tracking
- Stores and displays past interactions

---

## ▶️ How to Run Project

### 🔹 Backend

```bash
cd Backend
venv\Scripts\activate
uvicorn main:app --reload

Backend runs at:
http://127.0.0.1:8000

---

### Frontend

cd frontend
npm install
npm start

Frontend runs at:
http://localhost:3000

---

---

## 🧪 How to Test

1. Open frontend in browser:
   http://localhost:3000

2. Try typing:
   Patient met Dr. Sharma at Apollo hospital for diabetes

3. Click buttons:
   - ✏️ Edit → improves text
   - 🧠 Extract → shows entities
   - 📋 Summary → short CRM summary
   - 💡 Suggest → next action
   - 🔄 Run All → everything together

4. Try Structured Form:
   - Fill Doctor, Hospital, Notes
   - Click "Submit Form"

5. Click:
   📂 View History → see saved interactions

---

## 📦 Database

- SQLite database (`crm.db`) stores all interactions
- Data includes:
  - Input
  - AI Output

---

## 🎯 Conclusion

This project demonstrates an AI-powered CRM system using LangGraph and LLMs to help healthcare sales representatives efficiently manage HCP interactions.

---
