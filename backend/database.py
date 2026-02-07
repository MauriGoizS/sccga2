from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# =======================================================
# CONFIGURACIÓN DE LA NUBE
# =======================================================
# Reemplaza con tus datos reales
SUARIO  = "3muvQu4zQLueHAN.root"      # Ej: 2CrP...root
PASSWORD = "VbBCBSVw0yzSURYh"   # La que generaste y copiaste
HOST     = "gateway01.us-east-1.prod.aws.tidbcloud.com"         # Ej: gateway01...tidbcloud.com
PORT     = "4000"                 # TiDB usa el 4000, no el 3306
DB_NAME  = "devcorp_bd"

SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://3muvQu4zQLueHAN.root:VbBCBSVw0yzSURYh@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/devcorp_bd"

# =======================================================
# AQUÍ ESTABA EL DETALLE
# =======================================================
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_recycle=3600,
    pool_pre_ping=True,
    # ESTO ES LO NUEVO: Obligamos a usar SSL
    connect_args={
        "ssl": {
            "ssl_mode": "PREFERRED" 
        }
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()