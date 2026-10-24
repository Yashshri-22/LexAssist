from sqlalchemy import Column,Integer,String,Text,DateTime,ForeignKey
from sqlalchemy.sql import func
from app.db import Base
class User(Base):
    __tablename__="users"
    id=Column(Integer,primary_key=True,index=True)
    name=Column(String(120),nullable=False)
    email=Column(String(255),unique=True,index=True,nullable=False)
    password_hash=Column(String(255),nullable=False)
    created_at=Column(DateTime(timezone=True),server_default=func.now())
class Document(Base):
    __tablename__="documents"
    id=Column(Integer,primary_key=True,index=True)
    user_id=Column(Integer,ForeignKey("users.id",ondelete="CASCADE"),index=True,nullable=False)
    filename=Column(String(255),nullable=False)
    stored_path=Column(String(1000),nullable=False)
    file_type=Column(String(20),nullable=False)
    status=Column(String(30),default="UPLOADED",nullable=False)
    extracted_text=Column(Text,default="")
    summary_json=Column(Text,default="{}")
    created_at=Column(DateTime(timezone=True),server_default=func.now())
class Clause(Base):
    __tablename__="clauses"
    id=Column(Integer,primary_key=True,index=True)
    document_id=Column(Integer,ForeignKey("documents.id",ondelete="CASCADE"),index=True)
    clause_number=Column(String(80),default="")
    title=Column(String(300),default="")
    page_number=Column(Integer,default=1)
    text=Column(Text,nullable=False)
