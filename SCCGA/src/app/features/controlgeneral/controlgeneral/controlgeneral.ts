import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormatoService } from '../../../core/services/formato.service';
import Swal from 'sweetalert2';
import { finalize } from 'rxjs';

// Interfaz para la tabla
interface EncargoTabla {
  id_formato: number;
  maquilero: string;
  empresa: string;
  tallas: string;
  piezas_totales: number;
  fecha_encargo: string;
  estatus: string;
  fecha_entrega: string;
}

@Component({
  selector: 'app-controlgeneral',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './controlgeneral.html',
  styleUrl: './controlgeneral.css',
})
export class ControlgeneralComponent implements OnInit {

  listaEncargos: EncargoTabla[] = [];
  cargando: boolean = true;

  constructor(
    private formatoService: FormatoService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.obtenerEncargos();
  }

  obtenerEncargos() {
    this.cargando = true;
    this.cdr.detectChanges();

    this.formatoService.getListaEncargos()
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data: any[]) => {
          this.listaEncargos = data.map(item => ({
            id_formato: item.id_formato,
            maquilero: item.maquilero || item.nombre_maquilero,
            empresa: item.empresa || item.nombre_empresa,
            tallas: item.observaciones || item.tallas,
            piezas_totales: item.piezas || item.piezas_totales,
            fecha_encargo: item.fecha_creacion || item.fecha_encargo,
            fecha_entrega: item.fecha_entrega,
            estatus: item.estatus || item.nombre_estatus
          }));
        },
        error: (error) => {
          console.error('Error al cargar encargos', error);
          Swal.fire({
              toast: true, position: 'top-end', icon: 'error',
              title: 'Error al cargar datos', showConfirmButton: false, timer: 3000
          });
        }
      });
  }

  marcarTerminado(id: number) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "Se marcará como terminado y se guardará la fecha de entrega.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, terminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {

      if (result.isConfirmed) {
        Swal.fire({
            title: 'Procesando...',
            didOpen: () => Swal.showLoading()
        });

        // ID para estatus "Terminado" según tu BD
        const ID_TERMINADO = 2;

        this.formatoService.actualizarEstatus(id, ID_TERMINADO).subscribe({
          next: (res) => {
            Swal.fire(
              '¡Listo!',
              'El encargo ha sido marcado como terminado.',
              'success'
            ).then(() => {
              // --- ACTUALIZACIÓN LOCAL SIN RECARGAR PÁGINA ---
              const index = this.listaEncargos.findIndex(item => item.id_formato === id);

              if (index !== -1) {
                // Cambiamos el estatus para que el *ngIf del botón de falso y desaparezca
                this.listaEncargos[index].estatus = 'Terminado';

                // Ponemos la fecha actual para que la tabla muestre cuándo se entregó
                this.listaEncargos[index].fecha_entrega = new Date().toISOString();

                // Notificamos a Angular para refrescar la fila específica
                this.cdr.detectChanges();
              }
            });
          },
          error: (err) => {
            console.error(err);
            Swal.fire('Error', 'No se pudo actualizar el estatus.', 'error');
          }
        });
      }
    });
  }

  verPDF(id: number) {
    const toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
    toast.fire({ icon: 'info', title: 'Buscando PDF...' });

    this.formatoService.verFormatoPDF(id).subscribe({
      next: (response) => {
        const urlCloudinary = response.url;
        window.open(urlCloudinary, '_blank');
      },
      error: (err) => {
        console.error('Error al obtener el PDF', err);
        Swal.fire({
            title: 'Archivo no encontrado',
            text: 'No se encontró el PDF para este encargo.',
            icon: 'warning'
        });
      }
    });
  }
}
