import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2'; 
import { MaquileroService } from '../../../core/services/maquilero.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
// Asegúrate de importar finalize si quieres usarlo, si no, lo quito del ejemplo para que compile directo
// import { finalize } from 'rxjs'; 

@Component({
  selector: 'app-editar-maquilero',
  standalone: true, // Asumo que es standalone por tus imports
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './editar-maquilero.html',
  styleUrl: './editar-maquilero.css',
})
export class EditarMaquileroComponent implements OnInit {

  formMaquilero: FormGroup;
  idMaquilero: number = 0;
  
  // 1. CAMBIO: Variable para guardar temporalmente el ID de la dirección
  idDireccionTemp: number | null = null; 
  
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private MaquileroService : MaquileroService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.formMaquilero = this.fb.group({
      nombres: ['', Validators.required],
      apellido_paterno: ['', Validators.required],
      apellido_materno: [''],
      telefono: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      segundo_contacto: [''],
      correo: ['', [Validators.required, Validators.email]],
      direccion: this.fb.group({
        calle: ['', Validators.required],
        numero_exterior: ['', Validators.required],
        numero_interior: [''],
        codigo_postal: ['', Validators.required],
        colonia: ['', Validators.required],
        municipio: ['', Validators.required],
        ciudad: ['', Validators.required]
      })
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.idMaquilero = +idParam;
      this.cargarDatosMaquilero(this.idMaquilero);
    } else {
      this.router.navigate(['/dashboard/registros-maquileros']); 
    }
  }

   cargarDatosMaquilero(id: number) {
    this.isLoading = true;
    this.MaquileroService.getMaquilero(id).subscribe({
      next: (data) => {
        // 2. CAMBIO: Rescatamos el ID de la dirección original antes de que se pierda
        if (data.direccion && data.direccion.id_direccion) {
            this.idDireccionTemp = data.direccion.id_direccion;
        }

        this.formMaquilero.patchValue(data);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar:', err);
        this.isLoading = false;
      }
    });
  }

  guardarCambios() {
    if (this.formMaquilero.invalid) {
      this.formMaquilero.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    
    // 3. CAMBIO: Construimos el objeto manualmente para incluir el ID oculto
    const formValue = this.formMaquilero.value;
    
    const datosParaEnviar = {
        ...formValue, // Copia todo lo del formulario
        direccion: {
            ...formValue.direccion, // Copia calle, cp, etc.
            id_direccion: this.idDireccionTemp // <--- AQUÍ ESTÁ LA SOLUCIÓN AL 422
        }
    };

    console.log("Enviando:", datosParaEnviar); // Para depurar

    this.MaquileroService.updateMaquilero(this.idMaquilero, datosParaEnviar).subscribe({
      next: (resp) => {
        this.isLoading = false;
        Swal.fire('¡Actualizado!', 'El maquilero se actualizó correctamente', 'success');
        this.router.navigate(['/dashboard/registros-maquileros']);
      },
      error: (err) => {
        console.error('Error al actualizar:', err);
        this.isLoading = false;
        // Muestra el mensaje de error del backend si existe
        const msg = err.error?.detail || 'No se pudieron guardar los cambios';
        Swal.fire('Error', msg, 'error');
      }
    });
  }

  cancelar() {
    this.router.navigate(['/dashboard/registros-maquileros']);
  }
}