import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // <--- Importante: ChangeDetectorRef
import { FormatoService } from '../../../core/services/formato.service';
import Swal from 'sweetalert2';
import { finalize } from 'rxjs'; // <--- Importante: finalize

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
    private cdr: ChangeDetectorRef // <--- Inyectamos el detector de cambios
  ) { }

  ngOnInit(): void {
    this.obtenerEncargos();
  }

  obtenerEncargos() {
    this.cargando = true;
    
    // Forzamos actualización visual al iniciar
    this.cdr.detectChanges();

    this.formatoService.getListaEncargos()
      .pipe(
        // finalize se ejecuta SIEMPRE (haya éxito o error)
        // Esto evita que se quede cargando eternamente
        finalize(() => {
          this.cargando = false;
          this.cdr.detectChanges(); // <--- OBLIGAMOS a Angular a actualizar la vista
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
          // Opcional: Mostrar alerta si falla la carga inicial
          Swal.fire({
             toast: true, position: 'top-end', icon: 'error', 
             title: 'Error al cargar datos', showConfirmButton: false, timer: 3000
          });
        }
      });
  }

  marcarTerminado(id: number) {
    // Alerta de confirmación
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
        // Muestra loading mientras procesa
        Swal.fire({
            title: 'Procesando...',
            didOpen: () => Swal.showLoading()
        });

        // ID para estatus "Terminado" (Asegúrate que sea el correcto en tu BD)
        const ID_TERMINADO = 2; 

        this.formatoService.actualizarEstatus(id, ID_TERMINADO).subscribe({
          next: (res) => {
            Swal.fire(
              '¡Listo!',
              'El encargo ha sido marcado como terminado.',
              'success'
            ).then(() => {
              // Recarga la página completa para ver los cambios inmediatamente
              window.location.reload(); 
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
    // 1. Mostrar el Toast de "Abriendo..."
    const toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
    toast.fire({ icon: 'info', title: 'Buscando PDF...' });

    // 2. Pedir la URL al servidor
    this.formatoService.verFormatoPDF(id).subscribe({
      next: (response) => {
        // El servidor respondió ÉXITO y nos dio la URL
        const urlCloudinary = response.url;
        
        // Abrimos la URL de Cloudinary directo en otra pestaña
        window.open(urlCloudinary, '_blank');
      },
      error: (err) => {
        console.error('Error al obtener el PDF', err);
        // 3. Si falla (404), mostramos tu alerta de error original
        Swal.fire({
            title: 'Archivo no encontrado',
            text: 'No se encontró el PDF para este encargo. Es posible que no se haya subido todavía.',
            icon: 'warning'
        });
      }
    });
  }
}