import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Maquilero } from '../models/maquilero.model';

@Injectable({
  providedIn: 'root'
})
export class MaquileroService {
  private http = inject(HttpClient);

  // URL base de tu backend (FastAPI)
  private apiUrl = 'http://127.0.0.1:8000';

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
   * Backend: @app.get("/maquileros/")
   */
  getMaquileros(): Observable<Maquilero[]> {
    return this.http.get<Maquilero[]>(`${this.apiUrl}/maquileros/`, { headers: this.getHeaders() });
  }

  /**
   * Obtiene uno específico por ID.
   * Backend: @app.get("/maquileros/{id}")
   */
  getMaquilero(id: number): Observable<Maquilero> {
    return this.http.get<Maquilero>(`${this.apiUrl}/maquileros/${id}`, { headers: this.getHeaders() });
  }


  /**
   * Crea uno nuevo.
   * Backend: @app.post("/maquileros/")
   */
  createMaquilero(maquileroData: Maquilero): Observable<Maquilero> {
    const endpoint = `${this.apiUrl}/maquileros/`;
    return this.http.post<Maquilero>(endpoint, maquileroData, { headers: this.getHeaders() });
  }

  /**
   * Actualiza uno existente.
   * Backend: @app.put("/maquileros/{id}")
   */
  updateMaquilero(id: number, maquilero: Maquilero): Observable<Maquilero> {
    return this.http.put<Maquilero>(`${this.apiUrl}/maquileros/${id}`, maquilero, { headers: this.getHeaders() });
  }

  /**
   * Elimina por ID.
   * Backend: @app.delete("/maquileros/{id}")
   */
  deleteMaquilero(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/maquileros/${id}`, { headers: this.getHeaders() });
  }
}
