import os
import re
import json
from typing import TypedDict, List, Dict
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END

load_dotenv()

# ---------------- LLM ----------------
llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
    temperature=0.2,
)


# ---------------- HELPERS ----------------
def _parse_json(text: str, fallback):
    """LLMs sometimes wrap JSON in ```json fences or add text around it.
    Pull out the first JSON object/array and parse it safely."""
    if not text:
        return fallback
    cleaned = re.sub(r"```(?:json)?", "", text).strip()
    match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
    if not match:
        return fallback
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        return fallback


# ---------------- STATE ----------------
class State(TypedDict, total=False):
    input: str
    output: str
    history: List[Dict]
    record: Dict
    edit_request: str
    entities: Dict
    summary: str
    suggestions: List[str]


# ---------------- TOOL 1: LOG ----------------
def log_interaction(state: State):
    state.setdefault("history", [])
    state["history"].append({"type": "log", "data": state["input"]})
    return state


# ---------------- TOOL 2: EDIT ----------------
def edit_interaction(state: State):
    record = state.get("record", {})
    edit_request = state.get("edit_request", "")

    res = llm.invoke(
        "Here is an existing HCP interaction record as JSON:\n"
        f"{json.dumps(record)}\n\n"
        "Apply this requested change to it:\n"
        f"{edit_request}\n\n"
        "Return ONLY the fields that changed, as strict JSON, using the exact "
        "same key names as the original record. No markdown, no extra text, "
        "no explanation. Example: {\"sentiment\": \"Negative\"}"
    )
    changed_fields = _parse_json(res.content, {})
    state["output"] = json.dumps(changed_fields)
    return state


# ---------------- TOOL 3: EXTRACT ENTITIES ----------------
def extract_entities(state: State):
    res = llm.invoke(
        "You are a pharma CRM assistant. Read this note about a sales rep's "
        "interaction with a healthcare professional (HCP) and extract the details.\n\n"
        f"NOTE:\n{state['input']}\n\n"
        "Return ONLY strict JSON with these keys (use \"\" or [] when unknown):\n"
        "{\n"
        '  "hcp_name": "e.g. Dr. Sharma",\n'
        '  "interaction_type": "Meeting | Call | Email | Conference",\n'
        '  "sentiment": "Positive | Neutral | Negative",\n'
        '  "products": ["drug or product names"],\n'
        '  "conditions": ["diseases or conditions"],\n'
        '  "materials_shared": ["brochures, studies, etc."],\n'
        '  "samples_distributed": ["samples given"],\n'
        '  "topics": "short phrase of what was discussed"\n'
        "}"
    )
    entities = _parse_json(res.content, {})
    state["entities"] = entities if isinstance(entities, dict) else {}
    state["output"] = json.dumps(state["entities"], indent=2)
    return state


# ---------------- TOOL 4: SUMMARIZE ----------------
def summarize(state: State):
    res = llm.invoke(
        "Summarize this HCP interaction in 1-2 clear sentences for a CRM record. "
        "Mention the doctor, the product/topic and the doctor's reaction. "
        "No preamble, no bullet points.\n\n"
        f"{state['input']}"
    )
    state["summary"] = res.content.strip()
    state["output"] = state["summary"]
    return state


# ---------------- TOOL 5: SUGGEST NEXT ACTIONS ----------------
def suggest(state: State):
    res = llm.invoke(
        "Based on this HCP interaction, suggest 3 short, specific next actions "
        "for the sales rep (max 12 words each).\n\n"
        f"{state['input']}\n\n"
        'Return ONLY a JSON array of strings, e.g. ["Send efficacy study PDF", "..."]'
    )
    suggestions = _parse_json(res.content, [])
    if not isinstance(suggestions, list) or not suggestions:
        suggestions = [line.strip("-•* ").strip() for line in res.content.splitlines() if line.strip()][:3]
    state["suggestions"] = [str(s) for s in suggestions][:3]
    state["output"] = "\n".join(f"• {s}" for s in state["suggestions"])
    return state


# ---------------- LANGGRAPH FLOW ----------------
builder = StateGraph(State)

builder.add_node("log", log_interaction)
builder.add_node("edit", edit_interaction)
builder.add_node("extract", extract_entities)
builder.add_node("summary", summarize)
builder.add_node("suggest", suggest)

builder.set_entry_point("log")

builder.add_edge("log", "extract")
builder.add_edge("extract", "summary")
builder.add_edge("summary", "suggest")
builder.add_edge("suggest", END)

graph = builder.compile()


# ---------------- MAIN FUNCTION ----------------
def run_agent(input_text: str, action: str, record: dict = None, edit_request: str = ""):
    state: State = {
        "input": input_text,
        "output": "",
        "history": [],
        "record": record or {},
        "edit_request": edit_request,
        "entities": {},
        "summary": "",
        "suggestions": [],
    }

    if action == "edit":
        state = edit_interaction(state)
    elif action == "extract":
        state = extract_entities(state)
    elif action == "summary":
        state = summarize(state)
    elif action == "suggest":
        state = suggest(state)
    else:
        # FULL LANGGRAPH FLOW: log -> extract -> summary -> suggest
        state = graph.invoke(state)

    return state
