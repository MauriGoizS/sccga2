import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MaquileroService } from '../../../core/services/maquilero.service';
import { Maquilero } from '../../../core/models/maquilero.model';
import { finalize, timeout } from 'rxjs';
import Swal from 'sweetalert2'; // <--- Importamos SweetAlert2

@Component({
  selector: 'app-registros-maquileros',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './registros-maquileros.html',
  styleUrl: './registros-maquileros.css',
})
export class RegistrosMaquilerosComponent implements OnInit {

  private maquileroService = inject(MaquileroService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  listaMaquileros: Maquilero[] = [];
  isLoading: boolean = true;

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos() {
    this.isLoading = true;
    // Forzamos detección de cambios inicial
    this.cdr.detectChanges(); 

    this.maquileroService.getMaquileros()
      .pipe(
        // Si tarda más de 5 segundos, cortamos la petición
        timeout(5000),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          this.listaMaquileros = data;
        },
        error: (error) => {
          console.error('Error o tiempo de espera agotado:', error);
          
          // Alerta visual si falla la carga
          Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'No se pudieron cargar los maquileros. Verifica tu conexión o intenta más tarde.',
            confirmButtonColor: '#0e2b48'
          });
        }
      });
  }

  editar(id: number) {
    this.router.navigate(['/dashboard/editar-maquilero', id]);
  }

  eliminar(id: number) {
    // 1. Alerta de confirmación (Advertencia)
    Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción eliminará al maquilero permanentemente.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33', // Rojo para indicar peligro
      cancelButtonColor: '#3085d6', // Azul para cancelar
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      
      if (result.isConfirmed) {
        
        // 2. Loading mientras elimina
        Swal.fire({
          title: 'Eliminando...',
          text: 'Por favor espera',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        this.maquileroService.deleteMaquilero(id).subscribe({
          next: () => {
            // 3. Éxito
            Swal.fire(
              '¡Eliminado!',
              'El maquilero ha sido eliminado correctamente.',
              'success'
            );
            // Recargamos la lista para ver el cambio
            this.cargarDatos();
          },
          error: (err) => {
            console.error('Error al eliminar:', err);
            // 4. Error
            Swal.fire(
              'Error',
              'No se pudo eliminar el registro. Inténtelo de nuevo.',
              'error'
            );
          }
        });
      }
    });
  }
}