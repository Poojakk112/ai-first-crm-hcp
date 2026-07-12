import json
from typing import List, Optional

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

import ai_agent
from database import get_db, Interaction

app = FastAPI(title="AI-First CRM - HCP Interaction Module")

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- SCHEMAS ----------------
class StructuredInteractionIn(BaseModel):
    hcp_name: Optional[str] = ""
    interaction_type: Optional[str] = "Meeting"
    interaction_date: Optional[str] = ""
    interaction_time: Optional[str] = ""
    attendees: Optional[str] = ""
    topics_discussed: Optional[str] = ""
    materials_shared: Optional[List[str]] = []
    samples_distributed: Optional[List[str]] = []
    sentiment: Optional[str] = "Neutral"
    outcomes: Optional[str] = ""
    follow_up_actions: Optional[str] = ""


class ChatInteractionIn(BaseModel):
    message: str


class AgentActionIn(BaseModel):
    input: str
    action: str = "all"


# ---------------- HELPERS ----------------
def _save_interaction(db: Session, structured: dict, source: str, raw_input: str = "",
                       run_ai: bool = True) -> Interaction:
    entities, summary, followups = {}, "", []

    if run_ai:
        result = ai_agent.run_agent(
            input_text=raw_input,
            action="all",
            structured=structured,
        )
        entities = result.get("entities") or {}
        summary = result.get("summary") or ""
        followups = result.get("followups") or []

    record = Interaction(
        hcp_name=structured.get("hcp_name", ""),
        interaction_type=structured.get("interaction_type", ""),
        interaction_date=structured.get("interaction_date", ""),
        interaction_time=structured.get("interaction_time", ""),
        attendees=structured.get("attendees", ""),
        topics_discussed=structured.get("topics_discussed", ""),
        materials_shared=json.dumps(structured.get("materials_shared", [])),
        samples_distributed=json.dumps(structured.get("samples_distributed", [])),
        sentiment=structured.get("sentiment", ""),
        outcomes=structured.get("outcomes", ""),
        follow_up_actions=structured.get("follow_up_actions", ""),
        ai_suggested_followups=json.dumps(followups),
        extracted_entities=json.dumps(entities),
        ai_summary=summary,
        source=source,
        raw_input=raw_input,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ---------------- ROUTES: INTERACTIONS (structured form) ----------------
@app.post("/interactions")
def create_interaction(data: StructuredInteractionIn, db: Session = Depends(get_db)):
    """Log an interaction submitted via the structured form."""
    record = _save_interaction(db, data.dict(), source="form")
    return record.to_dict()


@app.get("/interactions")
def list_interactions(db: Session = Depends(get_db)):
    records = db.query(Interaction).order_by(Interaction.id.desc()).all()
    return [r.to_dict() for r in records]


@app.get("/interactions/{interaction_id}")
def get_interaction(interaction_id: int, db: Session = Depends(get_db)):
    record = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not record:
        return {"error": "Not found"}
    return record.to_dict()


@app.put("/interactions/{interaction_id}")
def update_interaction(interaction_id: int, data: StructuredInteractionIn, db: Session = Depends(get_db)):
    """Edit Interaction tool: modify a previously logged interaction."""
    record = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not record:
        return {"error": "Not found"}

    for field, value in data.dict().items():
        if field in ("materials_shared", "samples_distributed"):
            setattr(record, field, json.dumps(value))
        else:
            setattr(record, field, value)

    db.commit()
    db.refresh(record)
    return record.to_dict()


@app.delete("/interactions/{interaction_id}")
def delete_interaction(interaction_id: int, db: Session = Depends(get_db)):
    record = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if record:
        db.delete(record)
        db.commit()
    return {"deleted": interaction_id}


# ---------------- ROUTES: CHAT MODE ----------------
@app.post("/interactions/chat")
def log_via_chat(data: ChatInteractionIn, db: Session = Depends(get_db)):
    """Log Interaction tool via free-text chat: the LLM extracts structure
    from a natural-language message like
    'Met Dr. Smith, discussed Product X efficacy, positive sentiment'."""
    result = ai_agent.run_agent(input_text=data.message, action="all")

    entities = result.get("entities") or {}
    structured = {
        "hcp_name": entities.get("doctor", ""),
        "interaction_type": "Meeting",
        "topics_discussed": data.message,
        "sentiment": "Neutral",
        "outcomes": "",
        "follow_up_actions": "",
        "materials_shared": [],
        "samples_distributed": [],
    }

    record = _save_interaction(
        db, structured, source="chat", raw_input=data.message, run_ai=False
    )
    # attach the already-computed AI results directly (avoid double LLM calls)
    record.extracted_entities = json.dumps(entities)
    record.ai_summary = result.get("summary") or ""
    record.ai_suggested_followups = json.dumps(result.get("followups") or [])
    db.commit()
    db.refresh(record)

    return {
        "interaction": record.to_dict(),
        "reply": result.get("summary") or "Logged your interaction.",
    }


# ---------------- ROUTES: INDIVIDUAL AGENT TOOLS ----------------
@app.post("/agent/run")
def run_agent_tool(data: AgentActionIn):
    """Run a single LangGraph tool on-demand (edit / extract / summary / suggest / log / all)."""
    result = ai_agent.run_agent(input_text=data.input, action=data.action)
    return {
        "output": result.get("output", ""),
        "entities": result.get("entities"),
        "summary": result.get("summary"),
        "followups": result.get("followups"),
        "edited_text": result.get("edited_text"),
        "history": result.get("history", []),
    }


@app.get("/")
def root():
    return {"status": "ok", "service": "AI-First CRM HCP Module API"}
