import json,uuid,threading
from pathlib import Path
from fastapi import FastAPI,UploadFile,File,Depends,HTTPException,BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel,EmailStr,Field
from sqlalchemy.orm import Session
from app.core import settings
from app.db import Base,engine,get_db,SessionLocal
from app.models import User,Document,Clause
from app.security import hash_password,verify_password,token,current_user
from app.processing import extract,segment
from app.rag import index,retrieve,unindex,warm
from app.ai import generate
from app.analysis import risks,conflicts,summary
Base.metadata.create_all(bind=engine)
Path(settings.upload_dir).mkdir(parents=True,exist_ok=True)
app=FastAPI(title="NyayaSetu API",version="1.0.0",description="Legal document capstone prototype. Not legal advice.")
threading.Thread(target=warm,daemon=True).start()
app.add_middleware(CORSMiddleware,allow_origins=list({settings.frontend_origin,"http://localhost:5173","http://127.0.0.1:5173"}),allow_credentials=True,allow_methods=["*"],allow_headers=["*"])
class AuthIn(BaseModel):
 email:EmailStr;password:str=Field(min_length=8,max_length=128);name:str|None=None
class AskIn(BaseModel):question:str=Field(min_length=2,max_length=3000)
class WhatIfIn(BaseModel):scenario:str=Field(min_length=3,max_length=3000);language:str="English"
class DraftIn(BaseModel):document_type:str;details:dict;language:str="English"
def owned(db,id,user):
 d=db.query(Document).filter(Document.id==id,Document.user_id==user.id).first()
 if not d:raise HTTPException(404,"Document not found")
 return d
@app.get("/api/health")
def health():return {"status":"ok"}
@app.post("/api/auth/register")
def register(x:AuthIn,db:Session=Depends(get_db)):
 if not x.name or not x.name.strip():raise HTTPException(422,"Name is required")
 email=x.email.lower()
 if db.query(User).filter(User.email==email).first():raise HTTPException(409,"Email already registered")
 u=User(name=x.name.strip(),email=email,password_hash=hash_password(x.password));db.add(u);db.commit();db.refresh(u)
 return {"access_token":token(u.id),"user":{"id":u.id,"name":u.name,"email":u.email}}
@app.post("/api/auth/login")
def login(x:AuthIn,db:Session=Depends(get_db)):
 u=db.query(User).filter(User.email==x.email.lower()).first()
 if not u or not verify_password(x.password,u.password_hash):raise HTTPException(401,"Incorrect email or password")
 return {"access_token":token(u.id),"user":{"id":u.id,"name":u.name,"email":u.email}}
@app.get("/api/auth/me")
def me(u=Depends(current_user)):return {"id":u.id,"name":u.name,"email":u.email}
@app.post("/api/documents/upload")
async def upload(file:UploadFile=File(...),db:Session=Depends(get_db),u=Depends(current_user)):
 ext=Path(file.filename or "").suffix.lower()
 if ext not in (".pdf",".docx"):raise HTTPException(400,"Only PDF and DOCX are supported")
 data=await file.read()
 if not data:raise HTTPException(400,"Empty file")
 if len(data)>settings.max_upload_mb*1024*1024:raise HTTPException(413,"File exceeds configured size limit")
 path=Path(settings.upload_dir)/(uuid.uuid4().hex+ext);path.write_bytes(data)
 d=Document(user_id=u.id,filename=Path(file.filename).name,stored_path=str(path),file_type=ext[1:],status="UPLOADED");db.add(d);db.commit();db.refresh(d)
 return {"id":d.id,"filename":d.filename,"status":d.status}
@app.get("/api/documents")
def docs(db:Session=Depends(get_db),u=Depends(current_user)):
 return [{"id":d.id,"filename":d.filename,"status":d.status,"created_at":str(d.created_at)} for d in db.query(Document).filter_by(user_id=u.id).order_by(Document.id.desc()).all()]
@app.get("/api/documents/{did}")
def getdoc(did:int,db:Session=Depends(get_db),u=Depends(current_user)):
 d=owned(db,did,u)
 return {"id":d.id,"filename":d.filename,"status":d.status,"summary":json.loads(d.summary_json or "{}"),"clauses":[{"id":c.id,"clause_number":c.clause_number,"title":c.title,"page_number":c.page_number,"text":c.text} for c in db.query(Clause).filter_by(document_id=d.id).all()]}
@app.delete("/api/documents/{did}")
def delete_doc(did:int,db:Session=Depends(get_db),u=Depends(current_user)):
 d=owned(db,did,u)
 db.query(Clause).filter_by(document_id=d.id).delete()
 try:Path(d.stored_path).unlink(missing_ok=True)
 except OSError:pass
 unindex(d.id,u.id)
 db.delete(d);db.commit()
 return {"deleted":True}
def run_processing(did:int,uid:int):
 db=SessionLocal()
 try:
  d=db.get(Document,did)
  text,pages=extract(d.stored_path,d.file_type)
  if not text.strip():raise ValueError("No readable text extracted.")
  cs=segment(text)
  db.query(Clause).filter_by(document_id=did).delete()
  for c in cs:db.add(Clause(document_id=did,**c))
  d.extracted_text=text;db.commit()
  index(did,uid,cs)
  d.status="COMPLETED";db.commit()
  d.summary_json=json.dumps(summary(text),ensure_ascii=False);db.commit()
 except Exception:
  db.rollback()
  d=db.get(Document,did)
  if d:d.status="FAILED";db.commit()
 finally:db.close()
@app.post("/api/documents/{did}/process",status_code=202)
def process(did:int,bg:BackgroundTasks,db:Session=Depends(get_db),u=Depends(current_user)):
 d=owned(db,did,u)
 d.status="PROCESSING";d.summary_json="{}";db.commit()
 bg.add_task(run_processing,d.id,u.id)
 return {"status":"PROCESSING"}
@app.get("/api/documents/{did}/summary")
def getsummary(did:int,db:Session=Depends(get_db),u=Depends(current_user)):
 d=owned(db,did,u)
 if d.status!="COMPLETED":raise HTTPException(409,"Process document first")
 return json.loads(d.summary_json or "{}")
@app.get("/api/documents/{did}/clauses")
def clauses(did:int,db:Session=Depends(get_db),u=Depends(current_user)):
 owned(db,did,u);return [{"clause_number":c.clause_number,"title":c.title,"page_number":c.page_number,"text":c.text} for c in db.query(Clause).filter_by(document_id=did).all()]
@app.get("/api/documents/{did}/risks")
def getrisks(did:int,db:Session=Depends(get_db),u=Depends(current_user)):
 owned(db,did,u);return risks([{"clause_number":c.clause_number,"page_number":c.page_number,"text":c.text} for c in db.query(Clause).filter_by(document_id=did).all()])
@app.get("/api/documents/{did}/conflicts")
def getconflicts(did:int,db:Session=Depends(get_db),u=Depends(current_user)):
 owned(db,did,u);return conflicts([{"clause_number":c.clause_number,"page_number":c.page_number,"text":c.text} for c in db.query(Clause).filter_by(document_id=did).all()])
@app.post("/api/documents/{did}/ask")
def ask(did:int,x:AskIn,db:Session=Depends(get_db),u=Depends(current_user)):
 d=owned(db,did,u)
 src=retrieve(x.question,d.id,u.id)
 if not src:
  src=[{"text":c.text,"page_number":c.page_number,"clause_number":c.clause_number} for c in db.query(Clause).filter_by(document_id=d.id).all() if any(t in c.text.lower() for t in x.question.lower().split() if len(t)>3)][:5]
 if not src:return {"answer":"Insufficient supporting evidence was found in this document.","sources":[],"grounded":False}
 ctx="\n\n".join(f'[Page {s.get("page_number")}, Clause {s.get("clause_number")}]: {s["text"]}' for s in src)
 ans=generate("Answer using ONLY these excerpts. Do not invent laws or facts. If evidence is insufficient, say so.\n"+ctx+"\nQuestion: "+x.question)
 return {"answer":ans or "Gemini is not configured. Review the retrieved excerpts below directly.","sources":[{"page_number":s.get("page_number"),"clause_number":s.get("clause_number"),"text":s["text"][:800]} for s in src],"grounded":True}
@app.post("/api/documents/{did}/what-if")
def whatif(did:int,x:WhatIfIn,db:Session=Depends(get_db),u=Depends(current_user)):
 d=owned(db,did,u);src=retrieve(x.scenario,d.id,u.id,6)
 if not src:src=[{"text":c.text,"page_number":c.page_number,"clause_number":c.clause_number} for c in db.query(Clause).filter_by(document_id=d.id).limit(8).all()]
 ctx="\n\n".join(f'[Page {s.get("page_number")}, Clause {s.get("clause_number")}]: {s["text"]}' for s in src)
 ans=generate(f"Analyze this hypothetical scenario in {x.language}, using only contract evidence. Explain potential consequences and uncertainty; use may/could, not certainty. Scenario: {x.scenario}\nEvidence:\n{ctx}")
 return {"scenario":x.scenario,"analysis":ans or "Configure GEMINI_API_KEY to generate scenario analysis. Review the cited clauses manually.","sources":[{"page_number":s.get("page_number"),"clause_number":s.get("clause_number"),"text":s["text"][:800]} for s in src],"disclaimer":"Informational AI assessment only; not legal advice or a prediction."}
@app.post("/api/drafts/generate")
def draft(x:DraftIn,u=Depends(current_user)):
 ans=generate(f"Draft a preliminary {x.document_type} in {x.language} using only these details: {json.dumps(x.details)}. Mark unknown fields [TO BE COMPLETED]. Include professional review warning.")
 return {"draft":ans or "Configure GEMINI_API_KEY to generate a draft.","disclaimer":"AI-generated preliminary draft; qualified legal review recommended."}
@app.post("/api/translate")
def translate(x:dict,u=Depends(current_user)):
 text=x.get("text","");lang=x.get("language","English")
 if not text:raise HTTPException(422,"text required")
 ans=generate(f"Translate into {lang}, preserving citations, numbers and clause references exactly:\n{text}")
 return {"text":ans or text,"translated":bool(ans)}