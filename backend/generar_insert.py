from passlib.context import CryptContext

# Configuración explícita para usar Argon2
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# Datos de prueba
usuario = "admin"
password_plano = "12345"

# Generar el hash (ahora será formato Argon2)
password_hash = pwd_context.hash(password_plano)

# Imprimir la sentencia SQL
print("--- COPIA Y EJECUTA ESTA LÍNEA EN TU BASE DE DATOS ---")
print(f"INSERT INTO usuario (nombre_usuario, contrasena_hash) VALUES ('{usuario}', '{password_hash}');")