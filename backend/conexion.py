from dotenv import load_dotenv
import os
from supabase import create_client, Client

class ConexionBD:
    def _init_(self):
        # Esto carga las variables de entorno al crear la instancia
        load_dotenv()

    def conexionSupabase(self):
        url = os.getenv("SUPABASE_URL")
        api_key = os.getenv("SUPABASE_API_KEY")
        
        # Validar que las credenciales existan antes de intentar conectar
        if not url or not api_key:
            raise ValueError("Faltan las credenciales SUPABASE_URL o SUPABASE_API_KEY en el archivo .env")

        cliente = create_client(url, api_key)
        return cliente

# --- ZONA DE EJECUCIÓN (Fuera de la clase) ---

# El bloque if _name_ == "_main_": asegura que este código solo corra
# si ejecutas este archivo directamente, y no si lo importas desde otro lado.
if __name__ == "_main_":
    try:
        # 1. Instanciar la clase (Crear el objeto)
        # Nota los paréntesis () al final. Esto llama a _init_
        mi_conexion = ConexionBD() 
        
        # 2. Llamar al método usando la instancia creada
        cliente_supabase = mi_conexion.conexionSupabase()
        
        print("Conexión exitosa:", cliente_supabase)
        
    except Exception as e:
        print(f"Ocurrió un error: {e}")