# from database import SessionLocal, Interaction
# from fastapi import FastAPI
# from pydantic import BaseModel
# from agent_tools import run_agent
# from fastapi.middleware.cors import CORSMiddleware

# app = FastAPI()

# # -------- CORS --------
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # -------- REQUEST --------
# class Request(BaseModel):
#     input: str
#     action: str

# # -------- API 1 --------
# @app.post("/agent")
# def run_agent_api(req: Request):
#     db = SessionLocal()

#     state = {
#         "input": req.input,
#         "output": "",
#         "history": []
#     }

#     result = run_agent(state, req.action)

#     # save to database
#     new_data = Interaction(
#         input=req.input,
#         output=result["output"]
#     )

#     db.add(new_data)
#     db.commit()
#     db.close()

#     return result


# # -------- API 2 --------
# @app.get("/data")
# def get_data():
#     db = SessionLocal()
#     data = db.query(Interaction).all()
#     db.close()

#     return data


# ----------------------------------------------------------------------------


# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel

# import ai_agent   

# app = FastAPI()

# # ---------------- CORS ----------------
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # ---------------- REQUEST MODEL ----------------
# class RequestData(BaseModel):
#     input: str
#     action: str


# # ---------------- API ----------------
# @app.post("/run-agent")
# def run_agent_api(data: RequestData):

#     result = ai_agent.run_agent(data.input)

#     return {
#         "output": result.get("output", ""),
#         "history": result.get("history", [])
#     }

# -----------------------------------------------------------------------------------

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import ai_agent

app = FastAPI()

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- REQUEST MODEL ----------------
class RequestData(BaseModel):
    input: str
    action: str


# ---------------- API ----------------
@app.post("/run-agent")
def run_agent_api(data: RequestData):

    # ❗ FIXED: pass action also
    result = ai_agent.run_agent(data.input, data.action)

    return {
        "output": result.get("output", ""),
        "history": result.get("history", [])
    }