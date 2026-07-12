import os
import json
from datetime import datetime

from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

# ----------------------------------------------------------------------------
# DATABASE_URL examples:
#   Postgres: postgresql+psycopg2://user:password@localhost:5432/crm_db
#   MySQL:    mysql+pymysql://user:password@localhost:3306/crm_db
#   SQLite (local/dev fallback): sqlite:///crm.db
# ----------------------------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///crm.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)

Base = declarative_base()


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)

    # Structured form fields
    hcp_name = Column(String(255))
    interaction_type = Column(String(100))          # Meeting, Call, Email, etc.
    interaction_date = Column(String(20))            # dd-mm-yyyy
    interaction_time = Column(String(10))             # HH:MM
    attendees = Column(Text)                          # comma-separated names
    topics_discussed = Column(Text)
    materials_shared = Column(Text)                   # JSON list
    samples_distributed = Column(Text)                # JSON list
    sentiment = Column(String(20))                    # Positive / Neutral / Negative
    outcomes = Column(Text)
    follow_up_actions = Column(Text)
    ai_suggested_followups = Column(Text)              # JSON list

    # AI-derived fields
    extracted_entities = Column(Text)
    ai_summary = Column(Text)

    # Raw source (chat text, if logged conversationally)
    source = Column(String(20), default="form")        # "form" or "chat"
    raw_input = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "hcp_name": self.hcp_name,
            "interaction_type": self.interaction_type,
            "interaction_date": self.interaction_date,
            "interaction_time": self.interaction_time,
            "attendees": self.attendees,
            "topics_discussed": self.topics_discussed,
            "materials_shared": json.loads(self.materials_shared or "[]"),
            "samples_distributed": json.loads(self.samples_distributed or "[]"),
            "sentiment": self.sentiment,
            "outcomes": self.outcomes,
            "follow_up_actions": self.follow_up_actions,
            "ai_suggested_followups": json.loads(self.ai_suggested_followups or "[]"),
            "extracted_entities": self.extracted_entities,
            "ai_summary": self.ai_summary,
            "source": self.source,
            "raw_input": self.raw_input,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


Base.metadata.create_all(bind=engine)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
