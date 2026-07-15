# 🧠 AI-First CRM – HCP Interaction Module

## 📌 Overview
This project is an AI-powered CRM system designed for logging Healthcare Professional (HCP) interactions.  

It allows users to:
- Log doctor interactions using text input
- Use AI to improve, summarize, extract entities, and suggest next actions
- Switch between structured + conversational style interaction

The system is built using **React + Redux (frontend)** and **FastAPI + LangGraph + Groq LLM (backend)**.

---

## 🎯 Objective
To design an AI-first CRM “Log Interaction Screen” that helps field representatives:

- Record doctor visits
- Improve interaction notes using AI
- Extract medical entities
- Summarize interactions
- Suggest next actions

---

## ⚙️ Tech Stack

### Frontend
- React.js
- Redux Toolkit
- JavaScript

### Backend
- FastAPI (Python)
- LangGraph
- LangChain Groq
- ChatGroq (llama-3.3-70b-versatile)

---

## 🧠 AI Architecture (LangGraph Flow)

The system uses a state-based AI workflow:

Log Interaction → Edit Interaction → Extract Entities → Summary → Suggest Next Action → END

Each node updates a shared state object and passes it forward.

---

## 🧩 AI Tools Implemented

### 1. Log Interaction
Stores raw user input into interaction history.

### 2. Edit Interaction
Uses LLM to improve and rewrite input text.

### 3. Extract Entities
Extracts:
- Doctor name
- Disease
- Medicine

### 4. Summarize
Generates a short summary of interaction.

### 5. Suggest Next Action
Suggests next steps for medical follow-up.

---

## 🔄 System Flow

1. User enters interaction in frontend
2. User selects action (edit / extract / summary / suggest / full flow)
3. Frontend sends request to backend API
4. Backend processes request using LangGraph
5. LLM (Groq) generates response
6. Response returned to frontend
7. Output displayed in UI

---

## 📡 API Details

### Endpoint
POST http://localhost:8000/run-agent

### Request
```json
{
  "input": "Doctor visited for fever",
  "action": "edit"
}

###  System works like this:

User writes interaction (React UI)
        ↓
Redux stores input
        ↓
Frontend sends request to FastAPI
        ↓
Backend runs LangGraph AI Agent
        ↓
LLM (Groq) processes text
        ↓
5 AI tools run step-by-step
        ↓
Final output sent back to UI