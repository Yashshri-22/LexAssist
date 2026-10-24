from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core import settings
args={"check_same_thread":False} if settings.database_url.startswith("sqlite") else {}
engine=create_engine(settings.database_url,connect_args=args,pool_pre_ping=True)
SessionLocal=sessionmaker(autocommit=False,autoflush=False,bind=engine)
Base=declarative_base()
def get_db():
    db=SessionLocal()
    try: yield db
    finally: db.close()
