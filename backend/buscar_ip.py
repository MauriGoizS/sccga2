from passlib.context import CryptContext

# Configuración igual a la que tienes en tu proyecto
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

hash_a_probar = "$argon2id$v=19$m=65536,t=3,p=4$jxHCWEvJ+b/XGgPgvJcSwg$FMSkh/wEMa9q83Dqau/n/lFcg9xXUIG4aosEC5kBuxk"

# Prueba aquí la contraseña que creas que es (ejemplo: 'admin123')
password_candidata = "12345" 

if pwd_context.verify(password_candidata, hash_a_probar):
    print("¡Coincide! Esa es la contraseña original.")
else:
    print("No coincide. Sigue intentando o resetea el campo en Workbench.")