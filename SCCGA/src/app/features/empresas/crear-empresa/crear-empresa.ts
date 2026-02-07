import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Empresa } from '../../../core/models/empresa.model';
import { EmpresaService } from '../../../core/services/empresa.service';
import { finalize } from 'rxjs'; 
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-empresa',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './crear-empresa.html',
  styleUrl: './crear-empresa.css',
})
export class CrearEmpresaComponent implements OnInit {
  empresaForm!: FormGroup;
  isLoading: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private EmpresaService: EmpresaService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    // Definición del formulario con validadores
    this.empresaForm = this.fb.group({
      // --- Campos Personales ---
      nombre_empresa: ['', Validators.required],
      nombres: ['', Validators.required],
      apellido_paterno: ['', Validators.required],
      apellido_materno: [''], // Opcional
      telefono: [''], // Opcional
      segundo_contacto: [''], // Opcional
      correo: ['', [Validators.required, Validators.email]],

      // --- Dirección Anidada (Refleja el modelo Direccion) ---
      direccion: this.fb.group({
        calle: ['', Validators.required],
        numero_exterior: ['', Validators.required],
        numero_interior: [''], // Opcional
        codigo_postal: ['', Validators.required],
        colonia: ['', Validators.required],
        municipio: ['', Validators.required],
        ciudad: ['', Validators.required],
      })
    });
  }

  onSubmit(): void {
    if (this.empresaForm.invalid) {
      this.errorMessage = 'Por favor, complete todos los campos obligatorios.';
      this.empresaForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    
    // Forzamos actualización visual inmediata al empezar
    this.cdr.detectChanges(); 

    const nuevoempresa: Empresa = this.empresaForm.value;

    this.EmpresaService.createEmpresa(nuevoempresa)
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
            text: `empresa registrado con éxito.`,
            icon: 'success',
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#0e2b48',
            timer: 5000,
            timerProgressBar: true
          }).then(() => {
            // Ahora esto borrará también el nombre de la empresa
            this.empresaForm.reset();
            
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
    return this.empresaForm.controls;
  }
}