import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2'; 
import { EmpresaService } from '../../../core/services/empresa.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
// import { Empresa } from '../../../core/models/empresa.model'; // No es estrictamente necesario si no tipas la respuesta explícitamente aquí

@Component({
  selector: 'app-editar-empresa',
  standalone: true, // Agregado para que funcione con los imports
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './editar-empresa.html',
  styleUrl: './editar-empresa.css',
})
export class EditarEmpresaComponent implements OnInit {

  formEmpresa: FormGroup;
  idEmpresa: number = 0;
  
  // 1. CAMBIO: Variable temporal para el ID de la dirección
  idDireccionTemp: number | null = null;
  
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private empresaService: EmpresaService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.formEmpresa = this.fb.group({
      nombre_empresa: ['', Validators.required],
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
      this.idEmpresa = +idParam;
      this.cargarDatosEmpresa(this.idEmpresa);
    } else {
      console.error("No se recibió ningún ID");
      this.router.navigate(['/lista-empresas']);
    }
  }

  cargarDatosEmpresa(id: number) {
    this.isLoading = true;
    this.empresaService.getEmpresa(id).subscribe({
      next: (data) => {
        // 2. CAMBIO: Guardamos el ID de la dirección antes de llenar el form
        if (data.direccion && data.direccion.id_direccion) {
            this.idDireccionTemp = data.direccion.id_direccion;
        }

        this.formEmpresa.patchValue(data);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar empresa:', err);
        this.isLoading = false;
      }
    });
  }

  guardarCambios() {
    if (this.formEmpresa.invalid) {
      this.formEmpresa.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    
    // 3. CAMBIO: Construimos el objeto manualmente para incluir el ID oculto
    const formValue = this.formEmpresa.value;

    const datosParaEnviar = {
        ...formValue,
        direccion: {
            ...formValue.direccion,
            // Aquí inyectamos el ID que guardamos al cargar
            id_direccion: this.idDireccionTemp 
        }
    };

    console.log("Enviando empresa:", datosParaEnviar); // Debug

    this.empresaService.updateEmpresa(this.idEmpresa, datosParaEnviar).subscribe({
      next: (resp) => {
        this.isLoading = false;
        Swal.fire('¡Actualizado!', 'La empresa se actualizó correctamente', 'success');
        this.router.navigate(['/dashboard/registros-empresa']);
      },
      error: (err) => {
        console.error('Error al actualizar:', err);
        this.isLoading = false;
        // Muestra mensaje específico si viene del backend
        const msg = err.error?.detail || 'No se pudieron guardar los cambios';
        Swal.fire('Error', msg, 'error');
      }
    });
  }

  cancelar() {
    this.router.navigate(['/dashboard/registros-empresa']);
  }
}