import { Component, OnInit, inject, PLATFORM_ID, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { DisenoService } from '../../../core/services/diseno.service';
import { Categoria } from '../../../core/models/diseno.model';
import Swal from 'sweetalert2';

const RESET_STROKE = '#000000';
const RESET_FILL = '#ffffff';
const RESET_THICKNESS = 2;
const BACKEND_URL = 'https://sccga2.onrender.com';

interface CanvasObject {
  id: number; type: string; x: number; y: number; width: number; height: number;
  strokeColor: string; fillColor: string; thickness: number;
  rotation: number;
  text?: string; font?: string; fontSize?: number; textAlign?: 'left' | 'center' | 'right'; lineHeight?: number;
  imgElement?: HTMLImageElement;
}

type ToolType = 'move' | 'pencil' | 'eraser' | 'rect' | 'circle' | 'triangle' | 'line' | 'text' | 'image';

@Component({
  selector: 'app-crear-diseno',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './crear-disenos.html',
  styleUrls: ['./crear-disenos.css']
})
export class CrearDisenoComponent implements OnInit, AfterViewInit {
  @ViewChild('miCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;

  designForm: FormGroup;
  categorias: Categoria[] = [];
  isEditMode = false;
  disenoId: number | null = null;

  showShapesMenu = false;
  showContextMenu = false;
  contextMenuPos = { x: 0, y: 0 };
  canvasCursor: string = 'default';

  imagenReferenciaBase64: string | null = null;
  imagenReferenciaPreview: SafeUrl | null = null;

  currentTool: ToolType = 'move';
  colorTrazo = RESET_STROKE; colorRelleno = RESET_FILL; grosorTrazo = RESET_THICKNESS;

  // VARIABLES DE TEXTO
  fuenteEditable = 'Arial';
  tamanoTextoEditable = 30;

  showInPlaceEditor = false;

  canvasObjects: CanvasObject[] = [];
  selectedObject: CanvasObject | null = null;

  // Estados de interacción
  isDrawing = false;
  isDragging = false;
  isResizing = false;
  isRotating = false;

  startX = 0; startY = 0;
  dragOffsetX = 0; dragOffsetY = 0;

  thicknessOptions = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32];
  fontsLibrary = ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia', 'Impact', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black'];

  shapesLibrary = [
    { type: 'line', icon: '⎯' },
    { type: 'diagonal', icon: '╱' },
    { type: 'rect', icon: '⬜' },
    { type: 'circle', icon: '⭕' },
    { type: 'triangle', icon: '▲' },
    { type: 'diamond', icon: '💎' },
    { type: 'star5', icon: '⭐' },
    { type: 'arrow', icon: '➔' },      // Flecha Gruesa (Forma)
    { type: 'arrow-thin', icon: '→' }  // <--- NUEVA FLECHA DELGADA
  ];

  closedShapes = ['rect', 'circle', 'triangle', 'diamond', 'star5', 'arrow'];

  private fb = inject(FormBuilder);
  private disenoService = inject(DisenoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);
  private sanitizer = inject(DomSanitizer);

  constructor() {
    this.designForm = this.fb.group({
      nombre_modelo: ['', Validators.required],
      id_categoria: ['', Validators.required],
      modelo: [{ value: '', disabled: true }],
      operaciones: this.fb.array([])
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.cargarCategorias();
      this.route.params.subscribe((params: any) => {
        if (params['id']) {
          this.isEditMode = true;
          this.disenoId = +params['id'];
          this.cargarDatosParaEditar(this.disenoId);
        } else {
          this.isEditMode = false;
          this.agregarOperacion();
          this.configurarGeneracionCodigo();
        }
      });
    }
  }

  // --- MANEJO DIRECTO DE TECLADO ---
  @HostListener('window:keydown', ['$event'])
  manejarTeclado(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

    if (!this.selectedObject) return;

    if (this.selectedObject.type === 'text') {
      const obj = this.selectedObject;
      if (!obj.text) obj.text = "";

      if (event.key === 'Backspace') {
        event.preventDefault();
        obj.text = obj.text.slice(0, -1);
        this.redrawAll();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        obj.text += '\n';
        this.redrawAll();
        return;
      }

      if (event.key === 'Delete') {
        event.preventDefault();
        this.eliminarObjetoSeleccionado();
        return;
      }

      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        obj.text += event.key;
        this.redrawAll();
      }
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.eliminarObjetoSeleccionado();
    }
  }

  cargarDatosParaEditar(id: number) {
    this.disenoService.getDisenoPorId(id).subscribe({
      next: (diseno: any) => {
        this.designForm.patchValue({ nombre_modelo: diseno.nombre_modelo, id_categoria: diseno.id_categoria, modelo: diseno.modelo });
        if (diseno.imagen2) {
          const pathLimpio = diseno.imagen2.replace(/^\/+/, '');
          const fullUrl = diseno.imagen2.startsWith('http') ? diseno.imagen2 : `${BACKEND_URL}/${pathLimpio}`;
          this.imagenReferenciaPreview = this.sanitizer.bypassSecurityTrustUrl(fullUrl);
          this.imagenReferenciaBase64 = diseno.imagen2;
        }
        const ops = this.operaciones; ops.clear();
        if (diseno.operaciones) diseno.operaciones.forEach((op: any) => ops.push(this.fb.group({ nombre_operacion: [op.nombre_operacion] })));
        if (diseno.canvas_json) {
          this.canvasObjects = JSON.parse(diseno.canvas_json);
          this.canvasObjects.forEach(obj => {
            if (obj.rotation === undefined) obj.rotation = 0;
            if (obj.type === 'image' && obj.text) {
              const img = new Image();
              const imgSrc = (obj.text.startsWith('http') || obj.text.startsWith('data:')) ? obj.text : `${BACKEND_URL}/${obj.text.replace(/^\/+/, '')}`;
              img.onload = () => { obj.imgElement = img; this.redrawAll(); };
              img.src = imgSrc;
            }
          });
          this.intentarRedibujar();
        }
      },
      error: () => Swal.fire('Error', 'No se pudo cargar el diseño', 'error')
    });
  }

  cargarImagenDesdePC(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev: any) => {
        const img = new Image();
        img.onload = () => {
          const n: CanvasObject = { id: Date.now(), type: 'image', x: 100, y: 100, width: 200, height: 200 * (img.height / img.width), strokeColor: '', fillColor: '', thickness: 0, rotation: 0, imgElement: img, text: ev.target.result };
          this.canvasObjects.push(n); this.seleccionarObjeto(n); this.redrawAll();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  onSeleccionarImagenReferencia(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev: any) => {
        this.imagenReferenciaPreview = this.sanitizer.bypassSecurityTrustUrl(ev.target.result);
        this.imagenReferenciaBase64 = ev.target.result;
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  quitarImagenReferencia() { this.imagenReferenciaPreview = null; this.imagenReferenciaBase64 = null; }

  onSubmit() {
    if (this.designForm.invalid) { Swal.fire('Atención', 'Datos incompletos', 'warning'); return; }

    // 1. Guardar selección y deseleccionar para foto limpia
    const objetoSeleccionadoTemp = this.selectedObject;
    this.selectedObject = null;
    this.redrawAll();

    // 2. Tomar foto
    const imagenLimpia = this.canvasRef.nativeElement.toDataURL('image/png');

    // 3. Restaurar selección
    this.selectedObject = objetoSeleccionadoTemp;
    this.redrawAll();

    const formValues = this.designForm.getRawValue();
    const serializableObjects = this.canvasObjects.map(obj => ({ ...obj, text: obj.type === 'image' && obj.imgElement ? obj.imgElement.src : obj.text, imgElement: undefined }));

    const finalPayload: any = {
      nombre_modelo: formValues.nombre_modelo, id_categoria: Number(formValues.id_categoria), modelo: formValues.modelo,
      canvas_json: JSON.stringify(serializableObjects),
      imagen_resultado: imagenLimpia,
      imagen2: this.imagenReferenciaBase64, operaciones: formValues.operaciones
    };

    if (this.isEditMode && this.disenoId) finalPayload.id_modelo = this.disenoId;
    const req = (this.isEditMode && this.disenoId) ? this.disenoService.actualizarDiseno(this.disenoId, finalPayload) : this.disenoService.crearDiseno(finalPayload);
    req.subscribe({ next: () => { Swal.fire('¡Éxito!', 'Guardado.', 'success'); this.isEditMode ? this.router.navigate(['/dashboard/catalogo']) : this.resetearEditor(); }, error: (err) => console.error("Error Servidor:", err.error) });
  }

  redrawAll() {
    if (!this.ctx) return;
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(0,0,800,500);

    this.canvasObjects.forEach(obj => this.drawFullShape(obj));

    if (this.selectedObject) {
        this.drawSelectionUI(this.selectedObject);
    }
  }

  drawFullShape(o: CanvasObject) {
    this.ctx.save();

    // --- LÓGICA DE ROTACIÓN ---
    const cx = o.x + o.width / 2;
    const cy = o.y + o.height / 2;
    this.ctx.translate(cx, cy);
    this.ctx.rotate(o.rotation || 0);
    this.ctx.translate(-cx, -cy);

    // --- ESTILOS ---
    this.ctx.strokeStyle = o.strokeColor;
    this.ctx.fillStyle = o.fillColor;
    this.ctx.lineWidth = o.thickness;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();

    switch (o.type) {
      case 'text':
        this.drawMultilineText(o);
        this.ctx.restore();
        return;

      case 'line':
        this.ctx.moveTo(o.x, cy);
        this.ctx.lineTo(o.x + o.width, cy);
        break;

      case 'diagonal':
        this.ctx.moveTo(o.x, o.y);
        this.ctx.lineTo(o.x + o.width, o.y + o.height);
        break;

      case 'rect':
        this.ctx.rect(o.x, o.y, o.width, o.height);
        break;

      case 'circle':
        this.ctx.arc(cx, cy, Math.abs(o.width / 2), 0, Math.PI * 2);
        break;

      case 'triangle':
        this.ctx.moveTo(cx, o.y);
        this.ctx.lineTo(o.x, o.y + o.height);
        this.ctx.lineTo(o.x + o.width, o.y + o.height);
        this.ctx.closePath();
        break;

      // --- AQUÍ ESTÁ LA NUEVA FLECHA DELGADA ---
      case 'arrow-thin':
        // Línea central
        this.ctx.moveTo(o.x, cy);
        this.ctx.lineTo(o.x + o.width, cy);

        // Punta de la flecha (estilo < o >)
        const headSize = 15; // Tamaño de la punta
        // Parte superior de la V
        this.ctx.lineTo(o.x + o.width - headSize, cy - headSize * 0.6);
        // Moverse al centro de nuevo
        this.ctx.moveTo(o.x + o.width, cy);
        // Parte inferior de la V
        this.ctx.lineTo(o.x + o.width - headSize, cy + headSize * 0.6);
        break;

      case 'image':
        if (o.imgElement && o.imgElement.complete) {
            this.ctx.drawImage(o.imgElement, o.x, o.y, o.width, o.height);
        }
        this.ctx.restore();
        return;

      default:
        // Figuras complejas (Flecha Gruesa, Diamante, Estrella)
        this.drawPolygons(o, cx, cy);
    }

    if (this.isClosedShape(o.type)) this.ctx.fill();
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawPolygons(o: CanvasObject, cx: number, cy: number) {
    if (o.type === 'diamond') {
        this.ctx.moveTo(cx, o.y);
        this.ctx.lineTo(o.x + o.width, cy);
        this.ctx.lineTo(cx, o.y + o.height);
        this.ctx.lineTo(o.x, cy);
        this.ctx.closePath();
    }
    else if (o.type === 'star5') {
        for (let i=0; i<10; i++) {
            const r = (i%2===0) ? o.width/2 : o.width/4;
            const angle = (Math.PI/5)*i - Math.PI/2;
            this.ctx.lineTo(cx + r*Math.cos(angle), cy + r*Math.sin(angle));
        }
        this.ctx.closePath();
    }
    // Flecha Gruesa (Polygon)
    else if (o.type === 'arrow') {
        const arrowHeadWidth = o.width * 0.4;
        const shaftHeight = o.height * 0.5;
        const shaftY = o.y + (o.height - shaftHeight) / 2;
        const arrowTipX = o.x + o.width;

        this.ctx.moveTo(o.x, shaftY);
        this.ctx.lineTo(o.x + o.width - arrowHeadWidth, shaftY);
        this.ctx.lineTo(o.x + o.width - arrowHeadWidth, o.y);
        this.ctx.lineTo(arrowTipX, cy);
        this.ctx.lineTo(o.x + o.width - arrowHeadWidth, o.y + o.height);
        this.ctx.lineTo(o.x + o.width - arrowHeadWidth, shaftY + shaftHeight);
        this.ctx.lineTo(o.x, shaftY + shaftHeight);
        this.ctx.closePath();
    }
  }

  configurarGeneracionCodigo() { this.designForm.get('id_categoria')?.valueChanges.subscribe(idCat => { if (!this.isEditMode && idCat) { this.disenoService.getSiguienteSecuencia(idCat).subscribe({ next: (resp: any) => { const cat = this.categorias.find(c => c.id_categoria == idCat); if (cat) { const codigoFinal = `UTP${cat.nombre_categoria.substring(0,3).toUpperCase()}${resp.siguiente_secuencia.toString().padStart(5, '0')}`; this.designForm.patchValue({ modelo: codigoFinal }); } } }); } }); }
  private intentarRedibujar() { if (this.ctx && this.canvasObjects.length > 0) setTimeout(() => this.redrawAll(), 300); }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
        this.ctx = this.canvasRef.nativeElement.getContext('2d', { willReadFrequently: true })!;
        if (!this.isEditMode) this.borrarTodo();
        else this.intentarRedibujar();
    }
  }

  closeContextMenu() { this.showContextMenu = false; }
  toggleShapesMenu() { this.showShapesMenu = !this.showShapesMenu; }
  onRightClick(e: MouseEvent) { e.preventDefault(); this.showContextMenu = true; this.contextMenuPos = { x: e.clientX, y: e.clientY }; }

  eliminarObjetoSeleccionado() { this.canvasObjects = this.canvasObjects.filter(o => o !== this.selectedObject); this.selectedObject = null; this.showContextMenu = false; this.redrawAll(); }

  onMouseDown(e: MouseEvent) {
    this.closeContextMenu();
    if (e.button !== 0) return;

    const {x,y} = this.getPos(e.clientX, e.clientY);
    this.startX = x; this.startY = y;

    if (this.currentTool === 'move') {
      if (this.selectedObject) {
        if (this.isHitRotationHandle(x, y, this.selectedObject)) {
            this.isRotating = true;
            return;
        }

        const hX = this.selectedObject.x + this.selectedObject.width;
        const hY = this.selectedObject.y + this.selectedObject.height;

        if (Math.abs(x - hX) < 20 && Math.abs(y - hY) < 20) {
            this.isResizing = true; return;
        }
      }

      const found = [...this.canvasObjects].reverse().find(o => this.isPointInRotatedRect(x, y, o));

      this.seleccionarObjeto(found || null);

      if (found && found.type === 'text') {
        this.fuenteEditable = found.font || 'Arial';
        this.tamanoTextoEditable = found.fontSize || 30;
      }

      if (found) {
        this.isDragging = true;
        this.dragOffsetX = x - found.x;
        this.dragOffsetY = y - found.y;
      }

    } else if (this.currentTool === 'text') {
      this.agregarFiguraDirecto('text');
      this.setTool('move');
    } else {
      this.isDrawing = true; this.ctx.beginPath(); this.ctx.moveTo(x,y);
    }
    this.redrawAll();
  }

  onMouseMove(e: MouseEvent) {
    const {x,y} = this.getPos(e.clientX, e.clientY);

    if (this.isRotating && this.selectedObject) {
        const cx = this.selectedObject.x + this.selectedObject.width / 2;
        const cy = this.selectedObject.y + this.selectedObject.height / 2;
        const angle = Math.atan2(y - cy, x - cx) + Math.PI / 2;
        this.selectedObject.rotation = angle;

    } else if (this.isResizing && this.selectedObject) {
        this.selectedObject.width = Math.max(30, x - this.selectedObject.x);
        this.selectedObject.height = Math.max(30, y - this.selectedObject.y);

    } else if (this.isDragging && this.selectedObject) {
        this.selectedObject.x = x - this.dragOffsetX;
        this.selectedObject.y = y - this.dragOffsetY;

    } else if (this.isDrawing) {
        this.ctx.lineTo(x,y);
        this.ctx.stroke();
    }
    this.redrawAll();
  }

  onMouseUp(e: MouseEvent) {
    this.isDrawing = false;
    this.isDragging = false;
    this.isResizing = false;
    this.isRotating = false;
    this.redrawAll();
  }

  isPointInRotatedRect(x: number, y: number, o: CanvasObject): boolean {
    const cx = o.x + o.width/2;
    const cy = o.y + o.height/2;
    const dx = x - cx;
    const dy = y - cy;
    const angle = -o.rotation;
    const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
    const ry = dx * Math.sin(angle) + dy * Math.cos(angle);
    return Math.abs(rx) <= o.width/2 && Math.abs(ry) <= o.height/2;
  }

  isHitRotationHandle(x: number, y: number, o: CanvasObject): boolean {
    const cx = o.x + o.width / 2;
    const cy = o.y + o.height / 2;
    const handleDist = o.height/2 + 25;
    const hx = cx + Math.sin(o.rotation) * handleDist;
    const hy = cy - Math.cos(o.rotation) * handleDist;
    return Math.sqrt(Math.pow(x - hx, 2) + Math.pow(y - hy, 2)) < 10;
  }

  get operaciones() { return this.designForm.get('operaciones') as FormArray; }
  agregarOperacion() { this.operaciones.push(this.fb.group({ nombre_operacion: [''] })); }
  eliminarOperacion(i: number) { this.operaciones.removeAt(i); }
  cargarCategorias() { this.disenoService.getCategorias().subscribe((d: any) => this.categorias = d); }
  getPos(cx: number, cy: number) { const rect = this.canvasRef.nativeElement.getBoundingClientRect(); return { x: (cx - rect.left) * (800 / rect.width), y: (cy - rect.top) * (500 / rect.height) }; }

  setTool(t: ToolType) {
    this.currentTool = t;
    this.selectedObject = null;
    this.canvasCursor = t === 'move' ? 'default' : 'crosshair';
    this.redrawAll();
  }

  borrarTodo() { this.canvasObjects = []; this.selectedObject = null; this.ctx.fillStyle = 'white'; this.ctx.fillRect(0,0,800,500); this.redrawAll(); }
  isClosedShape(t: string | undefined) { return t ? this.closedShapes.includes(t) : false; }
  seleccionarObjeto(obj: CanvasObject | null) { this.selectedObject = obj; }

  agregarFiguraDirecto(type: string) {
    const isText = type === 'text';
    const nuevo: CanvasObject = {
      id: Date.now(),
      type,
      x: 250,
      y: 150,
      width: isText ? 250 : 100,
      height: isText ? 50 : 100,
      strokeColor: RESET_STROKE,
      fillColor: RESET_FILL,
      thickness: isText ? 0 : RESET_THICKNESS,
      rotation: 0,
      fontSize: isText ? this.tamanoTextoEditable : undefined,
      font: isText ? this.fuenteEditable : undefined,
      text: isText ? 'Escribe aquí' : undefined
    };
    this.canvasObjects.push(nuevo);
    this.seleccionarObjeto(nuevo);
    this.redrawAll();
  }

  cambiarColorBorde() { if (this.selectedObject) this.selectedObject.strokeColor = this.colorTrazo; this.redrawAll(); }
  cambiarColorRelleno() { if (this.selectedObject) this.selectedObject.fillColor = this.colorRelleno; this.redrawAll(); }
  cambiarGrosor() { if (this.selectedObject) this.selectedObject.thickness = Number(this.grosorTrazo); this.redrawAll(); }

  cambiarFuente() {
    if (this.selectedObject && this.selectedObject.type === 'text') {
      this.selectedObject.font = this.fuenteEditable;
      this.redrawAll();
    }
  }

  cambiarTamanoTexto() {
    if (this.selectedObject && this.selectedObject.type === 'text') {
      this.selectedObject.fontSize = Number(this.tamanoTextoEditable);
      this.redrawAll();
    }
  }

  actualizarPropiedadesTexto() { this.redrawAll(); }
  resetearEditor() { this.designForm.reset(); const ops = this.operaciones; while(ops.length!==0) ops.removeAt(0); this.agregarOperacion(); this.borrarTodo(); this.imagenReferenciaPreview = null; this.imagenReferenciaBase64 = null; }

  drawMultilineText(o: CanvasObject) {
    if (!o.text) return;

    const fontSize = o.fontSize || 30;
    const fontFamily = o.font || 'Arial';

    this.ctx.font = `${fontSize}px "${fontFamily}"`;
    this.ctx.fillStyle = o.strokeColor || '#000000';
    this.ctx.textBaseline = 'top';

    const lineHeightRatio = 1.2;
    const lineHeight = fontSize * lineHeightRatio;

    const lines = o.text.split('\n');
    let maxLineWidth = 0;

    lines.forEach(line => {
      const metrics = this.ctx.measureText(line);
      if (metrics.width > maxLineWidth) {
        maxLineWidth = metrics.width;
      }
    });

    let y = o.y;
    lines.forEach(line => {
      this.ctx.fillText(line, o.x, y);
      y += lineHeight;
    });

    o.width = maxLineWidth + 20;
    o.height = (lines.length * lineHeight) + 10;
  }

  drawSelectionUI(o: CanvasObject) {
    this.ctx.save();
    const cx = o.x + o.width / 2;
    const cy = o.y + o.height / 2;
    this.ctx.translate(cx, cy);
    this.ctx.rotate(o.rotation || 0);
    this.ctx.translate(-cx, -cy);

    this.ctx.strokeStyle = '#00a8ff';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(o.x - 5, o.y - 5, o.width + 10, o.height + 10);
    this.ctx.setLineDash([]);

    this.ctx.fillStyle = '#00a8ff';
    this.ctx.fillRect(o.x + o.width - 5, o.y + o.height - 5, 12, 12);

    const handleDist = 25;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, o.y - 5);
    this.ctx.lineTo(cx, o.y - handleDist);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(cx, o.y - handleDist, 6, 0, Math.PI * 2);
    this.ctx.fillStyle = '#ff4757';
    this.ctx.fill();
    this.ctx.strokeStyle = '#fff';
    this.ctx.stroke();

    this.ctx.restore();
  }
}
