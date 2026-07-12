import os
import json
from typing import TypedDict, List, Dict, Optional

from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END

load_dotenv()

# ----------------------------------------------------------------------------
# LLM
# Primary model required by the assignment: gemma2-9b-it
# Fallback / heavier-reasoning model available if needed: llama-3.3-70b-versatile
# ----------------------------------------------------------------------------
GROQ_MODEL = os.getenv("GROQ_MODEL", "gemma2-9b-it")

llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model=GROQ_MODEL,
    temperature=0.3,
)


class AgentState(TypedDict):
    input: str                     # raw free-text interaction (chat mode)
    structured: Optional[Dict]     # structured form fields (form mode), if any
    output: str
    entities: Optional[Dict]
    summary: Optional[str]
    followups: Optional[List[str]]
    edited_text: Optional[str]
    history: List[Dict]


def _source_text(state: AgentState) -> str:
    """Build a single text blob describing the interaction, whether it came
    from the free-text chat box or the structured form."""
    if state.get("input"):
        return state["input"]
    if state.get("structured"):
        s = state["structured"]
        return (
            f"HCP: {s.get('hcp_name', '')}, "
            f"Type: {s.get('interaction_type', '')}, "
            f"Topics: {s.get('topics_discussed', '')}, "
            f"Outcomes: {s.get('outcomes', '')}, "
            f"Sentiment: {s.get('sentiment', '')}"
        )
    return ""


# ---------------- TOOL 1: LOG INTERACTION ----------------
def log_interaction(state: AgentState) -> AgentState:
    """Captures the raw interaction data (chat text or structured form) and
    appends it to history. Also kicks off entity extraction + summarization
    so the log is immediately enriched."""
    state.setdefault("history", [])
    text = _source_text(state)
    state["history"].append({"type": "log", "data": text})
    state["output"] = "Interaction logged."
    return state


# ---------------- TOOL 2: EDIT INTERACTION ----------------
def edit_interaction(state: AgentState) -> AgentState:
    """Allows modification of logged data — rewrites/improves the interaction
    text into clean, professional CRM language."""
    text = _source_text(state)
    response = llm.invoke(
        f"Rewrite the following HCP (Healthcare Professional) sales "
        f"interaction note into clear, professional CRM language. "
        f"Keep all facts, do not invent new information.\n\n{text}"
    )
    state["edited_text"] = response.content
    state["output"] = response.content
    return state


# ---------------- TOOL 3: EXTRACT ENTITIES ----------------
def extract_entities(state: AgentState) -> AgentState:
    text = _source_text(state)
    response = llm.invoke(
        "Extract the following fields from this HCP interaction note as "
        "strict JSON only (no markdown, no extra text): "
        '{"doctor": "", "hospital_or_clinic": "", "disease_or_therapy_area": "", '
        '"medicines_or_products": []}. If a field is unknown, use an empty '
        f"string or empty list.\n\nText:\n{text}"
    )
    try:
        entities = json.loads(response.content)
    except json.JSONDecodeError:
        entities = {"raw": response.content}
    state["entities"] = entities
    state["output"] = json.dumps(entities)
    return state


# ---------------- TOOL 4: SUMMARIZE ----------------
def summarize(state: AgentState) -> AgentState:
    text = _source_text(state)
    response = llm.invoke(
        f"Summarize this HCP interaction in 2-3 concise sentences suitable "
        f"for a CRM record:\n\n{text}"
    )
    state["summary"] = response.content
    state["output"] = response.content
    return state


# ---------------- TOOL 5: SUGGEST NEXT ACTION ----------------
def suggest_next_action(state: AgentState) -> AgentState:
    text = _source_text(state)
    response = llm.invoke(
        "Based on this HCP interaction, suggest 2-4 concrete follow-up "
        "actions for the field representative. Return strict JSON only: "
        '{"followups": ["...", "..."]}.\n\n'
        f"Text:\n{text}"
    )
    try:
        data = json.loads(response.content)
        followups = data.get("followups", [])
    except json.JSONDecodeError:
        followups = [response.content]
    state["followups"] = followups
    state["output"] = json.dumps(followups)
    return state


# ---------------- LANGGRAPH FLOW ----------------
builder = StateGraph(AgentState)

builder.add_node("log", log_interaction)
builder.add_node("edit", edit_interaction)
builder.add_node("extract", extract_entities)
builder.add_node("summary", summarize)
builder.add_node("suggest", suggest_next_action)

builder.set_entry_point("log")
builder.add_edge("log", "extract")
builder.add_edge("extract", "summary")
builder.add_edge("summary", "suggest")
builder.add_edge("suggest", "edit")
builder.add_edge("edit", END)

graph = builder.compile()

TOOL_MAP = {
    "log": log_interaction,
    "edit": edit_interaction,
    "extract": extract_entities,
    "summary": summarize,
    "suggest": suggest_next_action,
}


def run_agent(input_text: str = "", action: str = "all", structured: Optional[Dict] = None) -> Dict:
    """Entry point used by the FastAPI layer.

    action:
      - "all"     -> runs the full LangGraph pipeline (log -> extract -> summary -> suggest -> edit)
      - "log" / "edit" / "extract" / "summary" / "suggest" -> runs a single tool
    """
    state: AgentState = {
        "input": input_text,
        "structured": structured,
        "output": "",
        "entities": None,
        "summary": None,
        "followups": None,
        "edited_text": None,
        "history": [],
    }

    if action == "all":
        state = graph.invoke(state)
    elif action in TOOL_MAP:
        state = TOOL_MAP[action](state)
    else:
        state["output"] = f"Invalid action: {action}"

    return state
