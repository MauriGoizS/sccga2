from fastapi.responses import Response, FileResponse  
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_, text 
from typing import List, Optional
from datetime import datetime
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles 
import json
import os
import shutil
import base64
import uvicorn
import cloudinary
import cloudinary.uploader
from fastapi.responses import RedirectResponse # Agregamos RedirectResponse

# Importaciones locales (deben existir en tu proyecto)
import models, schemas, auth, database
from database import get_db

# Crear las tablas si no existen
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# Configuración de CORS
origins = [
    "http://localhost:4200",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Render leerá estos datos de las Variables de Entorno que configuraremos luego
cloudinary.config( 
  cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"), 
  api_key = os.getenv("CLOUDINARY_API_KEY"), 
  api_secret = os.getenv("CLOUDINARY_API_SECRET"),
  secure = True
)
# --- 1. ENDPOINT DE REGISTRO ---
@app.post("/registrar", response_model=schemas.Token)
def registrar_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    user_exist = db.query(models.Usuario).filter(models.Usuario.nombre_usuario == usuario.nombre_usuario).first()
    if user_exist:
        raise HTTPException(status_code=400, detail="Usuario ya existe")

    hashed_pw = auth.get_password_hash(usuario.password)
    nuevo_usuario = models.Usuario(nombre_usuario=usuario.nombre_usuario, contrasena_hash=hashed_pw)
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    access_token = auth.create_access_token(data={"sub": nuevo_usuario.nombre_usuario})
    return {"access_token": access_token, "token_type": "bearer"}

# --- 2. ENDPOINT DE LOGIN ---
@app.post("/login", response_model=schemas.Token)
def login(form_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.nombre_usuario == form_data.username).first()

    if not user or not auth.verify_password(form_data.password, user.contrasena_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth.create_access_token(data={"sub": user.nombre_usuario})
    return {"access_token": access_token, "token_type": "bearer"}

# --- 3. CRUD DE CATEGORIAS ---

@app.post("/categorias/", response_model=schemas.CategoriaResponse)
def crear_categoria(categoria: schemas.CategoriaCreate, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    db_cat = models.Categoria(nombre_categoria=categoria.nombre_categoria)
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@app.get("/categorias/", response_model=List[schemas.CategoriaResponse])
def leer_categorias(db: Session = Depends(get_db)):
    return db.query(models.Categoria).all()

@app.get("/categorias/{categoria_id}", response_model=schemas.CategoriaResponse)
def leer_categoria(categoria_id: int, db: Session = Depends(get_db)):
    categoria = db.query(models.Categoria).filter(models.Categoria.id_categoria == categoria_id).first()
    if categoria is None:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return categoria

@app.put("/categorias/{categoria_id}", response_model=schemas.CategoriaResponse)
def actualizar_categoria(categoria_id: int, cat_update: schemas.CategoriaCreate, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    categoria = db.query(models.Categoria).filter(models.Categoria.id_categoria == categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    categoria.nombre_categoria = cat_update.nombre_categoria
    db.commit()
    db.refresh(categoria)
    return categoria

@app.delete("/categorias/{categoria_id}")
def eliminar_categoria(categoria_id: int, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    categoria = db.query(models.Categoria).filter(models.Categoria.id_categoria == categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    db.delete(categoria)
    db.commit()
    return {"mensaje": "Categoría eliminada"}

# --- 4. CRUD DE MAQUILEROS ---

@app.post("/maquileros/", response_model=schemas.MaquileroResponse)
def crear_maquilero(maquilero: schemas.MaquileroCreate, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    # 1. Crear Dirección
    datos_direccion = maquilero.direccion.dict() 
    nueva_direccion = models.Direccion(**datos_direccion)
    
    db.add(nueva_direccion)
    db.commit()
    db.refresh(nueva_direccion)

    # 2. Crear Maquilero
    nuevo_maquilero = models.Maquilero(
        id_direccion=nueva_direccion.id_direccion,
        nombres=maquilero.nombres,
        apellido_paterno=maquilero.apellido_paterno,
        apellido_materno=maquilero.apellido_materno,
        telefono=maquilero.telefono,
        segundo_contacto=maquilero.segundo_contacto,
        correo=maquilero.correo
    )

    try:
        db.add(nuevo_maquilero)
        db.commit()
        db.refresh(nuevo_maquilero)
        return nuevo_maquilero
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/maquileros/", response_model=List[schemas.MaquileroResponse])
def leer_maquileros(db: Session = Depends(get_db)):
    return db.query(models.Maquilero).all()

@app.delete("/maquileros/{maquilero_id}")
def eliminar_maquilero(maquilero_id: int, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    maquilero = db.query(models.Maquilero).filter(models.Maquilero.id_maquilero == maquilero_id).first()
    if not maquilero:
        raise HTTPException(status_code=404, detail="Maquilero no encontrado")

    db.delete(maquilero)
    db.commit()
    return {"mensaje": "Maquilero eliminado"}

@app.get("/maquileros/{maquilero_id}", response_model=schemas.MaquileroResponse)
def obtener_maquilero(maquilero_id: int, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    maquilero = db.query(models.Maquilero).filter(models.Maquilero.id_maquilero == maquilero_id).first()
    if not maquilero:
        raise HTTPException(status_code=404, detail="Maquilero no encontrado")
    return maquilero

@app.put("/maquileros/{maquilero_id}", response_model=schemas.MaquileroResponse)
def actualizar_maquilero(maquilero_id: int, datos_nuevos: schemas.MaquileroSchema, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    maquilero_db = db.query(models.Maquilero).filter(models.Maquilero.id_maquilero == maquilero_id).first()
    if not maquilero_db:
        raise HTTPException(status_code=404, detail="Maquilero no encontrado")

    maquilero_db.nombres = datos_nuevos.nombres
    maquilero_db.apellido_paterno = datos_nuevos.apellido_paterno
    maquilero_db.apellido_materno = datos_nuevos.apellido_materno
    maquilero_db.telefono = datos_nuevos.telefono
    maquilero_db.segundo_contacto = datos_nuevos.segundo_contacto
    maquilero_db.correo = datos_nuevos.correo

    if maquilero_db.direccion:
        maquilero_db.direccion.calle = datos_nuevos.direccion.calle
        maquilero_db.direccion.numero_exterior = datos_nuevos.direccion.numero_exterior
        maquilero_db.direccion.numero_interior = datos_nuevos.direccion.numero_interior
        maquilero_db.direccion.codigo_postal = datos_nuevos.direccion.codigo_postal
        maquilero_db.direccion.colonia = datos_nuevos.direccion.colonia
        maquilero_db.direccion.municipio = datos_nuevos.direccion.municipio
        maquilero_db.direccion.ciudad = datos_nuevos.direccion.ciudad

    db.commit()
    db.refresh(maquilero_db)
    return maquilero_db

# --- 5. CRUD DE EMPRESAS ---

@app.post("/empresas/", response_model=schemas.EmpresaResponse)
def crear_empresa(empresa: schemas.EmpresaCreate, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    datos_direccion = empresa.direccion.dict()
    nueva_direccion = models.Direccion(**datos_direccion)
    
    db.add(nueva_direccion)
    db.commit()
    db.refresh(nueva_direccion)

    nueva_empresa = models.Empresa(
        id_direccion=nueva_direccion.id_direccion,
        nombre_empresa=empresa.nombre_empresa,
        nombres=empresa.nombres,
        apellido_paterno=empresa.apellido_paterno,
        apellido_materno=empresa.apellido_materno,
        telefono=empresa.telefono,
        segundo_contacto=empresa.segundo_contacto,
        correo=empresa.correo
    )

    try:
        db.add(nueva_empresa)
        db.commit()
        db.refresh(nueva_empresa)
        return nueva_empresa
    except Exception as e:
        db.rollback()
        print(f"Error al guardar empresa: {e}") 
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/empresas/", response_model=List[schemas.EmpresaResponse])
def leer_empresas(db: Session = Depends(get_db)):
    return db.query(models.Empresa).all()

@app.delete("/empresas/{empresa_id}")
def eliminar_empresa(empresa_id: int, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    empresa = db.query(models.Empresa).filter(models.Empresa.id_empresa == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    db.delete(empresa)
    db.commit()
    return {"mensaje": "Empresa eliminada"}

@app.get("/empresas/{empresa_id}", response_model=schemas.EmpresaResponse)
def obtener_empresa(empresa_id: int, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    empresa = db.query(models.Empresa).filter(models.Empresa.id_empresa == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    return empresa

@app.put("/empresas/{empresa_id}", response_model=schemas.EmpresaResponse)
def actualizar_empresa(empresa_id: int, datos_nuevos: schemas.EmpresaSchema, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    empresa_db = db.query(models.Empresa).filter(models.Empresa.id_empresa == empresa_id).first()
    if not empresa_db:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    empresa_db.nombre_empresa = datos_nuevos.nombre_empresa
    empresa_db.nombres = datos_nuevos.nombres
    empresa_db.apellido_paterno = datos_nuevos.apellido_paterno
    empresa_db.apellido_materno = datos_nuevos.apellido_materno
    empresa_db.telefono = datos_nuevos.telefono
    empresa_db.segundo_contacto = datos_nuevos.segundo_contacto
    empresa_db.correo = datos_nuevos.correo

    if empresa_db.direccion:
        empresa_db.direccion.calle = datos_nuevos.direccion.calle
        empresa_db.direccion.numero_exterior = datos_nuevos.direccion.numero_exterior
        empresa_db.direccion.numero_interior = datos_nuevos.direccion.numero_interior
        empresa_db.direccion.codigo_postal = datos_nuevos.direccion.codigo_postal
        empresa_db.direccion.colonia = datos_nuevos.direccion.colonia
        empresa_db.direccion.municipio = datos_nuevos.direccion.municipio
        empresa_db.direccion.ciudad = datos_nuevos.direccion.ciudad

    db.commit()
    db.refresh(empresa_db)
    return empresa_db

# --- 6. CRUD DE MODELO ---

@app.post("/modelo", response_model=schemas.ModeloResponse)
async def crear_modelo(modelo_in: schemas.ModeloCreate, db: Session = Depends(get_db)):
    # 1. Verificar existencia
    if db.query(models.Modelo).filter(models.Modelo.modelo == modelo_in.modelo).first():
        raise HTTPException(status_code=400, detail=f"El código '{modelo_in.modelo}' ya existe.")

    # 2. Instancia inicial
    nuevo_modelo = models.Modelo(
        nombre_modelo=modelo_in.nombre_modelo,
        id_categoria=modelo_in.id_categoria,
        modelo=modelo_in.modelo,
        canvas_json=modelo_in.canvas_json
    )

    # 3. Procesar Imagen 1 (Canvas) - VERSIÓN CLOUDINARY
    if modelo_in.imagen_resultado:
        try:
            # Cloudinary acepta directamente el string base64 (data:image...)
            upload_result = cloudinary.uploader.upload(modelo_in.imagen_resultado, folder="sccga_modelos")
            nuevo_modelo.imagen1 = upload_result["secure_url"] # Guardamos el LINK de internet
        except Exception as e:
            print(f"Error subiendo imagen1 a Cloudinary: {e}")

    # 4. Procesar Imagen 2 (Referencia Real) - VERSIÓN CLOUDINARY
    if hasattr(modelo_in, 'imagen2') and modelo_in.imagen2:
        try:
            upload_result = cloudinary.uploader.upload(modelo_in.imagen2, folder="sccga_referencias")
            nuevo_modelo.imagen2 = upload_result["secure_url"]
        except Exception as e:
            print(f"Error subiendo imagen2 a Cloudinary: {e}")

    db.add(nuevo_modelo)
    db.commit()
    db.refresh(nuevo_modelo)

    # 5. Guardar Operaciones
    for op_data in modelo_in.operaciones:
        db.add(models.Operacion(id_modelo=nuevo_modelo.id_modelo, **op_data.dict()))
    
    db.commit()
    db.refresh(nuevo_modelo)
    return nuevo_modelo

@app.get("/modelo/{id_modelo}")
def get_modelo_por_id(id_modelo: int, db: Session = Depends(get_db)):
    modelo = db.query(models.Modelo).filter(models.Modelo.id_modelo == id_modelo).first()
    
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo no encontrado")

    operaciones = db.query(models.Operacion).filter(models.Operacion.id_modelo == id_modelo).all()

    return {
        "id_modelo": modelo.id_modelo,
        "nombre_modelo": modelo.nombre_modelo,
        "id_categoria": modelo.id_categoria,
        "modelo": modelo.modelo,
        "imagen1": modelo.imagen1, 
        "imagen2": modelo.imagen2,
        "canvas_json": modelo.canvas_json,
        "operaciones": [
            {
                "nombre_operacion": op.nombre_operacion,
                "nombre_maquina": op.nombre_maquina,
                "hilos": op.hilos,
                "color_hilo": op.color_hilo,
                "ppp": op.ppp,
                "botones": op.botones,
                "observaciones": op.observaciones
            } 
            for op in operaciones
        ]
    }

@app.put("/modelo/{id_modelo}")
async def actualizar_modelo(
    id_modelo: int,
    modelo_in: schemas.ModeloCreate, 
    db: Session = Depends(get_db)
):
    db_modelo = db.query(models.Modelo).filter(models.Modelo.id_modelo == id_modelo).first()
    if not db_modelo:
        raise HTTPException(status_code=404, detail="Modelo no encontrado")

    # 1. Actualizar campos básicos
    db_modelo.nombre_modelo = modelo_in.nombre_modelo
    db_modelo.id_categoria = modelo_in.id_categoria
    db_modelo.modelo = modelo_in.modelo
    db_modelo.canvas_json = modelo_in.canvas_json

    # 2. Procesar imagen1 (Si cambió)
    if modelo_in.imagen_resultado and modelo_in.imagen_resultado.startswith("data:image"):
        try:
            upload_result = cloudinary.uploader.upload(modelo_in.imagen_resultado, folder="sccga_modelos")
            db_modelo.imagen1 = upload_result["secure_url"]
        except Exception as e:
            print(f"Error actualizando imagen1: {e}")

    # 3. Procesar imagen2 (Si cambió)
    if hasattr(modelo_in, 'imagen2') and modelo_in.imagen2 and modelo_in.imagen2.startswith("data:image"):
        try:
            upload_result = cloudinary.uploader.upload(modelo_in.imagen2, folder="sccga_referencias")
            db_modelo.imagen2 = upload_result["secure_url"]
        except Exception as e:
            print(f"Error actualizando imagen2: {e}")

    # 4. Limpiar y recrear operaciones
    db.query(models.Operacion).filter(models.Operacion.id_modelo == id_modelo).delete()
    for op_data in modelo_in.operaciones:
        nueva_op = models.Operacion(
            id_modelo=id_modelo,
            nombre_operacion=op_data.nombre_operacion,
            nombre_maquina=op_data.nombre_maquina,
            hilos=op_data.hilos,
            color_hilo=op_data.color_hilo,
            ppp=op_data.ppp,
            botones=op_data.botones,
            observaciones=op_data.observaciones
        )
        db.add(nueva_op)

    db.commit()
    db.refresh(db_modelo)
    return db_modelo

@app.get("/modelos", response_model=List[schemas.ModeloResponse])
def leer_modelos(
    skip: int = 0, 
    limit: int = 50, 
    q: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    query = db.query(models.Modelo)

    if q:
        search = f"%{q}%"
        query = query.filter(
            or_(
                models.Modelo.nombre_modelo.ilike(search),
                models.Modelo.modelo.ilike(search)
            )
        )

    query = query.order_by(models.Modelo.id_modelo.desc())

    return query.offset(skip).limit(limit).all()

@app.delete("/modelo/{modelo_id}")
def eliminar_modelo(modelo_id: int, db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    modelo = db.query(models.Modelo).filter(models.Modelo.id_modelo == modelo_id).first()
    
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo no encontrado")

    if modelo.imagen1 and os.path.exists(modelo.imagen1):
        try: os.remove(modelo.imagen1)
        except Exception: pass

    if modelo.imagen2 and os.path.exists(modelo.imagen2):
        try: os.remove(modelo.imagen2)
        except Exception: pass

    db.query(models.Operacion).filter(models.Operacion.id_modelo == modelo_id).delete()
    db.delete(modelo)
    db.commit()
    return {"mensaje": "Modelo y archivos eliminados correctamente"}

@app.get("/operaciones/modelo/{id_modelo}", response_model=List[schemas.Operacion]) 
def read_operaciones_por_modelo(id_modelo: int, db: Session = Depends(get_db)):
    operaciones = db.query(models.Operacion).filter(models.Operacion.id_modelo == id_modelo).all()
    return operaciones if operaciones else []

# --- 7. ENDPOINT PRINCIPAL: CREAR FORMATO (ENCARGO) ---
@app.post("/formato", response_model=schemas.EncargoResponse)
def create_encargo(encargo: schemas.EncargoCreate, db: Session = Depends(get_db)):
    try:
        # 1. Crear el encabezado del formato
        db_encargo = models.Formato(
            id_empresa=encargo.id_empresa,
            id_maquilero=encargo.id_maquilero,
            id_modelo=encargo.id_modelo,
            id_estatus=encargo.id_estatus,
            piezas=encargo.piezas,
            observaciones=encargo.observaciones
        )
        
        db.add(db_encargo)
        db.commit()
        db.refresh(db_encargo)

        # 2. Crear los detalles (Tallas)
        if encargo.detalles:
            for detalle in encargo.detalles:
                # Verificación de seguridad básica
                if detalle.cantidad > 0:
                    nuevo_detalle = models.FormatoTalla(
                        id_formato=db_encargo.id_formato,
                        id_tallas=detalle.id_tallas,
                        cantidad=detalle.cantidad
                    )
                    db.add(nuevo_detalle)
            
            db.commit()
        
        return db_encargo

    except Exception as e:
        db.rollback() # Deshacer cambios si algo falla
        print(f"Error al crear formato: {e}") # Ver error en consola de Python
        # Devolver error legible al Frontend
        raise HTTPException(status_code=400, detail=f"Error en base de datos: {str(e)}")

# --- UTILERIAS ---

# En main.py

@app.get("/siguiente_secuencia/{id_categoria}")
def obtener_siguiente_secuencia(id_categoria: int, db: Session = Depends(get_db)):
    # Traemos TODOS los modelos de esa categoría, no solo el último
    modelos = db.query(models.Modelo)\
        .filter(models.Modelo.id_categoria == id_categoria)\
        .all()

    max_secuencia = 0

    for m in modelos:
        # Intentamos extraer los últimos 5 dígitos de CADA modelo
        try:
            # Solo si los últimos 5 caracteres son números
            codigo = m.modelo
            if codigo and len(codigo) >= 5:
                secuencia = int(codigo[-5:])
                if secuencia > max_secuencia:
                    max_secuencia = secuencia
        except ValueError:
            # Si un modelo tiene nombre raro, lo ignoramos y seguimos buscando
            continue
    
    # Devolvemos el número más alto encontrado + 1
    return {"siguiente_secuencia": max_secuencia + 1}
    
@app.get("/estatus")
def obtener_estatus(db: Session = Depends(get_db)):
    return db.query(models.Estatus).all()

@app.get("/tallas")
def obtener_tallas(db: Session = Depends(get_db)):
    return db.query(models.Tallas).all()

@app.get("/direcciones/{id}", response_model=schemas.DireccionSchema)
def get_direccion(id: int, db: Session = Depends(get_db)):
    dir_db = db.query(models.Direccion).filter(models.Direccion.id_direccion == id).first()
    if not dir_db:
        raise HTTPException(status_code=404, detail="Dirección no encontrada")
    return dir_db

@app.get("/encargos")
def obtener_encargos(db: Session = Depends(get_db)):
    sql = text("""
        SELECT 
            MIN(f.id_formato) as id_formato,
            m.nombres AS maquilero, 
            e.nombre_empresa AS empresa,
            
            GROUP_CONCAT(
                CONCAT(
                    '• ', mdl.nombre_modelo, ': ', 
                    COALESCE(
                        (
                            SELECT CONCAT('[ ', GROUP_CONCAT(CONCAT(t.nombre_talla, ': ', ft.cantidad) SEPARATOR ', '), ' ]')
                            FROM formato_tallas ft
                            INNER JOIN tallas t ON ft.id_tallas = t.id_tallas
                            WHERE ft.id_formato = f.id_formato
                        ), 
                        ''
                    )
                ) SEPARATOR '\n'
            ) AS tallas,
            
            SUM(f.piezas) AS piezas_totales,
            f.fecha_creacion AS fecha_encargo,
            MAX(f.fecha_entrega) AS fecha_entrega,
            MAX(es.estatus_encargo) AS estatus
            
        FROM formato f
        INNER JOIN maquileros m ON f.id_maquilero = m.id_maquilero
        INNER JOIN empresa e ON f.id_empresa = e.id_empresa
        INNER JOIN estatus_encargo es ON f.id_estatus = es.id_estatus
        
        -- CAMBIO IMPORTANTE: Usamos 'mdl' en lugar de 'mod'
        -- OJO: Si tu tabla en la base de datos se llama 'diseno', cambia 'LEFT JOIN modelo' por 'LEFT JOIN diseno'
        LEFT JOIN modelo mdl ON f.id_modelo = mdl.id_modelo 
        
        GROUP BY f.fecha_creacion, f.id_maquilero, f.id_empresa
        ORDER BY f.fecha_creacion DESC;
    """)
    
    result = db.execute(sql).mappings().all()
    return result

@app.put("/encargos/{id_formato}/estatus")
def actualizar_estatus(id_formato: int, id_nuevo_estatus: int, db: Session = Depends(get_db)):
    encargo = db.query(models.Formato).filter(models.Formato.id_formato == id_formato).first()
    
    if not encargo:
        raise HTTPException(status_code=404, detail="Encargo no encontrado")

    encargo.id_estatus = id_nuevo_estatus

    if id_nuevo_estatus == 2:
        encargo.fecha_entrega = datetime.now() # Guarda fecha y hora exacta
    else:
        pass
    db.commit()
    
    return {"mensaje": "Estatus actualizado correctamente"}

@app.post("/formato/{id_formato}/subir-pdf")
async def subir_pdf_formato(id_formato: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    # 1. Buscar el formato
    formato = db.query(models.Formato).filter(models.Formato.id_formato == id_formato).first()
    if not formato:
        raise HTTPException(status_code=404, detail="Formato no encontrado")

    try:
        # 2. Subir directamente el archivo a Cloudinary
        # resource_type="auto" permite detectar que es un PDF
        upload_result = cloudinary.uploader.upload(file.file, resource_type="auto", folder="sccga_pdfs")
        
        # 3. Obtener la URL segura
        ruta_nube = upload_result["secure_url"]
        
        # 4. Guardar la URL en la BD
        formato.ruta_pdf = ruta_nube
        db.commit()
        
        return {"mensaje": "PDF guardado correctamente en la nube", "ruta": ruta_nube}
        
    except Exception as e:
        print(f"Error subiendo PDF: {e}")
        raise HTTPException(status_code=500, detail="Error al subir el archivo a la nube")
    
# Endpoint para VER el PDF guardado
@app.get("/formato/{id_formato}/pdf") 
def ver_pdf_guardado(id_formato: int, db: Session = Depends(get_db)):
    formato = db.query(models.Formato).filter(models.Formato.id_formato == id_formato).first()
    
    if not formato or not formato.ruta_pdf:
        raise HTTPException(status_code=404, detail="PDF no encontrado")
        
    # Redirigir al navegador a la URL de Cloudinary
    return RedirectResponse(url=formato.ruta_pdf)

if __name__ == "__main__":
    print(">>> Iniciando el servidor del sistema SCCGA...")
    # host 127.0.0.1 es para local, port 8000 es el que busca tu frontend
    uvicorn.run(app, host="127.0.0.1", port=8000)

