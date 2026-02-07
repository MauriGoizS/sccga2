import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

import { Estatus, Formato, Tallas } from '../models/formato.model';
import { Empresa } from '../models/empresa.model';
import { Maquilero } from '../models/maquilero.model';
import { ModeloNuevo } from '../models/diseno.model';
import { FormatoDetalle } from '../models/formato.model'; // Importar la nueva

@Injectable({
  providedIn: 'root'
})
export class FormatoService {

  // Ajusta si tu puerto es diferente (8000 es el default de FastAPI)
  private apiUrl = 'http://127.0.0.1:8000';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }
    headers = headers.set('Content-Type', 'application/json');
    return headers;
  }

  // --- Selectores ---
  getEmpresas(): Observable<Empresa[]> {
    return this.http.get<Empresa[]>(`${this.apiUrl}/empresas`, { headers: this.getHeaders() });
  }

  getMaquileros(): Observable<Maquilero[]> {
    return this.http.get<Maquilero[]>(`${this.apiUrl}/maquileros`, { headers: this.getHeaders() });
  }

  getModelos(skip: number = 0, limit: number = 50, q: string = ''): Observable<ModeloNuevo[]> {
    let url = `${this.apiUrl}/modelos?skip=${skip}&limit=${limit}`;

    // Si hay texto de búsqueda, lo agregamos a la URL
    if (q) {
      url += `&q=${encodeURIComponent(q)}`;
    }

    return this.http.get<ModeloNuevo[]>(url, { headers: this.getHeaders() });
  }
  // -----------------------

  getEstatus(): Observable<Estatus[]> {
    return this.http.get<Estatus[]>(`${this.apiUrl}/estatus`, { headers: this.getHeaders() });
  }

  getTallas(): Observable<Tallas[]> {
    return this.http.get<Tallas[]>(`${this.apiUrl}/tallas`, { headers: this.getHeaders() });
  }

  getDireccion(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/direcciones/${id}`, { headers: this.getHeaders() });
  }

  // --- OBTENER OPERACIONES ---
  getOperacionesPorModelo(idModelo: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/operaciones/modelo/${idModelo}`, { headers: this.getHeaders() });
  }

  crearEncargo(formato: Formato): Observable<any> {
    return this.http.post(`${this.apiUrl}/formato`, formato, { headers: this.getHeaders() });
  }

  // --- OBTENER LISTA DE ENCARGOS (PARA LA TABLA) ---
  getListaEncargos(): Observable<FormatoDetalle[]> {
    return this.http.get<any[]>(`${this.apiUrl}/encargos`, { headers: this.getHeaders() });
  }

  actualizarEstatus(idFormato: number, idNuevoEstatus: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/encargos/${idFormato}/estatus?id_nuevo_estatus=${idNuevoEstatus}`, null, { headers: this.getHeaders() });
  }

  verFormatoPDF(id: number): Observable<Blob> {
    // Asegúrate de que esta URL coincida con tu endpoint de Python
    return this.http.get(`${this.apiUrl}/formato/${id}/pdf`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  subirPDF(id: number, archivo: Blob): Observable<any> {
    const formData = new FormData();
    formData.append('file', archivo, `formato_${id}.pdf`); 
    let headers = new HttpHeaders();
    if (isPlatformBrowser(this.platformId)) {
       const token = localStorage.getItem('token');
       if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.post(`${this.apiUrl}/formato/${id}/subir-pdf`, formData, { headers: headers });
  }

}