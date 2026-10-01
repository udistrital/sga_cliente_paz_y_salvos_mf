import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription, firstValueFrom, forkJoin, defer, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { UserService } from '../../services/user.service';
import { SoportesGradoComponent } from './soportes-grado.component';
import { PermisosService } from '../../services/permisos.service';
import { OpcionDirective } from '../../directives/opcion.directive';
import { AlertService } from '../../services/alert.service';
import { BorradorGrado, DatosBasicosGrado, DirectorGrado, DisponibilidadGrado, EventoGrado, InscripcionGradoService, ModalidadGrado, PeriodoGrado, ProgramaGrado, fechaGrado, mensajeErrorBorrador } from '../../services/inscripcion-grado.service';

@Component({
  selector: 'app-inscripcion-grado',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatSelectModule, MatProgressBarModule, MatInputModule, MatAutocompleteModule, SoportesGradoComponent, OpcionDirective],
  templateUrl: './inscripcion-grado.component.html',
  styleUrls: ['./inscripcion-grado.component.scss']
})
export class InscripcionGradoComponent implements OnInit, OnDestroy {
  programas: ProgramaGrado[] = [];
  programasHabilitados: ProgramaGrado[] = [];
  private disponibilidades = new Map<number, DisponibilidadGrado>();
  periodos: PeriodoGrado[] = [];
  programaId: number | null = null;
  periodoId: number | null = null;
  disponibilidad: DisponibilidadGrado | null = null;
  borrador: BorradorGrado | null = null;
  datosBasicos: DatosBasicosGrado | null = null;
  cargandoDatosBasicos = false;
  errorDatosBasicos = '';
  private terceroId: number | null = null;
  trabajoGrado = '';
  lugarExpedicionDocumento = '';
  numeroActaSustentacion = '';
  numeroRegistroSnp = '';
  trabajaActualmente: boolean | null = null;
  empresa = '';
  direccionEmpresa = '';
  telefonoEmpresa = '';
  directores: DirectorGrado[] = [];
  modalidades: ModalidadGrado[] = [];
  director1: string | null = null;
  director2: string | null = null;
  modalidad: number | null = null;
  busquedaDirector1: DirectorGrado | string | null = null;
  busquedaDirector2: DirectorGrado | string | null = null;
  opcionesDirector1: DirectorGrado[] = [];
  opcionesDirector2: DirectorGrado[] = [];
  cargandoCatalogos = false;
  errorCatalogos = '';
  cargandoBorrador = false;
  guardandoBorrador = false;
  guardandoSoporte = false;
  radicando = false;
  borradorConsultado = false;
  errorBorrador = '';
  mensajeBorrador = '';
  cargando = false;
  consultando = false;
  consultado = false;
  error = '';
  errorConsulta = '';
  private destruido = false;
  private inicial?: Subscription;
  private consulta?: Subscription;
  private consultaBorrador?: Subscription;
  private consultaFechasBorrador?: Subscription;
  private guardarActual?: Subscription;
  private consultaDatosBasicos?: Subscription;
  private consultaCatalogos?: Subscription;

  private cambioSesion?: Subscription;
  private cargaVersion = 0;
  private confirmandoBorrador = false;
  confirmandoDescarte = false;
  private contenidoPersistido = '';
  constructor(private servicio: InscripcionGradoService, private usuario: UserService, public permisos: PermisosService,
    private alertas: AlertService, private translate: TranslateService) {}

  private tr(key: string, params?: Record<string, string | number>): string {
    return this.translate.instant(`INSCRIPCION_GRADO.${key}`, params);
  }
  ngOnInit(): void {
    this.cambioSesion = this.permisos.sesionCambiada$.subscribe(() => {
      if (this.guardandoBorrador || this.guardandoSoporte || this.radicando) this.alertas.closeLoading();
      this.guardarActual?.unsubscribe();
      this.guardandoBorrador = this.guardandoSoporte = false;
      void this.cargar();
    });
    void this.cargar();
  }
  ngOnDestroy(): void {
    this.destruido = true;
    if (this.guardandoBorrador || this.guardandoSoporte || this.radicando) this.alertas.closeLoading();
    this.cambioSesion?.unsubscribe();
    this.inicial?.unsubscribe();
    this.consulta?.unsubscribe();
    this.consultaBorrador?.unsubscribe();
    this.consultaFechasBorrador?.unsubscribe();
    this.guardarActual?.unsubscribe();
    this.consultaDatosBasicos?.unsubscribe();
    this.consultaCatalogos?.unsubscribe();
  }

  async cargar(): Promise<void> {
    const turno = ++this.cargaVersion;
    this.inicial?.unsubscribe();
    this.error = '';
    this.programas = [];
    this.periodos = [];
    this.terceroId = null;
    this.consultaDatosBasicos?.unsubscribe();
    this.datosBasicos = null;
    this.cargandoDatosBasicos = false;
    this.errorDatosBasicos = '';
    this.consultaCatalogos?.unsubscribe();
    this.directores = [];
    this.modalidades = [];
    this.cargandoCatalogos = false;
    this.errorCatalogos = '';
    this.programaId = this.periodoId = null;
    this.cambiarPeriodo();
    this.cargando = true;
    try {
      await this.permisos.cargar();
      if (turno !== this.cargaVersion || this.destruido) return;
      if (!this.permisos.permite('inscripciones_grado', 'Menú') || !this.permisos.permite('grado_reintentar_carga')) {
        throw new Error(this.tr('errores.sin_permiso_formulario'));
      }
      const terceroId = await this.usuario.getPersonaId();
      if (turno !== this.cargaVersion || this.destruido) return;
      this.terceroId = terceroId;
      this.cargarDatosBasicos();
      this.cargarCatalogos();
      this.inicial = forkJoin({ programas: this.servicio.programas(terceroId), periodos: this.servicio.periodos() }).subscribe({
        next: datos => {
          if (turno !== this.cargaVersion || this.destruido) return;
          this.programas = datos.programas;
          this.periodos = datos.periodos;
          this.cargando = false;
        },
        error: () => {
          this.error = this.tr('errores.carga_inicial');
          this.cargando = false;
        }
      });
    } catch (error) {
      if (turno !== this.cargaVersion || this.destruido) return;
      this.error = error instanceof Error ? error.message : this.tr('errores.sesion');
      this.cargando = false;
    }
  }

  cargarDatosBasicos(): void {
    this.consultaDatosBasicos?.unsubscribe();
    this.datosBasicos = null;
    this.errorDatosBasicos = '';
    if (!this.terceroId) return;
    if (!this.permisos.permite('grado_consultar_datos_basicos')) {
      this.cargandoDatosBasicos = false;
      this.errorDatosBasicos = this.tr('errores.sin_permiso_datos');
      return;
    }
    this.cargandoDatosBasicos = true;
    this.consultaDatosBasicos = this.servicio.datosBasicos(this.terceroId).subscribe({
      next: datos => {
        this.datosBasicos = datos;
        this.cargandoDatosBasicos = false;
      },
      error: () => {
        this.cargandoDatosBasicos = false;
        this.errorDatosBasicos = this.tr('errores.datos_basicos');
      }
    });
  }

  get nombreEstudiante(): string {
    const datos = this.datosBasicos;
    if (!datos) return '';
    return [datos.PrimerNombre, datos.SegundoNombre, datos.PrimerApellido, datos.SegundoApellido]
      .filter(nombre => !!nombre?.trim()).join(' ').trim() || datos.NombreCompleto?.trim() || this.tr('vista.no_registrado');
  }

  get programaSeleccionadoNombre(): string {
    return this.programas.find(p => p.Id === this.programaId)?.Nombre || this.tr('vista.programa_no_disponible');
  }

  cargarCatalogos(): void {
    this.consultaCatalogos?.unsubscribe();
    if (!this.permisos.permite('grado_consultar_catalogos')) {
      this.cargandoCatalogos = false;
      this.directores = [];
      this.modalidades = [];
      this.errorCatalogos = this.tr('errores.sin_permiso_catalogos');
      return;
    }
    this.cargandoCatalogos = true;
    this.errorCatalogos = '';
    this.consultaCatalogos = forkJoin({ directores: this.servicio.directores(), modalidades: this.servicio.modalidades() }).subscribe({
      next: datos => {
        this.directores = datos.directores;
        this.modalidades = datos.modalidades;
        this.cargandoCatalogos = false;
        this.restaurarDirectores();
      },
      error: error => {
        this.directores = [];
        this.modalidades = [];
        this.opcionesDirector1 = [];
        this.opcionesDirector2 = [];
        this.cargandoCatalogos = false;
        const status = Number(error?.error?.Status ?? error?.Status ?? error?.status);
        this.errorCatalogos = status === 404
          ? this.tr('errores.catalogos_rutas')
          : this.tr('errores.catalogos');
      }
    });
  }

  mostrarDirector = (director: DirectorGrado | string | null): string => {
    if (typeof director === 'string') return director;
    return director ? `${director.DIR_NOMBRE} ${director.DIR_APELLIDO}` : '';
  };

  private filtrarDirectores(valor: DirectorGrado | string | null, segundo: boolean): DirectorGrado[] {
    const texto = typeof valor === 'string' ? valor : '';
    const buscar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const termino = buscar(texto);
    return this.directores.filter(d => (!segundo || d.DIR_NRO_IDEN !== this.director1) &&
      (!termino || buscar(`${d.DIR_NOMBRE} ${d.DIR_APELLIDO}`).includes(termino))).slice(0, 40);
  }

  buscarDirector(segundo: boolean, valor: DirectorGrado | string | null): void {
    if (typeof valor === 'string') {
      if (segundo) this.director2 = null;
      else this.director1 = null;
    }
    if (segundo) this.opcionesDirector2 = this.filtrarDirectores(valor, true);
    else {
      this.opcionesDirector1 = this.filtrarDirectores(valor, false);
      this.opcionesDirector2 = this.filtrarDirectores(this.busquedaDirector2, true);
    }
  }

  seleccionarDirector(segundo: boolean, director: DirectorGrado): void {
    if (segundo) this.director2 = director.DIR_NRO_IDEN;
    else this.director1 = director.DIR_NRO_IDEN;
    this.errorBorrador = '';
    this.opcionesDirector2 = this.filtrarDirectores(this.busquedaDirector2, true);
  }

  private restaurarDirectores(): void {
    const existente = (id: string | null) => this.directores.find(d => d.DIR_NRO_IDEN === id) ||
      (id ? this.tr('vista.director_no_disponible') : null);
    this.busquedaDirector1 = existente(this.director1);
    this.busquedaDirector2 = existente(this.director2);
    this.opcionesDirector1 = this.filtrarDirectores(null, false);
    this.opcionesDirector2 = this.filtrarDirectores(null, true);
  }

  get directoresRepetidos(): boolean {
    return !!this.director1 && this.director1 === this.director2;
  }

  private restaurarContenido(contenido: { [campo: string]: unknown }): void {
    this.trabajoGrado = typeof contenido['trabajoGrado'] === 'string' ? contenido['trabajoGrado'] as string : '';
    this.lugarExpedicionDocumento = typeof contenido['lugarExpedicionDocumento'] === 'string' ? contenido['lugarExpedicionDocumento'] as string : '';
    this.numeroActaSustentacion = typeof contenido['numeroActaSustentacion'] === 'string' ? contenido['numeroActaSustentacion'] as string : '';
    this.numeroRegistroSnp = typeof contenido['numeroRegistroSnp'] === 'string' ? contenido['numeroRegistroSnp'] as string : '';
    this.trabajaActualmente = typeof contenido['trabajaActualmente'] === 'boolean' ? contenido['trabajaActualmente'] as boolean : null;
    this.empresa = this.trabajaActualmente && typeof contenido['empresa'] === 'string' ? contenido['empresa'] as string : '';
    this.direccionEmpresa = this.trabajaActualmente && typeof contenido['direccionEmpresa'] === 'string' ? contenido['direccionEmpresa'] as string : '';
    this.telefonoEmpresa = this.trabajaActualmente && typeof contenido['telefonoEmpresa'] === 'string' ? contenido['telefonoEmpresa'] as string : '';
    this.director1 = typeof contenido['director1'] === 'string' ? contenido['director1'] as string : null;
    this.director2 = typeof contenido['director2'] === 'string' ? contenido['director2'] as string : null;
    this.modalidad = typeof contenido['modalidad'] === 'number' && Number.isSafeInteger(contenido['modalidad'])
      ? contenido['modalidad'] as number : null;
    this.restaurarDirectores();
    this.contenidoPersistido = JSON.stringify(this.contenidoFormulario());
  }

  private contenidoFormulario(): { [campo: string]: unknown } {
    const contenido: { [campo: string]: unknown } = { ...(this.borrador?.Formulario?.Contenido || {}), trabajoGrado: this.trabajoGrado };
    const asignarTexto = (campo: string, valor: string, mayusculas = false): void => {
      const normalizado = (mayusculas ? valor.toUpperCase() : valor).trim();
      if (normalizado) contenido[campo] = normalizado; else delete contenido[campo];
    };
    asignarTexto('lugarExpedicionDocumento', this.lugarExpedicionDocumento);
    asignarTexto('numeroActaSustentacion', this.numeroActaSustentacion);
    asignarTexto('numeroRegistroSnp', this.numeroRegistroSnp, true);
    if (this.trabajaActualmente === null) delete contenido['trabajaActualmente'];
    else contenido['trabajaActualmente'] = this.trabajaActualmente;
    if (this.trabajaActualmente) {
      asignarTexto('empresa', this.empresa);
      asignarTexto('direccionEmpresa', this.direccionEmpresa);
      asignarTexto('telefonoEmpresa', this.telefonoEmpresa);
    } else {
      delete contenido['empresa'];
      delete contenido['direccionEmpresa'];
      delete contenido['telefonoEmpresa'];
    }
    if (this.director1) contenido['director1'] = this.director1; else delete contenido['director1'];
    if (this.director2) contenido['director2'] = this.director2; else delete contenido['director2'];
    if (this.modalidad) contenido['modalidad'] = this.modalidad; else delete contenido['modalidad'];
    return contenido;
  }

  cambiarSituacionLaboral(valor: boolean): void {
    this.trabajaActualmente = valor;
    if (!valor) {
      this.empresa = '';
      this.direccionEmpresa = '';
      this.telefonoEmpresa = '';
    }
  }

  private limpiarContenidoFormulario(): void {
    this.trabajoGrado = this.lugarExpedicionDocumento = this.numeroActaSustentacion = this.numeroRegistroSnp = '';
    this.trabajaActualmente = null;
    this.empresa = this.direccionEmpresa = this.telefonoEmpresa = '';
    this.director1 = this.director2 = null;
    this.modalidad = null;
    this.restaurarDirectores();
  }

  get tieneCambiosSinGuardar(): boolean {
    return !!this.programaId && this.borradorConsultado && this.contenidoPersistido !== JSON.stringify(this.contenidoFormulario());
  }

  private async confirmarDescarte(textKey: string, textParams: Record<string, string | number> = {}): Promise<boolean> {
    if (!this.tieneCambiosSinGuardar) return true;
    if (this.confirmandoDescarte) return false;
    this.confirmandoDescarte = true;
    try {
      const resultado = await this.alertas.showConfirmAlert(textKey, {
        titleKey: 'INSCRIPCION_GRADO.confirmaciones.descartar_titulo',
        confirmButtonKey: 'INSCRIPCION_GRADO.confirmaciones.descartar',
        textParams
      });
      return resultado.isConfirmed === true;
    } finally {
      this.confirmandoDescarte = false;
    }
  }

  async seleccionarPeriodo(periodoId: number): Promise<void> {
    if (periodoId === this.periodoId || this.guardandoBorrador || this.guardandoSoporte || this.radicando) return;
    const anterior = this.periodos.find(p => p.Id === this.periodoId)?.Nombre || '';
    const siguiente = this.periodos.find(p => p.Id === periodoId)?.Nombre || String(periodoId);
    if (!await this.confirmarDescarte('INSCRIPCION_GRADO.confirmaciones.descartar_periodo_texto', { anterior, siguiente })) return;
    this.periodoId = periodoId;
    this.cambiarPeriodo();
  }

  async seleccionarPrograma(programaId: number): Promise<void> {
    if (programaId === this.programaId || this.guardandoBorrador || this.guardandoSoporte || this.radicando) return;
    const anterior = this.programaSeleccionadoNombre;
    const siguiente = this.programas.find(p => p.Id === programaId)?.Nombre || String(programaId);
    if (!await this.confirmarDescarte('INSCRIPCION_GRADO.confirmaciones.descartar_programa_texto', { anterior, siguiente })) return;
    this.programaId = programaId;
    this.cambiarPrograma();
  }

  async recargarBorrador(): Promise<void> {
    if (!await this.confirmarDescarte('INSCRIPCION_GRADO.confirmaciones.descartar_recarga_texto')) return;
    this.cambiarPrograma();
  }

  async puedeSalir(): Promise<boolean> {
    return this.confirmarDescarte('INSCRIPCION_GRADO.confirmaciones.descartar_salida_texto');
  }

  @HostListener('window:beforeunload', ['$event'])
  advertirSalidaNavegador(event: BeforeUnloadEvent): void {
    if (!this.tieneCambiosSinGuardar) return;
    event.preventDefault();
    event.returnValue = '';
  }

  cambiarPeriodo(): void {
    if (this.guardandoBorrador || this.guardandoSoporte || this.radicando) return;
    this.consulta?.unsubscribe();
    this.consultaBorrador?.unsubscribe();
    this.consultaFechasBorrador?.unsubscribe();
    this.guardarActual?.unsubscribe();
    this.borrador = null;
    this.limpiarContenidoFormulario();
    this.errorBorrador = this.mensajeBorrador = '';
    this.cargandoBorrador = this.guardandoBorrador = false;
    this.borradorConsultado = false;
    this.programaId = null;
    this.programasHabilitados = [];
    this.disponibilidades.clear();
    this.disponibilidad = null;
    this.errorConsulta = '';
    this.consultado = false;
    this.consultando = false;
    const periodoId = this.periodoId;
    if (!periodoId || !this.programas.length) return;
    if (!this.permisos.permite('grado_consultar_disponibilidad')) {
      this.programasHabilitados = [...this.programas];
      this.consultado = true;
      this.errorConsulta = this.tr('errores.sin_permiso_fechas');
      return;
    }
    this.consultando = true;
    try {
      this.consulta = forkJoin(this.programas.map(programa =>
        defer(() => this.servicio.disponibilidad(programa, periodoId)).pipe(
          map(datos => ({ programa, datos, fallo: false })),
          catchError(() => of({ programa, datos: null, fallo: true }))
        )
      )).subscribe({
        next: resultados => {
          // La consulta del borrador depende de la identidad, no de Calendario.
          // Así puede recuperarse aunque un programa no tenga fechas consultables.
          this.programasHabilitados = [...this.programas];
          for (const resultado of resultados) {
            if (resultado.datos) this.disponibilidades.set(resultado.programa.Id, resultado.datos);
          }
          const fallidos = resultados.filter(r => r.fallo).map(r => r.programa.Nombre);
          if (fallidos.length) {
            this.errorConsulta = this.tr('errores.programas', { programas: fallidos.join(', ') });
          }
          this.consultando = false;
          this.consultado = true;
        },
        error: error => {
          this.consultando = false;
          this.errorConsulta = error instanceof Error ? error.message : this.tr('errores.calendario');
        }
      });
    } catch (error) {
      this.consultando = false;
      this.errorConsulta = error instanceof Error ? error.message : this.tr('errores.calendario_simple');
    }
  }

  cambiarPrograma(): void {
    if (this.guardandoBorrador || this.guardandoSoporte || this.radicando) return;
    this.consultaBorrador?.unsubscribe();
    this.consultaFechasBorrador?.unsubscribe();
    this.guardarActual?.unsubscribe();
    this.borrador = null;
    this.limpiarContenidoFormulario();
    this.errorBorrador = this.mensajeBorrador = '';
    this.borradorConsultado = false;
    this.cargandoBorrador = false;
    this.disponibilidad = this.programaId === null ? null : this.disponibilidades.get(this.programaId) || null;
    if (this.periodoId && this.programaId) {
      if (!this.permisos.permite('grado_consultar_borrador')) {
        this.errorBorrador = this.tr('errores.sin_permiso_borrador');
        return;
      }
      this.cargandoBorrador = true;
      const programa = this.programas.find(p => p.Id === this.programaId);
      if (!programa) {
        this.cargandoBorrador = false;
        this.errorBorrador = this.tr('errores.programa_invalido');
        return;
      }
      this.consultaBorrador = this.servicio.consultarBorrador(this.periodoId, this.programaId).subscribe({
        next: borrador => {
          this.borrador = borrador;
          this.restaurarContenido(borrador?.Formulario?.Contenido || {});
          this.cargandoBorrador = false;
          this.borradorConsultado = true;
          if (!this.permisos.permite('grado_consultar_disponibilidad')) return;
          this.consultaFechasBorrador = this.servicio.disponibilidad(programa, this.periodoId!).subscribe({
            next: fechas => {
              if (this.programaId !== programa.Id || !fechas) return;
              this.disponibilidad = fechas;
              this.disponibilidades.set(programa.Id, fechas);
            },
            error: () => {
              if (this.programaId === programa.Id) this.errorConsulta = this.tr('errores.fechas_actuales');
            }
          });
        },
        error: error => {
          this.errorBorrador = mensajeErrorBorrador(error, this.tr('errores.consultar_borrador'));
          this.cargandoBorrador = false;
        }
      });
    }
  }

  async guardarBorrador(): Promise<void> {
    if (!this.programaId || !this.periodoId || !this.puedeGuardarBorrador) return;
    this.errorBorrador = this.mensajeBorrador = '';
    if (this.directoresRepetidos) {
      this.errorBorrador = this.tr('errores.directores_repetidos');
      return;
    }
    const contenido = this.contenidoFormulario();
    const contexto = {
      cargaVersion: this.cargaVersion,
      periodoId: this.periodoId,
      programaId: this.programaId,
      solicitudId: this.borrador?.Solicitud.Id || 0,
      formularioId: this.borrador?.Formulario.Id || 0,
      contenido: JSON.stringify(contenido)
    };
    this.confirmandoBorrador = true;
    let confirmado = false;
    try {
      const resultado = await this.alertas.showConfirmAlert(
        this.borrador ? 'INSCRIPCION_GRADO.confirmaciones.actualizar_borrador_texto' : 'INSCRIPCION_GRADO.confirmaciones.crear_borrador_texto',
        {
          titleKey: 'INSCRIPCION_GRADO.confirmaciones.guardar_borrador_titulo',
          confirmButtonKey: 'INSCRIPCION_GRADO.confirmaciones.guardar',
          textParams: {
            programa: this.programaSeleccionadoNombre,
            periodo: this.periodos.find(p => p.Id === this.periodoId)?.Nombre || String(this.periodoId)
          }
        }
      );
      confirmado = resultado.isConfirmed === true;
    } finally {
      this.confirmandoBorrador = false;
    }
    if (!confirmado || this.destruido || contexto.cargaVersion !== this.cargaVersion ||
      contexto.periodoId !== this.periodoId || contexto.programaId !== this.programaId ||
      contexto.solicitudId !== (this.borrador?.Solicitud.Id || 0) ||
      contexto.formularioId !== (this.borrador?.Formulario.Id || 0) || !this.puedeGuardarBorrador) return;
    const contenidoVigente = this.contenidoFormulario();
    if (contexto.contenido !== JSON.stringify(contenidoVigente)) return;
    this.guardandoBorrador = true;
    this.alertas.showLoading(this.tr('progreso.guardando_borrador'));
    const operacion = this.borrador
      ? this.servicio.guardarBorrador(this.borrador.Solicitud.Id, contenidoVigente)
      : this.servicio.crearBorrador(this.periodoId, this.programaId, contenidoVigente);
    this.guardarActual = operacion.subscribe({
      next: borrador => {
        this.borrador = borrador;
        this.restaurarContenido(borrador.Formulario.Contenido || {});
        this.guardandoBorrador = false;
        this.mensajeBorrador = this.tr('mensajes.borrador_guardado');
        this.alertas.showSuccessAlert(this.mensajeBorrador);
      },
      error: error => {
        this.guardandoBorrador = false;
        this.errorBorrador = mensajeErrorBorrador(error, this.tr('errores.guardar_borrador'));
        this.alertas.showErrorAlert(this.errorBorrador);
        if (Number(error?.error?.Status ?? error?.Status ?? error?.status) === 409) this.borradorConsultado = false;
      }
    });
  }

  private camposRadicacionCompletos(): boolean {
    const texto = (valor: string) => !!valor.trim();
    return texto(this.trabajoGrado) && texto(this.lugarExpedicionDocumento) && texto(this.numeroActaSustentacion) &&
      /^[A-Za-z0-9-]+$/.test(this.numeroRegistroSnp.trim()) && this.trabajaActualmente !== null &&
      !!this.director1 && this.directores.some(d => d.DIR_NRO_IDEN === this.director1) &&
      (!this.director2 || this.directores.some(d => d.DIR_NRO_IDEN === this.director2)) && !this.directoresRepetidos &&
      !!this.modalidad && this.modalidades.some(m => m.AMG_COD === this.modalidad) &&
      (!this.trabajaActualmente || (texto(this.empresa) && texto(this.direccionEmpresa) && texto(this.telefonoEmpresa)));
  }

  async radicar(): Promise<void> {
    if (!this.puedeRadicar || !this.borrador || !this.periodoId || !this.programaId) return;
    this.errorBorrador = this.mensajeBorrador = '';
    if (!this.camposRadicacionCompletos()) {
      this.errorBorrador = this.tr('errores.campos_radicacion');
      return;
    }
    const contexto = {
      cargaVersion: this.cargaVersion, periodoId: this.periodoId, programaId: this.programaId,
      solicitudId: this.borrador.Solicitud.Id, formularioId: this.borrador.Formulario.Id,
      contenido: JSON.stringify(this.contenidoFormulario())
    };
    this.radicando = true;
    let enviando = false;
    try {
      const soportes = await firstValueFrom(this.servicio.soportes(contexto.solicitudId, contexto.formularioId));
      if (soportes.length !== 4 || new Set(soportes.map(s => s.TipoSoporte)).size !== 4) {
        this.errorBorrador = this.tr('errores.soportes_radicacion');
        return;
      }
      const resultado = await this.alertas.showConfirmAlert('INSCRIPCION_GRADO.confirmaciones.radicar_texto', {
        titleKey: 'INSCRIPCION_GRADO.confirmaciones.radicar_titulo',
        confirmButtonKey: 'INSCRIPCION_GRADO.confirmaciones.radicar',
        textParams: { programa: this.programaSeleccionadoNombre, periodo: this.periodos.find(p => p.Id === this.periodoId)?.Nombre || String(this.periodoId) }
      });
      const vigente = this.borrador && !this.destruido && contexto.cargaVersion === this.cargaVersion &&
        contexto.periodoId === this.periodoId && contexto.programaId === this.programaId &&
        contexto.solicitudId === this.borrador.Solicitud.Id && contexto.formularioId === this.borrador.Formulario.Id &&
        contexto.contenido === JSON.stringify(this.contenidoFormulario()) && this.camposRadicacionCompletos() &&
        this.permisos.permite('inscripciones_grado', 'Menú') && this.permisos.permite('grado_radicar_inscripcion') &&
        !!this.disponibilidad && this.eventoEstaAbierto(this.disponibilidad.inscripcion) && this.eventoEstaAbierto(this.disponibilidad.aprobacion);
      if (resultado.isConfirmed !== true || !vigente) return;
      this.alertas.showLoading(this.tr('progreso.radicando'));
      enviando = true;
      const radicado = await firstValueFrom(this.servicio.radicar(contexto.solicitudId, contexto.formularioId, this.contenidoFormulario()));
      if (this.destruido || contexto.cargaVersion !== this.cargaVersion) return;
      this.borrador = radicado;
      this.restaurarContenido(radicado.Formulario.Contenido || {});
      this.mensajeBorrador = this.tr('mensajes.inscripcion_radicada');
      this.alertas.showSuccessAlert(this.mensajeBorrador);
    } catch (error) {
      if (!this.destruido) {
        this.errorBorrador = mensajeErrorBorrador(error, this.tr('errores.radicar'));
        if (enviando) this.alertas.showErrorAlert(this.errorBorrador);
      }
    } finally {
      this.radicando = false;
    }
  }

  get puedeGuardarBorrador(): boolean {
    if (!this.permisos.permite('inscripciones_grado', 'Menú') || !this.permisos.permite(this.borrador ? 'grado_actualizar_borrador' : 'grado_crear_borrador')) return false;
    if (!this.borradorConsultado || this.cargandoBorrador || this.confirmandoBorrador || this.guardandoBorrador || this.guardandoSoporte || this.radicando || !this.disponibilidad) return false;
    if (this.borrador?.Formulario.FechaRadicacion) return false;
    return this.eventoEstaAbierto(this.disponibilidad.aprobacion) &&
      (!!this.borrador || this.eventoEstaAbierto(this.disponibilidad.inscripcion));
  }

  get esRadicada(): boolean {
    return !!this.borrador?.Formulario.FechaRadicacion;
  }

  get puedeEditarFormulario(): boolean {
    return this.permisos.permite(this.borrador ? 'grado_actualizar_borrador' : 'grado_crear_borrador') &&
      !!this.programaId && !!this.periodoId && this.borradorConsultado && !this.cargandoBorrador &&
      !this.guardandoBorrador && !this.guardandoSoporte && !this.radicando && !this.borrador?.Formulario.FechaRadicacion;
  }

  get puedeModificarSoportes(): boolean {
    return this.permisos.permite('inscripciones_grado', 'Menú') && !!this.borrador && !this.borrador.Formulario.FechaRadicacion &&
      !this.cargandoBorrador && !this.guardandoBorrador && !this.radicando && !!this.disponibilidad &&
      this.eventoEstaAbierto(this.disponibilidad.aprobacion);
  }

  get puedeRadicar(): boolean {
    return this.permisos.permite('inscripciones_grado', 'Menú') && this.permisos.permite('grado_radicar_inscripcion') &&
      !!this.borrador && !this.borrador.Formulario.FechaRadicacion && !this.cargandoBorrador && !this.guardandoBorrador &&
      !this.guardandoSoporte && !this.radicando && !!this.disponibilidad && this.eventoEstaAbierto(this.disponibilidad.inscripcion) &&
      this.eventoEstaAbierto(this.disponibilidad.aprobacion);
  }

  estadoInscripcionPrograma(programaId: number): string {
    const evento = this.disponibilidades.get(programaId)?.inscripcion;
    return evento ? this.estado(evento) : this.tr('estados.sin_calendario');
  }

  estado(evento: EventoGrado): string {
    const ahora = Date.now();
    const inicio = fechaGrado(evento.FechaInicioEvento)!;
    const fin = fechaGrado(evento.FechaFinEvento)!;
    return ahora < inicio ? this.tr('estados.proxima_apertura') : ahora > fin ? this.tr('estados.cerrado') : this.tr('estados.abierto');
  }
  eventoEstaAbierto(evento: EventoGrado): boolean {
    const ahora = Date.now();
    return ahora >= fechaGrado(evento.FechaInicioEvento)! && ahora <= fechaGrado(evento.FechaFinEvento)!;
  }
  fecha(valor: string): string {
    const fecha = fechaGrado(valor);
    const locale = this.translate.currentLang === 'en' ? 'en-US' : 'es-CO';
    return fecha === null ? this.tr('estados.fecha_invalida') : new Intl.DateTimeFormat(locale, {
      timeZone: 'America/Bogota', dateStyle: 'long', timeStyle: 'short'
    }).format(fecha);
  }
}
