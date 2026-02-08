import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { Categoria, ModeloNuevo } from '../models/diseno.model';

// --- INTERFAZ PARA RESPUESTA (DATA + TOTAL) ---
export interface RespuestaPaginada {
  data: ModeloNuevo[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class DisenoService {

  // Ajusta tu puerto si es necesario
  private apiUrl = 'https://sccga2.onrender.com';

  // --- VARIABLES DE MEMORIA (CACHÉ) ---
  private cacheModelos: ModeloNuevo[] = [];

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  private getHeaders(isFormData: boolean = false): HttpHeaders {
    let headers = new HttpHeaders();
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    }
    // Si es FormData, el navegador establece el Content-Type automáticamente con el boundary
    if (!isFormData) headers = headers.set('Content-Type', 'application/json');
    return headers;
  }

  /**
   * MÉTODO PARA CREAR DISEÑO (JSON)
   * Recibe el payload con los datos del formulario y el contenido del canvas
   */
  crearDiseno(payload: any): Observable<any> {
    return this.http.post<ModeloNuevo>(`${this.apiUrl}/modelo`, payload, { headers: this.getHeaders() })
      .pipe(
        tap((nuevoModelo) => {
          console.log('✨ Diseño registrado y agregado a la caché local.');
          // Actualizamos la caché para que el nuevo diseño aparezca en las tablas sin recargar
          if (this.cacheModelos.length > 0) {
            this.cacheModelos.unshift(nuevoModelo);
          }
        })
      );
  }

  /**
   * GET MODELOS INTELIGENTE
   * Devuelve un Observable con { data: [], total: number }
   */
  getModelos(
    skip: number = 0,
    limit: number = 50,
    q: string = '',
    forzarRecarga: boolean = false,
    orden: string = 'fecha_desc'
  ): Observable<RespuestaPaginada> {

    // CASO A: Tenemos datos en caché y no forzamos recarga -> Usamos memoria
    if (this.cacheModelos.length > 0 && !forzarRecarga) {
      return of(this.filtrarYPaginarLocalmente(this.cacheModelos, skip, limit, q, orden));
    }

    // CASO B: No hay datos (Primera carga) -> Bajamos TODO del servidor
    return this.http.get<ModeloNuevo[]>(`${this.apiUrl}/modelos?skip=0&limit=3000`, { headers: this.getHeaders() })
      .pipe(
        tap(data => {
          console.log(`🌐 Datos descargados del servidor: ${data.length} registros.`);
          this.cacheModelos = data || [];
        }),
        map(data => this.filtrarYPaginarLocalmente(data, skip, limit, q, orden))
      );
  }

  // --- HELPER: Lógica de filtrado, ordenamiento y paginación local ---
  private filtrarYPaginarLocalmente(datos: ModeloNuevo[], skip: number, limit: number, q: string, orden: string): RespuestaPaginada {
    let resultado = [...(datos || [])];

    if (q) {
      const termino = q.toLowerCase();
      resultado = resultado.filter(m =>
        (m.nombre_modelo || '').toLowerCase().includes(termino) ||
        (m.modelo || '').toLowerCase().includes(termino)
      );
    }

    switch (orden) {
      case 'nombre_asc':
      case 'modelo_asc':
        resultado.sort((a, b) => (a.nombre_modelo || '').localeCompare(b.nombre_modelo || ''));
        break;
      case 'nombre_desc':
      case 'modelo_desc':
        resultado.sort((a, b) => (b.nombre_modelo || '').localeCompare(a.nombre_modelo || ''));
        break;
      case 'fecha_asc':
        resultado.sort((a, b) => (a.id_modelo || 0) - (b.id_modelo || 0));
        break;
      default:
        resultado.sort((a, b) => (b.id_modelo || 0) - (a.id_modelo || 0));
        break;
    }

    const totalRegistros = resultado.length;
    const dataPaginada = resultado.slice(skip, skip + limit);

    return { data: dataPaginada, total: totalRegistros };
  }

  /**
   * ACTUALIZAR DISEÑO (JSON)
   * Se utiliza para guardar los cambios editados en el editor SCCGA
   */
  actualizarDiseno(id: number, payload: any): Observable<any> {
    return this.http.put<ModeloNuevo>(`${this.apiUrl}/modelo/${id}`, payload, { headers: this.getHeaders() })
      .pipe(
        tap((modeloActualizado) => {
          // Actualizamos la caché local para que el catálogo se vea refrescado
          const index = this.cacheModelos.findIndex(m => m.id_modelo === id);
          if (index !== -1) {
            this.cacheModelos[index] = modeloActualizado;
          }
          console.log('✅ Diseño actualizado en el servidor y caché.');
        })
      );
  }

  // =========================================================
  //   MÉTODOS CRUD ADICIONALES
  // =========================================================

  // Registrar usando FormData (si necesitas enviar archivos físicos)
  registrarDiseno(formData: FormData): Observable<any> {
    return this.http.post<ModeloNuevo>(`${this.apiUrl}/modelo`, formData, { headers: this.getHeaders(true) })
      .pipe(
        tap((nuevoModelo) => {
          this.cacheModelos.unshift(nuevoModelo);
        })
      );
  }

  updateDiseno(id: number, formData: FormData): Observable<any> {
    return this.http.put<ModeloNuevo>(`${this.apiUrl}/modelo/${id}`, formData, { headers: this.getHeaders(true) })
      .pipe(
        tap((modeloActualizado) => {
          const index = this.cacheModelos.findIndex(m => m.id_modelo === id);
          if (index !== -1) {
            this.cacheModelos[index] = modeloActualizado;
          }
        })
      );
  }

  deleteDiseno(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/modelo/${id}`, { headers: this.getHeaders() })
      .pipe(
        tap(() => {
          this.cacheModelos = this.cacheModelos.filter(m => m.id_modelo !== id);
        })
      );
  }

  getCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.apiUrl}/categorias`, { headers: this.getHeaders() });
  }

  getSiguienteSecuencia(idCategoria: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/siguiente_secuencia/${idCategoria}`, { headers: this.getHeaders() });
  }

  getDisenoPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/modelo/${id}`, { headers: this.getHeaders() });
  }
}
