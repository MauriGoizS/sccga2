import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { EmpresaService } from '../../../core/services/empresa.service';
import { Empresa } from '../../../core/models/empresa.model';
import { finalize, timeout } from 'rxjs';
import Swal from 'sweetalert2'; // <--- Importamos SweetAlert2

@Component({
  selector: 'app-regitros-empresa',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './registros-empresa.html',
  styleUrl: './registros-empresa.css',
})
export class RegistrosEmpresaComponent implements OnInit {

  private empresaService = inject(EmpresaService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  listaEmpresas: Empresa[] = [];
  isLoading: boolean = true;

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos() {
    this.isLoading = true;
    this.cdr.detectChanges(); // Forzamos actualización visual inicial

    this.empresaService.getEmpresas()
      .pipe(
        // Si en 5000ms (5s) no responde, cancela y lanza error
        timeout(5000),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          this.listaEmpresas = data;
        },
        error: (error) => {
          console.error('Error o tiempo de espera agotado:', error);
          
          // Alerta visual si falla la carga
          Swal.fire({
            icon: 'error',
            title: 'Error de conexión',
            text: 'No se pudieron cargar las empresas. Verifica tu conexión o intenta más tarde.',
            confirmButtonColor: '#0e2b48'
          });
        }
      });
  }

  editar(id: number) {
    this.router.navigate(['/dashboard/editar-empresa', id]);
  }

  eliminar(id: number) {
    // 1. Alerta de confirmación
    Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción eliminará la empresa permanentemente.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33', // Rojo para eliminar
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

        this.empresaService.deleteEmpresa(id).subscribe({
          next: () => {
            // 3. Éxito
            Swal.fire(
              '¡Eliminado!',
              'La empresa ha sido eliminada correctamente.',
              'success'
            );
            // Recargamos la lista
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