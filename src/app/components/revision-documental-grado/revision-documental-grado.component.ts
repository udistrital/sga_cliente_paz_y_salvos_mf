import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, Optional } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AlertService } from '../../services/alert.service';
import { mensajeErrorBorrador, TipoSoporteGrado } from '../../services/inscripcion-grado.service';
import { PermisosService } from '../../services/permisos.service';
import { DecisionSoporteRevision, RevisionDocumentalEntrada, RevisionDocumentalGradoService, SolicitudRevisionResumen, SoporteRevisionGrado } from '../../services/revision-documental-grado.service';

type EstadoDecision = 'pendiente' | 'aprobado' | 'observado';

interface DecisionVista {
  soporte: SoporteRevisionGrado;
  estado: EstadoDecision;
  observacion: string;
}

@Component({
  selector: 'app-revision-documental-grado',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, MatButtonModule, MatCardModule, MatFormFieldModule,
    MatIconModule, MatInputModule, MatProgressBarModule, MatSelectModule, MatTableModule, MatPaginatorModule],
  providers: [MatPaginatorIntl],
  templateUrl: './revision-documental-grado.component.html',
  styleUrls: ['./revision-documental-grado.component.scss']
})
export class RevisionDocumentalGradoComponent implements OnInit, OnDestroy {
  solicitudes: SolicitudRevisionResumen[] = [];
  readonly tabla = new MatTableDataSource<SolicitudRevisionResumen>([]);
  readonly columnas = ['codigo', 'trabajo', 'programa', 'radicacion', 'estado', 'acciones'];
  consultaRealizada = false;
  private consultaListado?: Subscription;
	pageSize = 10;
	pageIndex = 0;
	totalSolicitudes = 0;
  seleccionada: SolicitudRevisionResumen | null = null;
  decisiones: DecisionVista[] = [];
  comentarioGeneral = '';
  filtro = '';
  filtroEstado = '';
	filtroPeriodo: number | null = null;
	filtroPrograma: number | null = null;
	periodosFiltro: { id: number; nombre: string }[] = [];
	programasFiltro: { id: number; nombre: string }[] = [];
	private programasAutorizados: { id: number; nombre: string }[] = [];
	cargandoFiltros = false;
	errorFiltros = '';
  cargando = false;
  guardando = false;
  descargando = '';
  error = '';
  private suscripciones = new Subscription();
  private urlPDF = '';

  constructor(
    private servicio: RevisionDocumentalGradoService,
    public permisos: PermisosService,
    private alertas: AlertService,
    private translate: TranslateService,
    @Optional() private paginadorIntl?: MatPaginatorIntl
  ) {}

  ngOnInit(): void {
    this.traducirPaginador();
    if (this.translate.onLangChange) {
	  this.suscripciones.add(this.translate.onLangChange.subscribe(() => {
		this.traducirPaginador();
	  }));
    }
    this.cargarFiltros();
  }

  ngOnDestroy(): void {
    this.suscripciones.unsubscribe();
    this.consultaListado?.unsubscribe();
    this.liberarPDF();
  }

	  cargar(): void {
	    this.limpiarConsulta();
		if (this.filtroPeriodo === null || this.filtroPrograma === null || !this.permisos.permite('grado_consultar_solicitudes')) return;
	this.cargarPagina();
	  }

	  private cargarPagina(): void {
		if (this.filtroPeriodo === null || this.filtroPrograma === null || !this.permisos.permite('grado_consultar_solicitudes')) return;
		this.consultaListado?.unsubscribe();
		this.cargando = true;
		this.error = '';
		this.consultaListado = this.servicio.listar(this.pageSize, this.pageIndex * this.pageSize,
		  this.filtroPeriodo, this.filtroPrograma, this.filtroEstado, this.filtro).subscribe({
	      next: pagina => {
	        this.solicitudes = pagina.Solicitudes;
	        this.tabla.data = pagina.Solicitudes;
			this.totalSolicitudes = pagina.Total;
	        this.consultaRealizada = true;
	        this.cargando = false;
      },
      error: error => {
        this.error = mensajeErrorBorrador(error, this.tr('errores.cargar'));
        this.cargando = false;
      }
    });
  }

  cargarFiltros(): void {
	if (!this.permisos.permite('grado_consultar_solicitudes')) return;
	this.cargandoFiltros = true;
	this.errorFiltros = '';
	this.suscripciones.add(this.servicio.filtros().subscribe({
	  next: catalogo => {
		this.periodosFiltro = catalogo.Periodos.map(p => ({ id: p.Id, nombre: p.Nombre }));
		this.programasAutorizados = catalogo.Programas.map(p => ({ id: p.Id, nombre: p.Nombre }));
		this.cargandoFiltros = false;
		if (this.filtroPeriodo !== 0 && !this.periodosFiltro.some(p => p.id === this.filtroPeriodo)) this.filtroPeriodo = null;
		const anterior = this.filtroPrograma;
		this.actualizarProgramasFiltro();
			if (anterior !== this.filtroPrograma || (this.filtroPeriodo === null && (this.consultaRealizada || this.cargando))) this.limpiarConsulta();
	  },
	  error: error => {
		this.errorFiltros = mensajeErrorBorrador(error, this.tr('errores.filtros'));
		this.cargandoFiltros = false;
	  }
	}));
  }

	private actualizarProgramasFiltro(): void {
		this.programasFiltro = this.filtroPeriodo !== null ? this.programasAutorizados : [];
		if (this.filtroPeriodo === null || (this.filtroPrograma !== 0 && !this.programasFiltro.some(programa => programa.id === this.filtroPrograma))) {
			this.filtroPrograma = null;
		}
	}

	  cambiarPeriodo(): void {
		this.actualizarProgramasFiltro();
		this.filtro = '';
		this.limpiarConsulta();
	  }

	  cambiarPrograma(): void { this.filtro = ''; this.limpiarConsulta(); }

	  cambiarEstado(): void { this.filtro = ''; this.limpiarConsulta(); }

	  private limpiarConsulta(): void {
		this.consultaListado?.unsubscribe();
		this.solicitudes = [];
		this.tabla.data = [];
		this.totalSolicitudes = 0;
		this.pageIndex = 0;
		this.consultaRealizada = false;
		this.cargando = false;
		this.error = '';
	  }

	identificarFiltro(_: number, opcion: { id: number }): number { return opcion.id; }

	  aplicarBusqueda(): void { this.pageIndex = 0; this.cargarPagina(); }

	  cambiarPagina(evento: PageEvent): void {
		this.pageSize = evento.pageSize;
		this.pageIndex = evento.pageIndex;
		this.cargarPagina();
	  }

	  get solicitudesFiltradas(): SolicitudRevisionResumen[] { return this.tabla.data; }

  private traducirPaginador(): void {
    if (!this.paginadorIntl) return;
    this.paginadorIntl.itemsPerPageLabel = this.tr('paginacion.por_pagina');
    this.paginadorIntl.nextPageLabel = this.tr('paginacion.siguiente');
    this.paginadorIntl.previousPageLabel = this.tr('paginacion.anterior');
    this.paginadorIntl.firstPageLabel = this.tr('paginacion.primera');
    this.paginadorIntl.lastPageLabel = this.tr('paginacion.ultima');
    this.paginadorIntl.getRangeLabel = (pagina, tamano, total) => total === 0 ? this.tr('paginacion.sin_resultados') :
      this.translate.instant('REVISION_GRADO.paginacion.rango', {
        inicio: pagina * tamano + 1, fin: Math.min((pagina + 1) * tamano, total), total
      });
    this.paginadorIntl.changes.next();
  }

  async abrir(solicitud: SolicitudRevisionResumen): Promise<void> {
    if (!this.permisos.permite('grado_consultar_expediente')) return;
    this.cargando = true;
    this.error = '';
    try {
      const detalle = await firstValueFrom(this.servicio.consultar(solicitud.Solicitud.Id));
      this.seleccionada = detalle;
      this.comentarioGeneral = '';
      this.decisiones = detalle.Soportes.map(soporte => ({ soporte, estado: 'pendiente', observacion: '' }));
    } catch (error) {
      this.error = mensajeErrorBorrador(error, this.tr('errores.detalle'));
    } finally {
      this.cargando = false;
    }
  }

  volver(): void {
    if (this.guardando) return;
    this.seleccionada = null;
    this.decisiones = [];
	    this.comentarioGeneral = '';
	    this.error = '';
		this.cargarPagina();
  }

  marcar(decision: DecisionVista, estado: Exclude<EstadoDecision, 'pendiente'>): void {
    const permiso = estado === 'aprobado' ? 'grado_aprobar_soporte' : 'grado_observar_soporte';
    if (!this.puedeDecidir || !this.permisos.permite(permiso)) return;
    decision.estado = estado;
    if (estado === 'aprobado') decision.observacion = '';
  }

  async ver(soporte: SoporteRevisionGrado): Promise<void> {
    if (!this.seleccionada || !this.permisos.permite('grado_ver_soporte') || this.descargando) return;
    this.descargando = soporte.TipoSoporte;
    this.error = '';
    try {
      const archivo = await firstValueFrom(this.servicio.archivo(this.seleccionada.Solicitud.Id, soporte.TipoSoporte));
      this.liberarPDF();
      this.urlPDF = URL.createObjectURL(archivo.blob);
      window.open(this.urlPDF, '_blank', 'noopener,noreferrer');
    } catch (error) {
      this.error = mensajeErrorBorrador(error, this.tr('errores.soporte'));
    } finally {
      this.descargando = '';
    }
  }

  async guardarDecision(devolverPorComentario = false): Promise<void> {
    if (!this.seleccionada || !this.puedeDecidir || this.guardando || !this.decisionesCompletas) return;
    const observadas = this.decisiones.filter(decision => decision.estado === 'observado');
    const aprobada = observadas.length === 0 && !devolverPorComentario;
    if (!aprobada && (!this.comentarioGeneral.trim() || observadas.some(decision => !decision.observacion.trim()))) {
      this.error = this.tr('errores.comentarios');
      return;
    }
    const permiso = aprobada ? 'grado_aprobar_documentacion' : 'grado_devolver_documentacion';
    if (!this.permisos.permite(permiso)) return;
    this.guardando = true;
    const confirmacion = await this.alertas.showConfirmAlert(
      aprobada ? 'REVISION_GRADO.confirmaciones.aprobar_texto' : 'REVISION_GRADO.confirmaciones.devolver_texto',
      {
        titleKey: aprobada ? 'REVISION_GRADO.confirmaciones.aprobar_titulo' : 'REVISION_GRADO.confirmaciones.devolver_titulo',
        confirmButtonKey: aprobada ? 'REVISION_GRADO.acciones.aprobar_expediente' : 'REVISION_GRADO.acciones.devolver'
      }
    );
    if (!confirmacion.isConfirmed) {
      this.guardando = false;
      return;
    }
    const entrada: RevisionDocumentalEntrada = {
      FormularioId: this.decisiones[0].soporte.FormularioId,
      Aprobada: aprobada,
      Justificacion: this.comentarioGeneral.trim(),
      Soportes: this.decisiones.map<DecisionSoporteRevision>(decision => ({
        SoporteId: decision.soporte.Id,
        Observado: decision.estado === 'observado',
        Observacion: decision.observacion.trim()
      }))
    };
    this.error = '';
    this.alertas.showLoading(this.tr('mensajes.guardando'));
    try {
      const actualizada = await firstValueFrom(this.servicio.revisar(this.seleccionada.Solicitud.Id, entrada));
      this.seleccionada = actualizada;
      this.solicitudes = this.solicitudes.map(item => item.Solicitud.Id === actualizada.Solicitud.Id ? actualizada : item);
      this.tabla.data = this.solicitudes;
	      this.decisiones = actualizada.Soportes.map(soporte => ({ soporte, estado: 'pendiente', observacion: '' }));
      this.alertas.closeLoading();
      this.alertas.showSuccessAlert(this.tr(aprobada ? 'mensajes.aprobada' : 'mensajes.devuelta'));
    } catch (error) {
      this.alertas.closeLoading();
      this.error = mensajeErrorBorrador(error, this.tr('errores.guardar'));
      this.alertas.showErrorAlert(this.error);
    } finally {
      this.guardando = false;
    }
  }

  get puedeDecidir(): boolean { return this.seleccionada?.Estado === 'SG_RADICADA'; }
  get decisionesCompletas(): boolean {
    return this.decisiones.length >= 3 && this.decisiones.length <= 4 && this.decisiones.every(d => d.estado !== 'pendiente');
  }
  get hayObservadas(): boolean { return this.decisiones.some(d => d.estado === 'observado'); }
  get soportesRevisados(): number { return this.decisiones.filter(d => d.estado !== 'pendiente').length; }

  valor(valor?: string | null): string {
    return valor?.trim() || this.tr('valores.sin_dato');
  }

  valorBooleano(valor: boolean | null): string {
    return valor === null ? this.tr('valores.sin_dato') : this.tr(valor ? 'valores.si' : 'valores.no');
  }

  fecha(valor: string | null): string {
    if (!valor) return this.tr('valores.sin_dato');
    const coincidencia = valor.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
    return coincidencia ? `${coincidencia[1]} ${coincidencia[2]}` : valor;
  }

  soporteKey(tipo: TipoSoporteGrado): string { return `soportes.${tipo}`; }

  private tr(clave: string): string { return this.translate.instant(`REVISION_GRADO.${clave}`); }

  private liberarPDF(): void {
    if (this.urlPDF) URL.revokeObjectURL(this.urlPDF);
    this.urlPDF = '';
  }
}
