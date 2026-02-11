import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl, FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';

// --- SERVICIOS ---
import { FormatoService } from '../../../core/services/formato.service';
import { DisenoService } from '../../../core/services/diseno.service';

// --- MODELOS ---
import { Empresa } from '../../../core/models/empresa.model';
import { Maquilero } from '../../../core/models/maquilero.model';
import { ModeloNuevo } from '../../../core/models/diseno.model';
import { Estatus } from '../../../core/models/formato.model';

import jsPDF from 'jspdf';
import { debounceTime, forkJoin, finalize } from 'rxjs';
import Swal from 'sweetalert2';

interface TallaUI {
  id_tallas: number;
  nombre_talla: string;
  seleccionada: boolean;
  cantidad: number | null;
}

interface ModeloConTallas extends ModeloNuevo {
  tallas: TallaUI[];
}

interface DetalleModeloSeleccionado {
  operaciones: any[];
  img1: { base64: string, width: number, height: number } | null;
  img2: { base64: string, width: number, height: number } | null;
}

@Component({
  selector: 'app-crear-formato',
  standalone: true,
  imports: [ReactiveFormsModule, HttpClientModule, CommonModule, FormsModule],
  templateUrl: './crear-formato.html',
  styleUrl: './crear-formato.css',
})
export class CrearFormatoComponent implements OnInit {
  formEncargo: FormGroup;
  searchControl = new FormControl('');

  listaEmpresas: Empresa[] = [];
  listaMaquileros: Maquilero[] = [];
  listaResultadosBusqueda: ModeloNuevo[] = [];
  listaDisenosFiltrada: ModeloNuevo[] = [];
  listaStatus: Estatus[] = [];
  modelosSeleccionados: ModeloConTallas[] = [];
  plantillaTallas: TallaUI[] = [];

  readonly rutaLogo = 'assets/images/logo1.png';
  private logoBase64: string | null = null;
  direccionMaquileroStr: string = '';

  private readonly baseUrl = 'https://sccga2.onrender.com/';
  isLoadingModelos: boolean = false;
  cacheDetalles: Map<number, DetalleModeloSeleccionado> = new Map();

  constructor(
    private fb: FormBuilder,
    private formatoService: FormatoService,
    private disenoService: DisenoService,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {
    this.formEncargo = this.fb.group({
      id_empresa: ['', Validators.required],
      id_maquilero: ['', Validators.required],
      id_estatus: ['', Validators.required],
      piezas: [{ value: 0, disabled: true }, Validators.required],
      observaciones: ['']
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.cargarCatalogos();
      this.cargarLogoParaPDF();
      this.searchControl.valueChanges.pipe(debounceTime(500)).subscribe(val => this.buscarEnBackend(val || ''));
      this.formEncargo.get('id_maquilero')?.valueChanges.subscribe(id => this.buscarDireccionMaquilero(id));
    }
  }

  // --- MÉTODOS DE INTERFAZ ---
  esModeloSeleccionado(id: number): boolean {
    return this.modelosSeleccionados.some(m => m.id_modelo === id);
  }

  toggleTallaModelo(modelo: ModeloConTallas, indexTalla: number): void {
    const talla = modelo.tallas[indexTalla];
    if (!talla.seleccionada) talla.cantidad = null;
    this.actualizarTotalPiezasGlobal();
  }

  // --- LÓGICA DE DATOS ---
  cargarCatalogos(): void {
    this.formatoService.getEmpresas().subscribe(data => this.listaEmpresas = data);
    this.formatoService.getMaquileros().subscribe(data => this.listaMaquileros = data);
    this.formatoService.getEstatus().subscribe(data => this.listaStatus = data);
    this.formatoService.getTallas().subscribe(data => {
      this.plantillaTallas = data.map(t => ({
        id_tallas: t.id_tallas || 0, nombre_talla: t.nombre_talla, seleccionada: false, cantidad: null
      }));
    });
    this.buscarEnBackend('');
  }

  buscarEnBackend(texto: string): void {
    this.isLoadingModelos = true;
    this.disenoService.getModelos(0, 3000, texto)
      .pipe(finalize(() => { this.isLoadingModelos = false; this.cdr.detectChanges(); }))
      .subscribe({ next: (resp) => { this.listaResultadosBusqueda = resp.data; this.actualizarListaIzquierda(); } });
  }

  actualizarListaIzquierda(): void {
    this.listaDisenosFiltrada = this.listaResultadosBusqueda.filter(m =>
      !this.modelosSeleccionados.some(sel => sel.id_modelo === m.id_modelo)
    ).slice(0, 25);
  }

  toggleModelo(modeloBase: ModeloNuevo): void {
    const id = modeloBase.id_modelo || 0;
    const index = this.modelosSeleccionados.findIndex(m => m.id_modelo === id);
    if (index === -1) {
      const nuevasTallas = JSON.parse(JSON.stringify(this.plantillaTallas));
      const nuevoModelo: ModeloConTallas = { ...modeloBase, tallas: nuevasTallas };
      this.modelosSeleccionados.push(nuevoModelo);
      this.cargarYCachearDetalles(nuevoModelo);
    } else { this.removerModelo(id); }
    this.actualizarTotalPiezasGlobal();
    this.actualizarListaIzquierda();
  }

  removerModelo(id: number): void {
    this.modelosSeleccionados = this.modelosSeleccionados.filter(m => m.id_modelo !== id);
    this.cacheDetalles.delete(id);
    this.actualizarTotalPiezasGlobal();
    this.actualizarListaIzquierda();
  }

  actualizarTotalPiezasGlobal(): void {
    let granTotal = 0;
    this.modelosSeleccionados.forEach(mod => {
      mod.tallas.forEach(t => { if (t.seleccionada && t.cantidad) granTotal += Number(t.cantidad); });
    });
    this.formEncargo.controls['piezas'].setValue(granTotal);
  }

  buscarDireccionMaquilero(idMaquilero: number): void {
    const maquilero = this.listaMaquileros.find(m => m.id_maquilero == idMaquilero);
    if (maquilero?.direccion) {
      const d = (maquilero as any).direccion;
      this.direccionMaquileroStr = `${d.calle || ''} #${d.numero_exterior || ''}, ${d.colonia || ''}, ${d.ciudad || ''}`;
    } else { this.direccionMaquileroStr = 'Dirección no disponible'; }
  }

  cargarYCachearDetalles(modelo: ModeloNuevo): void {
    const id = modelo.id_modelo || 0;
    this.cacheDetalles.set(id, { operaciones: [], img1: null, img2: null });
    if (modelo.imagen1) this.procesarImagen(modelo.imagen1 as any, (res) => {
      const item = this.cacheDetalles.get(id); if (item) item.img1 = res;
    });
    if (modelo.imagen2) this.procesarImagen(modelo.imagen2 as any, (res) => {
      const item = this.cacheDetalles.get(id); if (item) item.img2 = res;
    });
  }

  private procesarImagen(ruta: string, callback: (res: any) => void) {
    const url = `${this.baseUrl}${String(ruta).replace(/\\/g, '/')}`;
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            const img = new Image();
            img.onload = () => callback({ base64: reader.result as string, width: img.width, height: img.height });
            img.src = reader.result as string;
          }
        };
        reader.readAsDataURL(blob);
      },
      error: () => callback(null)
    });
  }

  cargarLogoParaPDF(): void {
    this.http.get(this.rutaLogo, { responseType: 'blob' }).subscribe(blob => {
      const reader = new FileReader();
      reader.onloadend = () => this.logoBase64 = reader.result as string;
      reader.readAsDataURL(blob);
    });
  }

  // --- GENERACIÓN DEL PDF ---
  previsualizarPDF(): void { this.generarPDF(true); }
  descargarPDF(): void { this.generarPDF(false); }

  private generarPDF(preview: boolean): void {
    if (this.modelosSeleccionados.length === 0) return;

    // --- CORRECCIÓN 1: VALIDACIÓN DE CARGA DE IMÁGENES ---
    // Verificar si hay alguna imagen que debería estar pero aún no ha cargado (está null en caché)
    const imagenesPendientes = this.modelosSeleccionados.some(m => {
        const detalles = this.cacheDetalles.get(m.id_modelo || 0);
        // Si el modelo tiene ruta de imagen (imagen1) pero en cacheDetalles.img1 sigue siendo null
        if (m.imagen1 && !detalles?.img1) return true;
        return false;
    });

    if (imagenesPendientes) {
        Swal.fire({
            title: 'Cargando imágenes...',
            text: 'Por favor espera unos segundos a que se descarguen las imágenes del servidor.',
            icon: 'info',
            timer: 2000
        });
        return;
    }
    // -----------------------------------------------------

    const doc = this.construirPDF();
    if (preview) window.open(doc.output('bloburl'), '_blank');
    else doc.save(`Especificaciones_${new Date().getTime()}.pdf`);
  }

  private construirPDF(): jsPDF {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.height;
    const formData = this.formEncargo.getRawValue();
    const maquilero = this.listaMaquileros.find(m => m.id_maquilero == formData.id_maquilero);
    const nombreMaq = maquilero ? `${maquilero.nombres} ${maquilero.apellido_paterno}` : 'N/A';

    this.modelosSeleccionados.forEach((modelo, index) => {
      if (index > 0) doc.addPage();

      // 1. Header
      if (this.logoBase64) doc.addImage(this.logoBase64, 'PNG', 10, 10, 20, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(13, 35, 57);
      doc.text('HOJA DE ESPECIFICACIONES TÉCNICAS', pageWidth / 2, 20, { align: 'center' });

      // 2. Info General
      doc.setFontSize(9);
      doc.setTextColor(0);
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 15, 35);
      doc.text(`Maquilero: ${nombreMaq}`, 15, 40);
      doc.setFontSize(8);
      const splitDir = doc.splitTextToSize(`Dirección: ${this.direccionMaquileroStr}`, pageWidth - 30);
      doc.text(splitDir, 15, 45);

      let currentY = 52;

      // 3. Bloque de Datos (Rectángulo gris)
      doc.setFillColor(242, 242, 242);
      doc.rect(10, currentY, pageWidth - 20, 18, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`DISEÑO: ${modelo.nombre_modelo}`, 15, currentY + 7);
      doc.text(`CÓDIGO: ${modelo.modelo}`, 100, currentY + 7);

      const tallasStr = modelo.tallas.filter(t => t.seleccionada).map(t => `${t.nombre_talla}(${t.cantidad})`).join(' | ');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`TALLAS: ${tallasStr || 'N/A'}`, 15, currentY + 13);

      currentY += 25;

      // 4. IMÁGENES CENTRADAS
      const detalles = this.cacheDetalles.get(modelo.id_modelo || 0);
      const imgWidth = 105;
      const imgHeight = 85;
      const centerX = (pageWidth - imgWidth) / 2;

      // Imagen 1: Canvas (Frente) -> AQUÍ ESTABA EL ERROR
      if (detalles?.img1) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text("ESQUEMA TÉCNICO DE DISEÑO", pageWidth / 2, currentY, { align: 'center' });
        currentY += 4;

        // --- CORRECCIÓN 2: DETECCIÓN DE FORMATO (PNG vs JPEG) ---
        let formatoImagen = 'PNG'; // Valor por defecto

        // Verificamos si la cabecera del base64 dice "image/jpeg"
        if (detalles.img1.base64.includes('image/jpeg') || detalles.img1.base64.includes('image/jpg')) {
            formatoImagen = 'JPEG';
        }

        // Ahora pasamos la variable 'formatoImagen' en lugar del string fijo 'PNG'
        doc.addImage(detalles.img1.base64, formatoImagen, centerX, currentY, imgWidth, imgHeight);
        // --------------------------------------------------------
      }

      // 5. Observaciones (Al final de la hoja)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('OBSERVACIONES GENERALES:', 15, pageHeight - 40);
      doc.setFont('helvetica', 'normal');
      const obs = doc.splitTextToSize(formData.observaciones || 'Sin observaciones.', pageWidth - 30);
      doc.text(obs, 15, pageHeight - 35);

      // 6. Firma
      doc.setDrawColor(180);
      doc.line(pageWidth / 2 - 35, pageHeight - 15, pageWidth / 2 + 35, pageHeight - 15);
      doc.setFontSize(8);
      doc.text("FIRMA DE RECIBIDO", pageWidth / 2, pageHeight - 10, { align: 'center' });
    });

    return doc;
  }

  onSubmit(): void {
    // 1. VALIDACIÓN: Campos Generales (Empresa, Maquilero, Estatus)
    if (this.formEncargo.invalid) {
      Swal.fire('Atención', 'Por favor selecciona Empresa, Maquilero y Estatus para continuar.', 'warning');
      this.formEncargo.markAllAsTouched();
      return;
    }

    // 2. VALIDACIÓN: Al menos un modelo seleccionado
    if (this.modelosSeleccionados.length === 0) {
      Swal.fire('Atención', 'Debes seleccionar al menos un modelo de la lista.', 'warning');
      return;
    }

    // 3. VALIDACIÓN ESTRICTA: Verificar tallas y cantidades por modelo
    const modelosSinTallas = this.modelosSeleccionados.filter(modelo => {
        const totalPiezasModelo = modelo.tallas.reduce((acc, t) => {
            if (t.seleccionada && t.cantidad && Number(t.cantidad) > 0) {
                return acc + Number(t.cantidad);
            }
            return acc;
        }, 0);
        return totalPiezasModelo === 0;
    });

    if (modelosSinTallas.length > 0) {
        const nombres = modelosSinTallas.map(m => m.nombre_modelo).join(', ');
        Swal.fire({
            icon: 'warning',
            title: 'Modelos incompletos',
            text: `Los siguientes modelos no tienen tallas o cantidades asignadas: ${nombres}. Por favor asigna al menos una talla.`,
            confirmButtonColor: '#0e2b48'
        });
        return;
    }

    // --- SI TODO ESTÁ CORRECTO, PROCEDEMOS ---

    // Mostrar loading
    Swal.fire({
      title: 'Procesando...',
      text: 'Registrando datos y subiendo archivos',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // 4. Preparamos una petición de GUARDADO DE DATOS por cada modelo
    const peticionesDatos = this.modelosSeleccionados.map(modelo => {
      const detallesTallas = modelo.tallas
        .filter(t => t.seleccionada && t.cantidad && t.cantidad > 0)
        .map(t => ({
          id_tallas: t.id_tallas,
          cantidad: Number(t.cantidad)
        }));

      const totalPiezasModelo = detallesTallas.reduce((acc, curr) => acc + curr.cantidad, 0);

      const payload = {
        id_empresa: this.formEncargo.value.id_empresa,
        id_maquilero: this.formEncargo.value.id_maquilero,
        id_estatus: this.formEncargo.value.id_estatus,
        observaciones: this.formEncargo.value.observaciones,
        id_modelo: modelo.id_modelo,
        piezas: totalPiezasModelo,
        detalles: detallesTallas
      };

      return this.formatoService.crearEncargo(payload as any);
    });

    // 5. Ejecutamos el guardado de DATOS
    forkJoin(peticionesDatos).subscribe({
      next: (respuestas) => {
        console.log('Datos guardados. IDs generados:', respuestas);

        // --- VALIDACIÓN EXTRA ANTES DE SUBIR ---
        // Aseguramos que las imágenes estén listas antes de generar el PDF final para subir
        // Esto es raro que falle aquí porque ya pasó tiempo, pero es bueno prevenir.
        const pdfBlob = this.construirPDF().output('blob');

        const peticionesSubida = respuestas.map((res: any) =>
          this.formatoService.subirPDF(res.id_formato, pdfBlob)
        );

        forkJoin(peticionesSubida).subscribe({
          next: () => {
            Swal.fire({
              title: '¡Éxito!',
              text: 'Encargos registrados y PDF subido al servidor correctamente.',
              icon: 'success',
              timer: 2000
            }).then(() => {
              this.descargarPDF();
              this.limpiarTodo();
            });
          },
          error: (errSubida) => {
            console.error('Error subiendo PDF:', errSubida);
            Swal.fire('Advertencia', 'Los datos se guardaron, pero hubo un error al subir el PDF al servidor.', 'warning');
          }
        });

      },
      error: (err) => {
        console.error('Error al guardar datos:', err);
        Swal.fire('Error', 'No se pudieron guardar los datos en la base de datos.', 'error');
      }
    });
  }

  limpiarTodo(): void {
    this.formEncargo.reset();
    this.modelosSeleccionados = [];
    this.cacheDetalles.clear();
  }
}
