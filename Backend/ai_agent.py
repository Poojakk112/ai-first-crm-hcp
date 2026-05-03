import os
from typing import TypedDict, List, Dict
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END

load_dotenv()

# ---------------- LLM ----------------
llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model="llama-3.3-70b-versatile"
)

# ---------------- STATE ----------------
class State(TypedDict):
    input: str
    output: str
    history: List[Dict]

# ---------------- TOOL 1 ----------------
def log_interaction(state: State):
    state.setdefault("history", [])
    state["history"].append({
        "type": "log",
        "data": state["input"]
    })
    return state

# ---------------- TOOL 2 ----------------
def edit_interaction(state: State):
    res = llm.invoke(f"Improve this interaction:\n{state['input']}")
    state["output"] = res.content
    return state

# ---------------- TOOL 3 ----------------
def extract_entities(state: State):
    res = llm.invoke(f"Extract doctor, disease, medicine:\n{state['input']}")
    state["output"] = res.content
    return state

# ---------------- TOOL 4 ----------------
def summarize(state: State):
    res = llm.invoke(f"Summarize:\n{state['input']}")
    state["output"] = res.content
    return state

# ---------------- TOOL 5 ----------------
def suggest(state: State):
    res = llm.invoke(f"Suggest next action:\n{state['input']}")
    state["output"] = res.content
    return state

# ---------------- LANGGRAPH FLOW ----------------
builder = StateGraph(State)

builder.add_node("log", log_interaction)
builder.add_node("edit", edit_interaction)
builder.add_node("extract", extract_entities)
builder.add_node("summary", summarize)
builder.add_node("suggest", suggest)

builder.set_entry_point("log")

builder.add_edge("log", "edit")
builder.add_edge("edit", "extract")
builder.add_edge("extract", "summary")
builder.add_edge("summary", "suggest")
builder.add_edge("suggest", END)

graph = builder.compile()

# ---------------- MAIN FUNCTION ----------------
def run_agent(input_text: str, action: str):

    state = {
        "input": input_text,
        "output": "",
        "history": []
    }

    # route actions
    if action == "edit":
        state = edit_interaction(state)

    elif action == "extract":
        state = extract_entities(state)

    elif action == "summary":
        state = summarize(state)

    elif action == "suggest":
        state = suggest(state)

    else:
        # FULL LANGGRAPH FLOW
        state = graph.invoke(state)

    return state