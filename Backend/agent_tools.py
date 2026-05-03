import os
from typing import TypedDict, List, Dict
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph

load_dotenv()

# -------- LLM --------
llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model="llama-3.3-70b-versatile"
)

# -------- STATE --------
class State(TypedDict):
    input: str
    output: str
    history: List[Dict]

# -------- TOOL 1: LOG --------
def log_interaction(state: State):
    state.setdefault("history", [])
    state["history"].append({
        "type": "log",
        "data": state["input"]
    })
    return state

# -------- TOOL 2: EDIT --------
def edit_interaction(state: State):
    response = llm.invoke(
        f"Improve this doctor interaction professionally:\n{state['input']}"
    )
    text = "✏️ Edited:\n" + response.content
    state["output"] = state.get("output", "") + "\n\n" + text
    return state

# -------- TOOL 3: EXTRACT --------
def extract_entities(state: State):
    response = llm.invoke(
        f"""
Extract:
Doctor, Hospital, Disease, Medicine

Text:
{state['input']}
"""
    )
    text = "🧠 Entities:\n" + response.content
    state["output"] = state.get("output", "") + "\n\n" + text
    return state

# -------- TOOL 4: SUMMARY --------
def summarize(state: State):
    response = llm.invoke(
        f"Summarize this interaction:\n{state['input']}"
    )
    text = "📋 Summary:\n" + response.content
    state["output"] = state.get("output", "") + "\n\n" + text
    return state

# -------- TOOL 5: SUGGEST --------
def suggest(state: State):
    response = llm.invoke(
        f"Suggest next action for doctor:\n{state['input']}"
    )
    text = "💡 Next Action:\n" + response.content
    state["output"] = state.get("output", "") + "\n\n" + text
    return state


# -------- LANGGRAPH --------
builder = StateGraph(State)

builder.add_node("log", log_interaction)
builder.add_node("edit", edit_interaction)
builder.add_node("extract", extract_entities)
builder.add_node("summary", summarize)
builder.add_node("suggest", suggest)

# Flow
builder.set_entry_point("log")
builder.add_edge("log", "edit")
builder.add_edge("edit", "extract")
builder.add_edge("extract", "summary")
builder.add_edge("summary", "suggest")

graph = builder.compile()


# -------- MAIN FUNCTION --------
def run_agent(state: State, action: str):

    # initialize output
    state["output"] = ""

    if action == "all":
        return graph.invoke(state)

    elif action == "edit":
        return edit_interaction(state)

    elif action == "extract":
        return extract_entities(state)

    elif action == "summary":
        return summarize(state)

    elif action == "suggest":
        return suggest(state)

    else:
        return {"output": "Invalid action"}