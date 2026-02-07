export interface Empresa {
    id_empresa?: number; // Es opcional si es un nuevo registro
    // Campos de información personal
    nombre_empresa: string;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string | null;
    telefono: string | null;
    segundo_contacto: string | null;
    correo: string;
    fecha_registro?: string;

    // Relación con la Dirección
    // Esta propiedad contendrá un objeto completo de tipo Direccion
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
