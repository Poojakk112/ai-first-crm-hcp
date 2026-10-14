# 🧠 AI-First CRM – HCP Interaction Module

## 📌 Overview
This project is an AI-first CRM tool for healthcare sales field representatives to log and manage their interactions with Healthcare Professionals (HCPs). It supports two ways of logging an interaction:

- A **structured form** (HCP name, interaction type, date/time, attendees, topics discussed, materials/samples, sentiment, outcomes, follow-up actions)
- A **conversational chat interface** where a rep can just type what happened in plain language

Behind both, a LangGraph-based AI agent (using Groq LLMs) enriches every interaction automatically, and allows edits to be made to a saved interaction using natural language.

---

## 📸 Screenshots

**Dashboard + AI chat:** the rep types one sentence, and the agent extracts the HCP, type and sentiment, writes a summary and suggests next steps.

![Dashboard and AI chat](screenshots/dashboard-ai-chat.jpg)

| Structured form | AI Tools: Extract Entities |
|---|---|
| ![Log interaction form](screenshots/log-interaction-form.jpg) | ![Extract entities tool](screenshots/ai-tools-extract.jpg) |

**Interaction timeline:** AI summaries, product/condition tags, suggested next steps, search, sentiment filters, *Edit with AI* and delete.

![Interaction timeline](screenshots/interaction-timeline.jpg)

---

## ⚙️ Tech Stack

**Frontend:** React + Redux Toolkit (Create React App)
**Backend:** FastAPI (Python)
**AI Agent Framework:** LangGraph
**LLM:** Groq. The backend automatically picks an available chat model for your API key (e.g. `openai/gpt-oss-120b`), so it keeps working when Groq retires models. You can force a specific one with `GROQ_MODEL=` in `Backend/.env`.
**Database:** SQLite by default (`crm.db`); SQLAlchemy also supports Postgres/MySQL by changing the connection string in `database.py`
**Font:** Google Inter

---

## 🧩 LangGraph AI Agent & Tools

The LangGraph agent is the core intelligence behind the Log Interaction screen. When a rep logs an interaction (via form or chat), the agent runs it through a pipeline of tools that enrich the raw interaction into a structured, CRM-ready record. A separate tool lets the rep modify an already-saved interaction using plain language, without manually editing each field.

| # | Tool | What it does |
|---|------|---------------|
| 1 | **Log Interaction** | Captures the raw interaction (from the form or chat) and starts the enrichment pipeline. |
| 2 | **Edit Interaction** | Takes an existing saved interaction plus a plain-language change request (e.g. *"change sentiment to negative"*), and returns only the changed field(s) as JSON, which are then written back to that record in the database. |
| 3 | **Extract Entities** | Uses the LLM to pull out the Doctor, Disease/Therapy Area, and Medicine/Product mentioned in the interaction. |
| 4 | **Summarize** | Produces a short, professional 2–3 sentence CRM summary of the interaction. |
| 5 | **Suggest Next Action** | Recommends concrete follow-up actions for the rep (e.g. scheduling a follow-up meeting). |

### LangGraph Flow

```
Log Interaction → Extract Entities → Summarize → Suggest Next Action → END
```

`Edit Interaction` is intentionally **not** part of this automatic chain — it only runs on demand, when a rep requests a change to an interaction that's already been saved.

---

## 🖥️ Features

### 1. Dashboard
- Live stats: total interactions, % positive sentiment, interactions this week, AI follow-ups suggested
- Sentiment mix bar (Positive / Neutral / Negative)
- Backend status indicator ("AI backend online")

### 2. Log HCP Interaction
- **Structured form:** HCP name, interaction type (Meeting / Call / Email / Conference), date & time, attendees, topics, materials and samples as removable tags, sentiment, outcomes and follow-ups. The full form is sent to the AI for a real summary.
- **AI Assistant chat:** describe the visit in plain English. The agent fills in the HCP name, interaction type, sentiment, products and materials automatically and replies with a summary plus 3 next steps.

### 3. AI Tools Playground
- Run **Extract Entities**, **Summarize** or **Next Actions** on any text. Results are shown as clean cards, not raw JSON.

### 4. Interaction Timeline
- Each record shows an AI summary, product/condition/material/sample tags and suggested next steps
- Search by HCP or topic and filter by sentiment
- **Edit with AI:** type *"change sentiment to neutral"* and the record updates
- Delete with confirmation, plus toast notifications for every action

---

## 📁 Project Structure

```
aivoa-crm/
├── Backend/
│   ├── main.py          # FastAPI app: CRUD + agent endpoints
│   ├── ai_agent.py       # LangGraph agent with the 5 tools
│   ├── database.py       # SQLAlchemy models + session
│   ├── requirements.txt
│   └── .env             # GROQ_API_KEY (not committed)
└── frontend/
    ├── src/
    │   ├── LogInteractionScreen.js   # Main screen: form + chat + tools panel
    │   ├── redux/
    │   │   ├── interactionSlice.js   # Redux state for form/chat/tools
    │   │   └── store.js
    │   └── App.js
    └── package.json
```

---

## ▶️ How to Run

### Backend
```bash
cd Backend
pip install fastapi uvicorn sqlalchemy python-dotenv langchain-groq langgraph pydantic
```

Create a `.env` file inside `Backend/`:
```
GROQ_API_KEY=your_groq_api_key_here
```

Start the server:
```bash
python -m uvicorn main:app --reload
```
Backend runs at http://127.0.0.1:8000 (interactive API docs at http://127.0.0.1:8000/docs)

### Frontend
```bash
cd frontend
npm install
npm start
```
Frontend runs at http://localhost:3000

---

## 📡 API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/interactions` | Log an interaction from the structured form |
| GET | `/interactions` | List all logged interactions |
| GET | `/interactions/{id}` | Get a single interaction |
| PUT | `/interactions/{id}` | **Edit Interaction tool** — apply a natural-language change to a saved interaction |
| DELETE | `/interactions/{id}` | Delete an interaction |
| POST | `/interactions/chat` | Log an interaction via free-text chat |
| POST | `/agent/run` | Run a single LangGraph tool on demand (`log` / `edit` / `extract` / `summary` / `suggest` / `all`) |

---

## 🗄️ Database

Default: SQLite (`Backend/crm.db`, created automatically on first run).

To use Postgres or MySQL instead, set an environment variable before running, or edit `DATABASE_URL` in `database.py`:
- Postgres: `postgresql+psycopg2://user:password@localhost:5432/crm_db`
- MySQL: `mysql+pymysql://user:password@localhost:3306/crm_db`

---

## ✅ Conclusion

This project demonstrates an AI-first CRM system where a LangGraph agent, powered by Groq LLMs, helps healthcare field representatives log, enrich, and edit HCP interactions through both structured and conversational interfaces — reducing manual data entry so reps can focus on the conversation with the doctor rather than the paperwork afterward.