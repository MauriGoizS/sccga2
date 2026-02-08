import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Empresa } from '../models/empresa.model';

@Injectable({
  providedIn: 'root'
})
export class EmpresaService {
  private http = inject(HttpClient);

  // URL base de tu backend (FastAPI)
  private apiUrl = 'https://sccga2.onrender.com';

  // --- HELPER PARA EL TOKEN (CORREGIDO) ---
  // Verifica si estamos en el navegador antes de llamar a localStorage
  // Esto soluciona el error "ReferenceError: localStorage is not defined"
  private getHeaders(): HttpHeaders {
    let token = '';

    // VALIDACIÓN IMPORTANTE:
    // Solo intentamos leer localStorage si estamos en el navegador
    if (typeof localStorage !== 'undefined') {
      token = localStorage.getItem('token') || '';
    }

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Obtiene la lista completa.
   * Backend: @app.get("/empresas/")
   */
  getEmpresas(): Observable<Empresa[]> {
    return this.http.get<Empresa[]>(`${this.apiUrl}/empresas/`, { headers: this.getHeaders() });
  }

  /**
   * Obtiene uno específico por ID.
   * Backend: @app.get("/empresas/{id}")
   */
  getEmpresa(id: number): Observable<Empresa> {
    return this.http.get<Empresa>(`${this.apiUrl}/empresas/${id}`, { headers: this.getHeaders() });
  }

  /**
   * Crea uno nuevo.
   * Backend: @app.post("/empresas/")
   */
  createEmpresa(empresaData: Empresa): Observable<Empresa> {
    const endpoint = `${this.apiUrl}/empresas/`;
    return this.http.post<Empresa>(endpoint, empresaData, { headers: this.getHeaders() });
  }

  /**
   * Actualiza uno existente.
   * Backend: @app.put("/empresas/{id}")
   */
  updateEmpresa(id: number, empresa: Empresa): Observable<Empresa> {
    return this.http.put<Empresa>(`${this.apiUrl}/empresas/${id}`, empresa, { headers: this.getHeaders() });
  }

  /**
   * Elimina por ID.
   * Backend: @app.delete("/empresas/{id}")
   */
  deleteEmpresa(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/empresas/${id}`, { headers: this.getHeaders() });
  }
}

