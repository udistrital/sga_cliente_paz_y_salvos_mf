import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, Optional } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AlertService } from '../../services/alert.service';
import { mensajeErrorBorrador, TipoSoporteGrado } from '../../services/inscripcion-grado.service';
import { CatalogosPazSalvosGrado, CodigoEstadoPazSalvo, CodigoTipoPazSalvo, CheckPazSalvoGrado,
  FiltrosConsultaPazSalvosGrado, PaginaPazSalvosGrado, PazSalvosGradoService,
  SolicitudPazSalvosGrado } from '../../services/paz-salvos-grado.service';
import { PermisosService } from '../../services/permisos.service';
import { UserService } from '../../services/user.service';
import { PerfilSelectorComponent } from '../perfil-selector/perfil-selector.component';
import { PazSalvosGradoGridComponent } from './paz-salvos-grado-grid.component';

const CONFIGURACIONES_CHECK: { tipo: CodigoTipoPazSalvo; sufijo: string }[] = [
  { tipo: 'TPS_COORDINACION', sufijo: 'coordinacion' },
  { tipo: 'TPS_FINANCIERO', sufijo: 'financiero' },
  { tipo: 'TPS_BIBLIOTECA', sufijo: 'biblioteca' },
  { tipo: 'TPS_LABORATORIOS', sufijo: 'laboratorios' },
  { tipo: 'TPS_BIENESTAR', sufijo: 'bienestar' },
  { tipo: 'TPS_URELINTER', sufijo: 'urelinter' },
  { tipo: 'TPS_EXTENSION', sufijo: 'extension' },
  { tipo: 'TPS_SECRETARIA', sufijo: 'secretaria' }
];
type EstadoDecision = '' | CodigoEstadoPazSalvo;
type ContextoConsulta = 'propio' | 'programas-asignados' | 'programa-coordinado' | 'facultad' | 'laboratorios' | 'global';
const CONTEXTOS_CONSULTA: Record<ContextoConsulta, string> = {
  propio: 'paz_salvos_consultar_propios',
  'programas-asignados': 'paz_salvos_consultar_programas_asignados',
  'programa-coordinado': 'paz_salvos_consultar_programa_coordinado',
  facultad: 'paz_salvos_consultar_facultad_asignada',
  laboratorios: 'paz_salvos_consultar_laboratorios',
  global: 'paz_salvos_consultar_global'
};

@Component({
  selector: 'app-paz-salvos-grado',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, MatButtonModule, MatCardModule, MatFormFieldModule,
    MatIconModule, MatInputModule, MatPaginatorModule, MatProgressBarModule, MatSelectModule, PerfilSelectorComponent,
    PazSalvosGradoGridComponent],
  providers: [MatPaginatorIntl],
  templateUrl: './paz-salvos-grado.component.html',
  styleUrls: ['./paz-salvos-grado.component.scss']
})
export class PazSalvosGradoComponent implements OnInit, OnDestroy {
  solicitudes: SolicitudPazSalvosGrado[] = [];
  pagina: PaginaPazSalvosGrado | null = null;
  seleccionada: SolicitudPazSalvosGrado | null = null;
  solicitudDecision: SolicitudPazSalvosGrado | null = null;
  estadoDecision: EstadoDecision = '';
  perfil = '';
  perfilesDisponibles: string[] = [];
  mostrarSelector = false;
  tipo?: CodigoTipoPazSalvo;
  sufijo = '';
  pageSize = 10;
  pageIndex = 0;
  cargando = false;
  guardando = false;
  consultaRealizada = false;
  justificacion = '';
  errorDecision = '';
  error = '';
  catalogos: CatalogosPazSalvosGrado = { Periodos: [], Facultades: [], Programas: [] };
  filtroCodigo = '';
  filtroFacultad = 0;
  filtroPrograma = 0;
  filtroPeriodo = 0;
  cargandoFiltros = false;
  private suscripciones = new Subscription();
	private urlPDF = '';

  constructor(private servicio: PazSalvosGradoService, public permisos: PermisosService, private usuario: UserService,
    private alertas: AlertService, private translate: TranslateService, @Optional() private paginadorIntl?: MatPaginatorIntl) {}

  ngOnInit(): void {
    this.traducirPaginador();
    this.suscripciones.add(this.translate.onLangChange.subscribe(() => this.traducirPaginador()));
    void this.inicializar();
  }

  ngOnDestroy(): void { this.suscripciones.unsubscribe(); this.liberarPDF(); }

  private async inicializar(): Promise<void> {
    try {
      await this.permisos.cargar();
      this.perfilesDisponibles = this.permisos.perfilesPara('semaforo_paz_salvos')
        .map(perfil => perfil.nombre).filter(perfil => this.contextoPerfil(perfil) !== null);
      const seleccionado = this.usuario.getSelectedRole();
      if (seleccionado && this.perfilesDisponibles.includes(seleccionado)) {
        this.activarPerfil(seleccionado);
      } else if (this.perfilesDisponibles.length === 1) {
        this.activarPerfil(this.perfilesDisponibles[0]);
      } else if (this.perfilesDisponibles.length > 1) {
        this.usuario.clearSelectedRole();
        this.mostrarSelector = true;
      } else {
        this.error = this.tr('errores.perfil');
      }
    } catch {
      this.error = this.tr('errores.permisos');
    }
  }

  seleccionarPerfil(perfil: string): void {
    if (!this.perfilesDisponibles.includes(perfil) ||
      !this.permisos.permite('paz_salvos_seleccionar_perfil', 'Botón', perfil) ||
      !this.permisos.permite('paz_salvos_confirmar_perfil', 'Botón', perfil)) return;
    this.activarPerfil(perfil);
  }

  cambiarPerfil(): void {
    if (this.guardando || this.perfilesDisponibles.length < 2) return;
    this.usuario.clearSelectedRole();
    this.perfil = '';
    this.tipo = undefined;
    this.sufijo = '';
    this.solicitudes = [];
    this.pagina = null;
    this.seleccionada = null;
    this.consultaRealizada = false;
    this.limpiarEstadoFiltros();
    this.error = '';
    this.mostrarSelector = true;
  }

  private configuracionesPerfil(perfil: string): typeof CONFIGURACIONES_CHECK {
    return CONFIGURACIONES_CHECK.filter(item =>
      this.permisos.permite(`paz_salvos_aprobar_${item.sufijo}`, 'Botón', perfil) ||
      this.permisos.permite(`paz_salvos_desaprobar_${item.sufijo}`, 'Botón', perfil) ||
      (item.tipo === 'TPS_SECRETARIA' && this.permisos.permite('paz_salvos_corregir_secretaria', 'Botón', perfil)));
  }

  private contextoPerfil(perfil: string): ContextoConsulta | null {
    if (!this.permisos.permite('paz_salvos_consultar_semaforo', 'Botón', perfil)) return null;
    const contextos = (Object.keys(CONTEXTOS_CONSULTA) as ContextoConsulta[])
      .filter(contexto => this.permisos.permite(CONTEXTOS_CONSULTA[contexto], 'Acción', perfil));
    return contextos.length === 1 ? contextos[0] : null;
  }

  private activarPerfil(perfil: string): void {
    const configuraciones = this.configuracionesPerfil(perfil);
    if (configuraciones.length > 1 || !this.contextoPerfil(perfil)) return;
    this.perfil = perfil;
    this.tipo = configuraciones[0]?.tipo;
    this.sufijo = configuraciones[0]?.sufijo || '';
    this.usuario.setSelectedRole(perfil);
    this.mostrarSelector = false;
    this.error = '';
    this.pageIndex = 0;
    this.limpiarEstadoFiltros();
    this.cargarCatalogos();
    this.cargar();
  }

  puedeFiltrar(nombre: 'codigo' | 'facultad' | 'proyecto' | 'periodo'): boolean {
    return !!this.perfil && this.permisos.permite(`paz_salvos_filtrar_${nombre}`, 'Acción', this.perfil);
  }

  get mostrarFiltros(): boolean {
    return this.puedeFiltrar('codigo') || this.puedeFiltrar('facultad') ||
      this.puedeFiltrar('proyecto') || this.puedeFiltrar('periodo');
  }

  get tituloPerfil(): string {
    return this.tipo ? this.tr(`tipos.${this.tipo}`) : this.perfil.replace(/_/g, ' ');
  }

  get programasFiltro(): CatalogosPazSalvosGrado['Programas'] {
    return this.catalogos.Programas.filter(programa => !this.filtroFacultad || programa.FacultadId === this.filtroFacultad);
  }

  cambiarFacultad(): void {
    if (!this.programasFiltro.some(programa => programa.Id === this.filtroPrograma)) this.filtroPrograma = 0;
  }

  aplicarFiltros(): void {
    if (!this.perfil || !this.permisos.permite('paz_salvos_buscar', 'Botón', this.perfil)) return;
    this.pageIndex = 0;
    this.cargar();
  }

  limpiarFiltros(): void {
    if (!this.perfil || !this.permisos.permite('paz_salvos_limpiar_filtros', 'Botón', this.perfil)) return;
    this.filtroCodigo = '';
    this.filtroFacultad = this.filtroPrograma = this.filtroPeriodo = 0;
    this.pageIndex = 0;
    this.cargar();
  }

  private limpiarEstadoFiltros(): void {
    this.catalogos = { Periodos: [], Facultades: [], Programas: [] };
    this.filtroCodigo = '';
    this.filtroFacultad = this.filtroPrograma = this.filtroPeriodo = 0;
    this.cargandoFiltros = false;
  }

  private cargarCatalogos(): void {
    const perfil = this.perfil;
    const tipo = this.tipo;
    if (!perfil || (!this.puedeFiltrar('facultad') && !this.puedeFiltrar('proyecto') && !this.puedeFiltrar('periodo'))) return;
    this.cargandoFiltros = true;
    this.suscripciones.add(this.servicio.filtros(perfil, tipo).subscribe({
      next: catalogos => {
        if (this.perfil !== perfil || this.tipo !== tipo) return;
        this.catalogos = catalogos;
        this.cargandoFiltros = false;
      },
      error: error => {
        if (this.perfil !== perfil || this.tipo !== tipo) return;
        this.error = mensajeErrorBorrador(error, this.tr('errores.filtros'));
        this.cargandoFiltros = false;
      }
    }));
  }

  private filtrosConsulta(): FiltrosConsultaPazSalvosGrado {
    return {
      codigo: this.puedeFiltrar('codigo') ? this.filtroCodigo : '',
      facultadId: this.puedeFiltrar('facultad') ? this.filtroFacultad : 0,
      programaId: this.puedeFiltrar('proyecto') ? this.filtroPrograma : 0,
      periodoId: this.puedeFiltrar('periodo') ? this.filtroPeriodo : 0
    };
  }

  cargar(): void {
    if (!this.perfil) return;
    this.cargando = true;
    this.error = '';
    this.suscripciones.add(this.servicio.listar(this.perfil, this.tipo, this.pageSize, this.pageIndex * this.pageSize,
      this.filtrosConsulta()).subscribe({
      next: pagina => {
        this.pagina = pagina;
        this.solicitudes = pagina.Solicitudes;
        this.consultaRealizada = true;
        this.cargando = false;
      },
      error: error => {
        this.error = mensajeErrorBorrador(error, this.tr('errores.cargar'));
        this.cargando = false;
      }
    }));
  }

  cambiarPagina(evento: PageEvent): void {
    this.pageSize = evento.pageSize;
    this.pageIndex = evento.pageIndex;
    this.cargar();
  }

  async abrir(solicitud: SolicitudPazSalvosGrado): Promise<void> {
    this.cargando = true;
    this.error = '';
    try {
      this.seleccionada = await firstValueFrom(this.servicio.consultar(solicitud.Solicitud.Id, this.perfil));
      this.justificacion = '';
    } catch (error) {
      this.error = mensajeErrorBorrador(error, this.tr('errores.detalle'));
    } finally {
      this.cargando = false;
    }
  }

  abrirDecision(solicitud: SolicitudPazSalvosGrado): void {
    if (this.guardando) return;
    this.solicitudDecision = solicitud;
    this.estadoDecision = '';
    this.justificacion = '';
    this.errorDecision = '';
  }

  cancelarDecision(): void {
    if (this.guardando) return;
    this.solicitudDecision = null;
    this.estadoDecision = '';
    this.justificacion = '';
    this.errorDecision = '';
  }

  volver(): void {
    if (this.guardando) return;
    this.seleccionada = null;
    this.justificacion = '';
  }

  checkGestionado(solicitud = this.seleccionada): CheckPazSalvoGrado | undefined {
    return solicitud?.Checks.find(check => check.PazSalvo.TipoCodigo === this.tipo);
  }

  puede(accion: 'aprobar' | 'desaprobar'): boolean {
    const nombre = accion === 'desaprobar' && this.tipo === 'TPS_SECRETARIA' ?
      'paz_salvos_corregir_secretaria' : `paz_salvos_${accion}_${this.sufijo}`;
    return !!this.perfil && this.permisos.permite(nombre, 'Botón', this.perfil);
  }

  puedeDecidir(estado: CodigoEstadoPazSalvo,
    solicitud = this.solicitudDecision || this.seleccionada): boolean {
    const actual = this.checkGestionado(solicitud)?.EstadoActual.EstadoCodigo;
    if (!actual || actual === estado) return false;
    const cierre = solicitud?.Checks.find(check => check.PazSalvo.TipoCodigo === 'TPS_SECRETARIA');
    if (estado === 'PS_PENDIENTE') {
      if (!this.puede(actual === 'PS_APROBADO' ? 'aprobar' : 'desaprobar')) return false;
      return this.tipo === 'TPS_SECRETARIA' || cierre?.EstadoActual.EstadoCodigo !== 'PS_APROBADO';
    }
    if (!this.puede(estado === 'PS_APROBADO' ? 'aprobar' : 'desaprobar')) return false;
    if (this.tipo !== 'TPS_SECRETARIA') return cierre?.EstadoActual.EstadoCodigo !== 'PS_APROBADO';
    if (estado === 'PS_DESAPROBADO') return actual === 'PS_APROBADO';
    return !!solicitud?.Checks
      .filter(check => check.PazSalvo.TipoCodigo !== 'TPS_SECRETARIA')
      .every(check => check.EstadoActual.EstadoCodigo === 'PS_APROBADO');
  }

  puedeGuardarDecision(): boolean {
    return !!this.estadoDecision && this.puedeDecidir(this.estadoDecision) &&
      (!['PS_PENDIENTE', 'PS_DESAPROBADO'].includes(this.estadoDecision) || !!this.justificacion.trim());
  }

  async guardarDecision(): Promise<void> {
    const solicitud = this.solicitudDecision;
    const estado = this.estadoDecision;
    if (!solicitud || !this.tipo || !estado || this.guardando || !this.puedeDecidir(estado, solicitud)) return;
    if ((estado === 'PS_PENDIENTE' || estado === 'PS_DESAPROBADO') && !this.justificacion.trim()) {
      this.errorDecision = this.tr('errores.justificacion');
      return;
    }
    this.guardando = true;
    this.errorDecision = '';
    this.alertas.showLoading(this.tr('mensajes.guardando'));
    try {
      const actualizada = await firstValueFrom(this.servicio.decidir(solicitud.Solicitud.Id, this.tipo, estado, this.justificacion, this.perfil));
      this.solicitudes = this.solicitudes.map(item => item.Solicitud.Id === actualizada.Solicitud.Id ? actualizada : item);
      if (this.pagina) this.pagina = { ...this.pagina, Solicitudes: this.solicitudes };
      if (this.seleccionada?.Solicitud.Id === actualizada.Solicitud.Id) this.seleccionada = actualizada;
      this.alertas.closeLoading();
      this.alertas.showSuccessAlert(this.tr('mensajes.guardada'));
      this.solicitudDecision = null;
      this.estadoDecision = '';
      this.justificacion = '';
      this.errorDecision = '';
    } catch (error) {
      this.alertas.closeLoading();
      this.errorDecision = mensajeErrorBorrador(error, this.tr('errores.guardar'));
      this.alertas.showErrorAlert(this.errorDecision);
    } finally {
      this.guardando = false;
    }
  }

  async verSoporte(tipoSoporte: TipoSoporteGrado): Promise<void> {
    if (!this.seleccionada || !this.tipo || this.cargando) return;
    this.cargando = true;
    this.error = '';
    try {
      const archivo = await firstValueFrom(this.servicio.archivo(this.seleccionada.Solicitud.Id, this.tipo, tipoSoporte, this.perfil));
      this.liberarPDF();
      this.urlPDF = URL.createObjectURL(archivo.blob);
      window.open(this.urlPDF, '_blank', 'noopener,noreferrer');
    } catch (error) {
      this.error = mensajeErrorBorrador(error, this.tr('errores.soporte'));
    } finally {
      this.cargando = false;
    }
  }

  private liberarPDF(): void {
    if (this.urlPDF) URL.revokeObjectURL(this.urlPDF);
    this.urlPDF = '';
  }

  private traducirPaginador(): void {
    if (!this.paginadorIntl) return;
    this.paginadorIntl.itemsPerPageLabel = this.tr('paginacion.por_pagina');
    this.paginadorIntl.nextPageLabel = this.tr('paginacion.siguiente');
    this.paginadorIntl.previousPageLabel = this.tr('paginacion.anterior');
    this.paginadorIntl.firstPageLabel = this.tr('paginacion.primera');
    this.paginadorIntl.lastPageLabel = this.tr('paginacion.ultima');
    this.paginadorIntl.changes.next();
  }

  tr(clave: string): string { return this.translate.instant(`PAZ_SALVOS_GRADO.${clave}`); }
}
