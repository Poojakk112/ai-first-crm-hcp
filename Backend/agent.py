import os
from typing import TypedDict
from langgraph.graph import StateGraph
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()

# Load LLM
llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model="gemma2-9b-it"
)

# State
class State(TypedDict):
    input: str
    output: str

# AI Node
def ai_node(state: State):
    response = llm.invoke(state["input"])
    return {"output": response.content}

# Graph
graph = StateGraph(State)
graph.add_node("ai", ai_node)
graph.set_entry_point("ai")
graph.set_finish_point("ai")

app = graph.compile()