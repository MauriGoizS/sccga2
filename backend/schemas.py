from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

# --- AUTH & USUARIO ---
class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UsuarioCreate(BaseModel):
    nombre_usuario: str
    password: str

# --- CATEGORIA ---
class CategoriaBase(BaseModel):
    nombre_categoria: str

class CategoriaCreate(CategoriaBase):
    pass

class CategoriaResponse(CategoriaBase):
    id_categoria: int
    class Config:
        from_attributes = True 

# --- DIRECCION (Base para Maquilero y Empresa) ---
class DireccionBase(BaseModel):
    calle: str
    numero_exterior: str
    numero_interior: Optional[str] = None
    codigo_postal: str
    colonia: str
    municipio: str
    ciudad: str

class DireccionSchema(DireccionBase):
    id_direccion: int
    class Config:
        from_attributes = True

# --- MAQUILERO ---
class MaquileroBase(BaseModel):
    nombres: str
    apellido_paterno: str
    apellido_materno: str
    telefono: str
    segundo_contacto: Optional[str] = None
    correo: str

class MaquileroCreate(MaquileroBase):
    direccion: DireccionBase

class MaquileroResponse(MaquileroBase):
    id_maquilero: int
    fecha_registro: datetime
    direccion: DireccionSchema 
    class Config:
        from_attributes = True

# Schema específico para Actualizar (PUT)
class MaquileroSchema(MaquileroBase):
    apellido_materno: Optional[str] = None
    direccion: DireccionSchema 
    class Config:
        from_attributes = True

# --- EMPRESA ---
class EmpresaBase(BaseModel):
    nombre_empresa: str
    nombres: str
    apellido_paterno: str
    apellido_materno: str
    telefono: str
    segundo_contacto: Optional[str] = None
    correo: str

class EmpresaCreate(EmpresaBase):
    direccion: DireccionBase

class EmpresaResponse(EmpresaBase):
    id_empresa: int
    fecha_registro: datetime
    direccion: DireccionSchema 
    class Config:
        from_attributes = True

class EmpresaSchema(EmpresaBase):
    apellido_materno: Optional[str] = None
    direccion: DireccionSchema 
    class Config:
        from_attributes = True

# --- OPERACION ---
class OperacionBase(BaseModel):
    nombre_operacion: str
    nombre_maquina: Optional[str] = None
    hilos: Optional[int] = None
    color_hilo: Optional[str] = None
    ppp: Optional[int] = None
    botones: Optional[int] = None
    observaciones: Optional[str] = None

class OperacionCreate(OperacionBase):
    @field_validator('hilos', 'ppp', 'botones', mode='before')
    @classmethod
    def empty_string_to_none(cls, v):
        if v == "": return None
        return v

class OperacionResponse(OperacionBase):
    id_operacion: int
    id_modelo: int
    class Config:
        from_attributes = True

class Operacion(OperacionBase):
    id_operacion: int
    id_modelo: int
    class Config:
        from_attributes = True

# --- MODELO ---
class ModeloBase(BaseModel):
    nombre_modelo: str
    id_categoria: int
    modelo: str 
    canvas_json: Optional[str] = None
    imagen2: Optional[str] = None

# NUEVO: Este esquema recibirá los datos de Angular
class ModeloCreate(ModeloBase):
    imagen_resultado: str  # El Base64 que viene del canvas
    operaciones: List[OperacionBase] = []

class ModeloUpdate(ModeloCreate):
    id_modelo: int

class ModeloResponse(ModeloBase):
    id_modelo: int
    fecha_registro: datetime
    imagen1: Optional[str] = None # Aquí es donde FastAPI mapeará imagen_resultado
    imagen2: Optional[str] = None
    # ¡CRÍTICO! Sin esto, el backend nunca le enviará el diseño a Angular
    canvas_json: Optional[str] = None 
    operaciones: List[Operacion] = [] 
    class Config:
        from_attributes = True 

# --- FORMATO / ENCARGO ---

# 1. Esquema para el detalle individual (una talla y su cantidad)
class DetalleTallaCreate(BaseModel):
    id_tallas: int
    cantidad: int

# 2. Esquema principal para recibir el pedido
class EncargoCreate(BaseModel):
    id_empresa: int
    id_maquilero: int
    id_modelo: int
    id_estatus: int
    piezas: int
    observaciones: Optional[str] = None
    
    detalles: List[DetalleTallaCreate] = []

    @field_validator('id_empresa', 'id_maquilero', 'id_modelo', 'id_estatus', 'piezas', mode='before')
    @classmethod
    def parse_int_safe(cls, v):
        if v == "" or v is None:
            return None 
        return int(v)

    class Config:
        from_attributes = True

class EncargoResponse(EncargoCreate):
    id_formato: int
    fecha_creacion: Optional[datetime] = None
    class Config:
        from_attributes = True