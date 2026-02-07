from sqlalchemy import Column, Integer, String, ForeignKey, Text, TIMESTAMP, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

# --- Tablas de Sistema / Usuarios ---
class Usuario(Base):
    __tablename__ = "usuario"
    id_usuario = Column(Integer, primary_key=True, index=True)
    nombre_usuario = Column(String(100), nullable=False)
    contrasena_hash = Column(String(255), nullable=False)

class Categoria(Base):
    __tablename__ = "categoria"
    id_categoria = Column(Integer, primary_key=True, index=True)
    nombre_categoria = Column(String(50))

class Direccion(Base):
    __tablename__ = "direcciones"
    id_direccion = Column(Integer, primary_key=True, index=True)
    calle = Column(String(100), nullable=False)
    numero_exterior = Column(String(10), nullable=False)
    numero_interior = Column(String(10))
    codigo_postal = Column(String(10), nullable=False)
    colonia = Column(String(100), nullable=False)
    municipio = Column(String(100), nullable=False)
    ciudad = Column(String(100), nullable=False)

# --- Catálogos Principales ---
class Empresa(Base):
    __tablename__ = "empresa"
    __table_args__ = {'extend_existing': True} 
    
    id_empresa = Column(Integer, primary_key=True, index=True)
    id_direccion = Column(Integer, ForeignKey("direcciones.id_direccion"))
    nombre_empresa = Column(String(100), nullable=False)
    nombres = Column(String(100), nullable=False)
    apellido_paterno = Column(String(100), nullable=False)
    apellido_materno = Column(String(100), nullable=False)
    telefono = Column(String(20), nullable=False)
    segundo_contacto = Column(String(20), nullable=True)
    correo = Column(String(255), unique=True, nullable=False)
    fecha_registro = Column(TIMESTAMP, server_default=func.now())
    
    direccion = relationship("Direccion")
    # Agregado back_populates para consistencia
    formatos = relationship("Formato", back_populates="empresa", cascade="all, delete-orphan")

class Maquilero(Base):
    __tablename__ = "maquileros"
    __table_args__ = {'extend_existing': True} 

    id_maquilero = Column(Integer, primary_key=True, index=True)
    id_direccion = Column(Integer, ForeignKey("direcciones.id_direccion"))
    
    nombres = Column(String(100), nullable=False)
    apellido_paterno = Column(String(100), nullable=False)
    apellido_materno = Column(String(100), nullable=False)
    telefono = Column(String(20), nullable=False)
    segundo_contacto = Column(String(20), nullable=True)
    correo = Column(String(255), unique=True, nullable=False)
    fecha_registro = Column(TIMESTAMP, server_default=func.now())
    
    direccion = relationship("Direccion")
    formatos = relationship("Formato", back_populates="maquilero", cascade="all, delete-orphan")

class Modelo(Base):
    __tablename__ = "modelo" 
    __table_args__ = {'extend_existing': True} 

    id_modelo = Column(Integer, primary_key=True, index=True)
    id_categoria = Column(Integer, ForeignKey("categoria.id_categoria"))
    nombre_modelo = Column(String(100), nullable=False)
    modelo = Column(String(50), nullable=False) 
    imagen1 = Column(Text, nullable=True)  
    imagen2 = Column(String(255), nullable=True)
    canvas_json = Column(Text, nullable=True)
    fecha_registro = Column(TIMESTAMP, server_default=func.now())

    categoria = relationship("Categoria")
    operaciones = relationship("Operacion", back_populates="modelo")

class Operacion(Base):
    __tablename__ = "operaciones"
    __table_args__ = {'extend_existing': True} 

    id_operacion = Column(Integer, primary_key=True, index=True)
    id_modelo = Column(Integer, ForeignKey("modelo.id_modelo"))
    nombre_operacion = Column(String(100), nullable=False)
    nombre_maquina = Column(String(100), nullable=True)
    hilos = Column(Integer, nullable=True)
    color_hilo = Column(String(100), nullable=True)
    ppp = Column(Integer, nullable=True)
    botones = Column(Integer, nullable=True)
    observaciones = Column(Text, nullable=True)
    
    modelo = relationship("Modelo", back_populates="operaciones")

# --- Tablas de Formato y Detalle ---

class Estatus(Base):
    __tablename__ = "estatus_encargo"
    id_estatus = Column(Integer, primary_key=True, index=True)
    estatus_encargo = Column(String(50))

class Tallas(Base):
    __tablename__ = "tallas"
    id_tallas = Column(Integer, primary_key=True, index=True)
    nombre_talla = Column(String(50))

# --- NUEVA TABLA: DETALLE DE TALLAS ---
class FormatoTalla(Base):
    __tablename__ = "formato_tallas"
    __table_args__ = {'extend_existing': True}

    # --- CORRECCIÓN CRÍTICA ---
    id = Column(Integer, primary_key=True, index=True)
    
    id_formato = Column(Integer, ForeignKey("formato.id_formato", ondelete="CASCADE"))
    id_tallas = Column(Integer, ForeignKey("tallas.id_tallas"))
    cantidad = Column(Integer)

    formato = relationship("Formato", back_populates="detalles")
    talla = relationship("Tallas")


class Formato(Base):
    __tablename__ = "formato"
    __table_args__ = {'extend_existing': True} 

    id_formato = Column(Integer, primary_key=True, index=True)
    id_empresa = Column(Integer, ForeignKey("empresa.id_empresa"))
    id_maquilero = Column(Integer, ForeignKey("maquileros.id_maquilero", ondelete="CASCADE"))
    id_modelo = Column(Integer, ForeignKey("modelo.id_modelo")) 
    id_estatus = Column(Integer, ForeignKey("estatus_encargo.id_estatus"))
    
    piezas = Column(Integer)
    observaciones = Column(Text, nullable=True)
    fecha_creacion = Column(TIMESTAMP, server_default=func.now())
    fecha_entrega = Column(DateTime, nullable=True)
    ruta_pdf = Column(String(255), nullable=True)

    # Relaciones
    # CAMBIO: Agregado back_populates="formatos" para sincronizar con la clase Empresa
    empresa = relationship("Empresa", back_populates="formatos")
    maquilero = relationship("Maquilero", back_populates="formatos")
    modelo = relationship("Modelo")
    estatus = relationship("Estatus")
        
    # CAMBIO IMPORTANTE: Renombrado de 'detalles_tallas' a 'detalles' 
    # para que coincida con schemas.py (EncargoCreate.detalles)
    detalles = relationship("FormatoTalla", back_populates="formato", cascade="all, delete-orphan")