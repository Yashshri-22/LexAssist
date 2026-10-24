from datetime import datetime,timedelta,timezone
from jose import jwt
from passlib.context import CryptContext
from fastapi import Depends,HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core import settings
from app.db import get_db
from app.models import User
pwd=CryptContext(schemes=["bcrypt"],deprecated="auto")
oauth=OAuth2PasswordBearer(tokenUrl="/api/auth/login")
def hash_password(p): return pwd.hash(p)
def verify_password(p,h): return pwd.verify(p,h)
def token(uid): return jwt.encode({"sub":str(uid),"exp":datetime.now(timezone.utc)+timedelta(hours=12)},settings.jwt_secret,algorithm="HS256")
def current_user(t:str=Depends(oauth),db:Session=Depends(get_db)):
    try: uid=int(jwt.decode(t,settings.jwt_secret,algorithms=["HS256"])["sub"])
    except Exception: raise HTTPException(401,"Invalid or expired token")
    u=db.query(User).filter(User.id==uid).first()
    if not u: raise HTTPException(401,"Invalid user")
    return u
