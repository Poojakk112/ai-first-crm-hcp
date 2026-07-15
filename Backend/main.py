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


class EditInteractionIn(BaseModel):
    edit_request: str  # e.g. "change sentiment to negative and add that a brochure was shared"


# ---------------- HELPERS ----------------
def _save_interaction(db: Session, structured: dict, source: str, raw_input: str = "") -> Interaction:
    result = ai_agent.run_agent(input_text=raw_input or "", action="all")

    output_text = result.get("output", "")
    followups = []
    if source == "chat":
        followups = [output_text] if output_text else []

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
        extracted_entities="",
        ai_summary=output_text if source == "form" else "",
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
    """Log Interaction tool: log an interaction submitted via the structured form."""
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
def update_interaction(interaction_id: int, data: EditInteractionIn, db: Session = Depends(get_db)):
    """Edit Interaction tool: apply a natural-language change to an existing
    logged interaction using the LangGraph 'edit' tool, then persist it."""
    record = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not record:
        return {"error": "Not found"}

    result = ai_agent.run_agent(
        input_text="",
        action="edit",
        record=record.to_dict(),
        edit_request=data.edit_request,
    )

    try:
        changed_fields = json.loads(result.get("output", "{}"))
    except json.JSONDecodeError:
        changed_fields = {}

    for field, value in changed_fields.items():
        if hasattr(record, field) and field not in ("id", "created_at", "updated_at"):
            if field in ("materials_shared", "samples_distributed", "ai_suggested_followups") and not isinstance(value, str):
                value = json.dumps(value)
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
    """Log Interaction tool via free-text chat: the LLM processes a natural
    language message like 'Met Dr. Smith, discussed Product X efficacy,
    positive sentiment' through the full LangGraph pipeline."""
    structured = {
        "hcp_name": "",
        "interaction_type": "Meeting",
        "topics_discussed": data.message,
        "sentiment": "Neutral",
        "outcomes": "",
        "follow_up_actions": "",
        "materials_shared": [],
        "samples_distributed": [],
    }
    record = _save_interaction(db, structured, source="chat", raw_input=data.message)

    return {
        "interaction": record.to_dict(),
        "reply": record.ai_summary or "Logged your interaction.",
    }


# ---------------- ROUTES: INDIVIDUAL AGENT TOOLS ----------------
@app.post("/agent/run")
def run_agent_tool(data: AgentActionIn):
    """Run a single LangGraph tool on-demand (log / edit / extract / summary / suggest / all)."""
    result = ai_agent.run_agent(input_text=data.input, action=data.action)
    return {
        "output": result.get("output", ""),
        "history": result.get("history", []),
    }


@app.get("/")
def root():
    return {"status": "ok", "service": "AI-First CRM HCP Module API"}