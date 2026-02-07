export interface Maquilero {
    id_maquilero?: number;
    nombre_empresa?: string; 
    fecha_registro?: string; // O Date, dependiendo de cómo venga del backend
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string | null;
    telefono: string | null;
    segundo_contacto: string | null;
    correo: string;

    direccion: Direccion;
}

export interface Direccion {
    id_direccion?: number;
    calle: string;
    numero_exterior: string;
    numero_interior: string | null;
    codigo_postal: string;
    colonia: string;
    municipio: string;
    ciudad: string;
}