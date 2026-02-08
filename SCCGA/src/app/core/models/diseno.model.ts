export interface Categoria {
  id_categoria: number;
  nombre_categoria: string;
  codigo_categoria?: string;
}

export interface Operacion {
  nombre_operacion: string;
  nombre_maquina: string;
  hilos: string;
  color_hilo: string;
  ppp: string;
  botones: string;
  observaciones: string;
}

export interface ModeloNuevo {
  id_modelo: number;
  nombre_modelo: string;
  id_categoria: number;
  modelo: string;
  operaciones: Operacion[];
  // Las imágenes no se declaran aquí estrictamente porque van como binarios,
  // pero sirven de referencia.
  imagen1?: string | any;
  imagen2?: string | any;
}
