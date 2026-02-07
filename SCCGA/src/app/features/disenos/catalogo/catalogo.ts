import { Component, OnInit, inject, ChangeDetectorRef, PLATFORM_ID, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ReactiveFormsModule, FormControl, FormsModule } from '@angular/forms'; 

import { DisenoService } from '../../../core/services/diseno.service';
import { ModeloNuevo } from '../../../core/models/diseno.model';
import { debounceTime, distinctUntilChanged, merge } from 'rxjs'; 

// IMPORTAMOS SWEETALERT2
import Swal from 'sweetalert2';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule], 
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class CatalogoComponent implements OnInit {
  private DisenoService = inject(DisenoService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private sanitizer = inject(DomSanitizer);
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone); 

  listaVisible: ModeloNuevo[] = []; 
  isLoading: boolean = true;
  errorMensaje: string = '';
  
  // Variables de Paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 30; 
  totalPaginas: number = 1; 

  // Controles
  searchControl = new FormControl('');
  ordenControl = new FormControl('fecha_desc'); 

  private readonly BACKEND_URL = 'http://127.0.0.1:8000';

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.cargarPagina(1);

      // Escuchamos cambios en el buscador y el orden
      merge(
        this.searchControl.valueChanges.pipe(debounceTime(500), distinctUntilChanged()),
        this.ordenControl.valueChanges
      ).subscribe(() => {
        this.cargarPagina(1); 
      });
    }
  }

  cargarPagina(pagina: number) {
    this.isLoading = true;
    this.errorMensaje = '';
    this.listaVisible = []; 
    this.cdr.detectChanges(); 

    const skip = (pagina - 1) * this.itemsPorPagina;
    const terminoBusqueda = this.searchControl.value || '';
    const orden = this.ordenControl.value || 'fecha_desc';

    this.DisenoService.getModelos(skip, this.itemsPorPagina, terminoBusqueda, false, orden)
      .subscribe({
        next: (resp) => {
          this.ngZone.run(() => {
            this.listaVisible = resp.data;
            this.paginaActual = pagina;
            
            this.totalPaginas = Math.ceil(resp.total / this.itemsPorPagina);
            if (this.totalPaginas === 0) this.totalPaginas = 1;

            this.isLoading = false; 
            this.cdr.detectChanges(); 
          });
        },
        error: (error) => {
          this.ngZone.run(() => {
            console.error('Error:', error);
            this.errorMensaje = 'Error al conectar con el servidor.';
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        }
      });
  }

  // --- IR A PÁGINA MANUALMENTE ---
  irAPaginaManual(event: any) {
    let valor = parseInt(event.target.value);

    if (isNaN(valor) || valor < 1) valor = 1;
    if (valor > this.totalPaginas) valor = this.totalPaginas;

    event.target.value = valor; 

    if (valor !== this.paginaActual) {
      this.cargarPagina(valor);
      if (isPlatformBrowser(this.platformId)) window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  cambiarPagina(delta: number) {
    const nuevaPagina = this.paginaActual + delta;
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginas) {
      this.cargarPagina(nuevaPagina);
      if (isPlatformBrowser(this.platformId)) window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  obtenerImagen(rutaImagen: any): SafeUrl | string {
    if (!rutaImagen) return 'assets/images/placeholder.png'; // O URL externa si prefieres
    const ruta = rutaImagen.toString();
    if (ruta.startsWith('data:image')) return this.sanitizer.bypassSecurityTrustUrl(ruta);
    if (ruta.includes('uploads')) { const rutaLimpia = ruta.startsWith('/') ? ruta.substring(1) : ruta; return this.sanitizer.bypassSecurityTrustUrl(`${this.BACKEND_URL}/${rutaLimpia}`); }
    let imgString = ruta; if (imgString.startsWith("b'") && imgString.endsWith("'")) { imgString = imgString.substring(2, imgString.length - 1); return this.sanitizer.bypassSecurityTrustUrl(`data:image/png;base64,${imgString}`); }
    return 'assets/images/placeholder.png';
  }

  editar(id: number) { this.router.navigate(['/dashboard/catalogo', id]); }

  // --- FUNCIÓN ELIMINAR CON SWEETALERT2 ---
  eliminar(id: number) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "No podrás revertir esta acción.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626', // Rojo para confirmar borrado
      cancelButtonColor: '#0f3460', // Azul corporativo para cancelar
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        
        // Llamamos al servicio para borrar
        this.DisenoService.deleteDiseno(id).subscribe({
          next: () => {
            // 1. Recargamos la vista inmediatamente
            this.ngZone.run(() => {
              this.cargarPagina(this.paginaActual);
            });

            // 2. Mostramos mensaje de éxito
            Swal.fire({
              title: '¡Eliminado!',
              text: 'El modelo ha sido eliminado correctamente.',
              icon: 'success',
              confirmButtonColor: '#0f3460'
            });
          },
          error: (err) => {
            console.error(err);
            // 3. Mostramos mensaje de error
            Swal.fire({
              title: 'Error',
              text: 'Hubo un problema al intentar eliminar el modelo.',
              icon: 'error',
              confirmButtonColor: '#0f3460'
            });
          }
        });
      }
    });
  }
}