import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Maquilero } from '../../../core/models/maquilero.model';
import { MaquileroService } from '../../../core/services/maquilero.service';
// CAMBIO: Importamos finalize directamente de 'rxjs' (Mejor práctica en Angular moderno)
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-maquilero',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './crear-maquilero.html',
  styleUrl: './crear-maquilero.css',
})
export class CrearMaquileroComponent implements OnInit {
  maquileroForm!: FormGroup;
  isLoading: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private maquileroService: MaquileroService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.maquileroForm = this.fb.group({
      nombres: ['', Validators.required],
      apellido_paterno: ['', Validators.required],
      apellido_materno: [''],
      telefono: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      segundo_contacto: [''],
      correo: ['', [Validators.required, Validators.email]],
      direccion: this.fb.group({
        calle: ['', Validators.required],
        numero_exterior: ['', Validators.required],
        numero_interior: [''],
        codigo_postal: ['', Validators.required],
        colonia: ['', Validators.required],
        municipio: ['', Validators.required],
        ciudad: ['', Validators.required],
      })
    });
  }

  onSubmit(): void {
    if (this.maquileroForm.invalid) {
      this.errorMessage = 'Por favor, complete todos los campos obligatorios.';
      this.maquileroForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    // Forzamos actualización visual inmediata al empezar
    this.cdr.detectChanges();

    const nuevoMaquilero: Maquilero = this.maquileroForm.value;

    this.maquileroService.createMaquilero(nuevoMaquilero)
      .pipe(
        // finalize se ejecuta SIEMPRE, haya éxito o error
        finalize(() => {
          this.isLoading = false;
          // Le decimos a Angular que actualice la vista inmediatamente
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          Swal.fire({
            title: '¡Registro Exitoso!',
            text: `Maquilero registrado con éxito.`,
            icon: 'success',
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#0e2b48',
            timer: 5000,
            timerProgressBar: true
          }).then(() => {
            // Ahora esto borrará también el nombre de la empresa
            this.maquileroForm.reset();

            // Opcional: Si quieres reiniciar el scroll hacia arriba
            window.scrollTo(0, 0);
          });
        },
        error: (err) => {
          console.error('Error:', err);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo registrar. Inténtelo nuevamente.',
            icon: 'error',
            confirmButtonText: 'Cerrar'
          });
        }
      });
  }

  get f() {
    return this.maquileroForm.controls;
  }
}
