export interface Formato {
  id?: number;
  idEmpresa: number;
  idMaquilero: number;// El "Maquilero"
  idModelo: number;
  idEstatus: number;
  idTallas: number;
  fecha: Date;
  piezas: number;
  detalles: string;
}

// Interfaces auxiliares para llenar los selectores (Dropdowns)
export interface Empresa {
  id: number;
  nombre_empresa: string;
}

export interface Maquilero {
  id: number;
  nombres: string;
}

export interface Diseno {
  id: number;
  nombre_modelo: string;
}

export interface Estatus {
  id_estatus?: number;
  estatus_encargo: string;
}

export interface Tallas {
  id_tallas?: number;
  nombre_talla: string;
}

export interface FormatoDetalle {
  id_formato: number;
  nombre_maquilero: string;  
  nombre_empresa: string;    
  tallas_descripcion: string; 
  piezas_totales: number;
  fecha_encargo: string;     
  estatus: string;           
}