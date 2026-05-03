from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker

# create database
engine = create_engine("sqlite:///crm.db")

Base = declarative_base()

# table
class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    input = Column(String)
    output = Column(String)

# create table
Base.metadata.create_all(bind=engine)

# session
SessionLocal = sessionmaker(bind=engine)