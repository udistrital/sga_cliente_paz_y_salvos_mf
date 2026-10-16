import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Optional, Output, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { TipoSoporteGrado, fechaGradoPersistida } from '../../services/inscripcion-grado.service';
import { PermisosService } from '../../services/permisos.service';
import { VersionGradoDetalle, VersionGradoResumen, VersionesGradoService, VistaVersionGrado } from '../../services/versiones-grado.service';

@Component({
  selector: 'app-versiones-grado',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, MatButtonModule, MatCardModule, MatDialogModule, MatExpansionModule,
    MatFormFieldModule, MatIconModule, MatInputModule, MatPaginatorModule, MatProgressBarModule, MatProgressSpinnerModule],
  providers: [MatPaginatorIntl],
  templateUrl: './versiones-grado.component.html',
  styleUrls: ['./versiones-grado.component.scss']
})
export class VersionesGradoComponent implements OnChanges, OnDestroy {
  @Input() solicitudId: number | null = null;
  @Input() versionActual: number | null | undefined = null;
  @Input() vista: VistaVersionGrado = 'estudiante';
  @Input() claveEstado = '';
  @Output() seleccionHistorica = new EventEmitter<boolean>();
  @ViewChild('visorPDF', { static: true }) visorPDF!: TemplateRef<unknown>;

  versiones: VersionGradoResumen[] = [];
  filtroVersion = '';
  pagina = 0;
  readonly tamanoPagina = 5;
  seleccionada: VersionGradoDetalle | null = null;
  versionSeleccionada: number | null = null;
  cargando = false;
  cargandoDetalle = false;
  error = '';
  private turno = 0;
  private urlPDF = '';
  private dialogo?: MatDialogRef<unknown>;
  private cambioSesion?: Subscription;
  private cambioPermisos?: Subscription;
  private cambioIdioma?: Subscription;
  private puedeConsultarExpediente: boolean;

  get versionesFiltradas(): VersionGradoResumen[] {
    const filtro = this.filtroVersion.trim();
    if (!filtro) return this.versiones;
    const numero = Number(filtro);
    return Number.isSafeInteger(numero) && numero > 0 ? this.versiones.filter(version => version.Version === numero) : [];
  }

  get versionesPagina(): VersionGradoResumen[] {
    const inicio = this.pagina * this.tamanoPagina;
    return this.versionesFiltradas.slice(inicio, inicio + this.tamanoPagina);
  }

  readonly campos: Array<{ clave: string; etiqueta: string }> = [
    { clave: 'trabajoGrado', etiqueta: 'trabajo_grado' },
    { clave: 'director1', etiqueta: 'director_uno' },
    { clave: 'director2', etiqueta: 'director_dos' },
    { clave: 'modalidad', etiqueta: 'modalidad' },
    { clave: 'lugarExpedicionDocumento', etiqueta: 'lugar_expedicion' },
    { clave: 'numeroActaSustentacion', etiqueta: 'numero_acta' },
    { clave: 'numeroRegistroSnp', etiqueta: 'numero_snp' }
  ];

  readonly camposLaborales: Array<{ clave: string; etiqueta: string }> = [
    { clave: 'empresa', etiqueta: 'empresa' },
    { clave: 'direccionEmpresa', etiqueta: 'direccion_empresa' },
    { clave: 'telefonoEmpresa', etiqueta: 'telefono_empresa' }
  ];

  get trabajaActualmente(): boolean {
    return this.seleccionada?.Formulario.Contenido?.['trabajaActualmente'] === true;
  }

  get tieneSegundoDirector(): boolean {
    const valor = this.seleccionada?.Formulario.Contenido?.['director2'];
    return typeof valor === 'string' && !!valor.trim();
  }

  constructor(private servicio: VersionesGradoService, public permisos: PermisosService, private translate: TranslateService,
    private dialog: MatDialog, private sanitizer: DomSanitizer,
    @Optional() private paginadorIntl?: MatPaginatorIntl) {
    this.puedeConsultarExpediente = permisos.permite('grado_consultar_expediente');
    this.cambioSesion = permisos.sesionCambiada$?.subscribe(() => this.ngOnChanges());
    this.cambioPermisos = permisos.cambios$?.subscribe(() => {
      const puedeConsultar = permisos.permite('grado_consultar_expediente');
      if (puedeConsultar !== this.puedeConsultarExpediente) {
        this.puedeConsultarExpediente = puedeConsultar;
        this.ngOnChanges();
      } else if (!puedeConsultar || !permisos.permite('grado_ver_soporte')) this.liberarPDF();
    });
    this.cambioIdioma = translate.onLangChange?.subscribe(() => this.traducirPaginador());
    this.traducirPaginador();
  }

  ngOnChanges(): void {
    const turno = ++this.turno;
    if (this.versionSeleccionada) this.seleccionHistorica.emit(false);
    this.versiones = [];
    this.filtroVersion = '';
    this.pagina = 0;
    this.seleccionada = null;
    this.versionSeleccionada = null;
    this.cargando = false;
    this.cargandoDetalle = false;
    this.error = '';
    this.liberarPDF();
    if (!this.solicitudId || !this.permisos.permite('grado_consultar_expediente')) return;
    void this.cargarVersiones(turno, this.solicitudId, this.vista);
  }

  ngOnDestroy(): void {
    this.turno++;
    if (this.versionSeleccionada) this.seleccionHistorica.emit(false);
    this.cambioSesion?.unsubscribe();
    this.cambioPermisos?.unsubscribe();
    this.cambioIdioma?.unsubscribe();
    this.liberarPDF();
  }

  cambiarPagina(evento: PageEvent): void {
    this.pagina = evento.pageIndex;
    if (this.versionSeleccionada) void this.abrirVersion(null);
  }

  cambiarFiltroVersion(valor: string | number | null): void {
    this.filtroVersion = valor == null ? '' : String(valor);
    this.pagina = 0;
    if (this.versionSeleccionada) void this.abrirVersion(null);
  }

  private traducirPaginador(): void {
    if (!this.paginadorIntl) return;
    this.paginadorIntl.nextPageLabel = this.translate.instant('VERSIONES_GRADO.paginacion.siguiente');
    this.paginadorIntl.previousPageLabel = this.translate.instant('VERSIONES_GRADO.paginacion.anterior');
    this.paginadorIntl.firstPageLabel = this.translate.instant('VERSIONES_GRADO.paginacion.primera');
    this.paginadorIntl.lastPageLabel = this.translate.instant('VERSIONES_GRADO.paginacion.ultima');
    this.paginadorIntl.getRangeLabel = (pagina, tamano, total) => this.translate.instant('VERSIONES_GRADO.paginacion.rango', {
      inicio: total ? pagina * tamano + 1 : 0, fin: Math.min((pagina + 1) * tamano, total), total
    });
    this.paginadorIntl.changes.next();
  }

  private async cargarVersiones(turno: number, id: number, vista: VistaVersionGrado): Promise<void> {
    this.cargando = true;
    try {
      const versiones = await firstValueFrom(this.servicio.listar(id, vista));
      if (turno === this.turno) this.versiones = versiones
        .filter(version => version.Version !== this.versionActual)
        .sort((a, b) => b.Version - a.Version);
    } catch {
      if (turno === this.turno) this.error = this.translate.instant('VERSIONES_GRADO.error_listar');
    } finally {
      if (turno === this.turno) this.cargando = false;
    }
  }

  async abrirVersion(version: number | null): Promise<void> {
    if (version && this.versionSeleccionada === version && (this.seleccionada || this.cargandoDetalle)) return;
    const turno = ++this.turno;
    this.versionSeleccionada = version;
    this.seleccionada = null;
    this.cargando = false;
    this.cargandoDetalle = !!version;
    this.error = '';
    this.liberarPDF();
    if (!version || !this.solicitudId || !this.versiones.some(v => v.Version === version) ||
      !this.permisos.permite('grado_consultar_expediente')) {
      this.cargandoDetalle = false;
      this.seleccionHistorica.emit(false);
      return;
    }
    const id = this.solicitudId;
    const vista = this.vista;
    this.seleccionHistorica.emit(true);
    this.cargando = true;
    try {
      const detalle = await firstValueFrom(this.servicio.consultar(id, version, vista));
      if (turno === this.turno) this.seleccionada = detalle;
    } catch {
      if (turno === this.turno) {
        this.versionSeleccionada = null;
        this.seleccionHistorica.emit(false);
        this.error = this.translate.instant('VERSIONES_GRADO.error_detalle');
      }
    } finally {
      if (turno === this.turno) {
        this.cargando = false;
        this.cargandoDetalle = false;
      }
    }
  }

  cerrarVersion(version: number): void {
    if (this.versionSeleccionada === version) void this.abrirVersion(null);
  }

  valor(campo: string): string {
    if (this.vista === 'secretaria') {
      const referencia = campo === 'director1' ? this.seleccionada?.Referencias?.Director1
        : campo === 'director2' ? this.seleccionada?.Referencias?.Director2
          : campo === 'modalidad' ? this.seleccionada?.Referencias?.Modalidad : null;
      if (referencia !== null) return referencia || this.translate.instant('VERSIONES_GRADO.referencia_no_disponible');
    }
    const valor = this.seleccionada?.Formulario.Contenido?.[campo];
    if (typeof valor === 'boolean') return this.translate.instant(valor ? 'VERSIONES_GRADO.si' : 'VERSIONES_GRADO.no');
    if (typeof valor === 'string' || typeof valor === 'number') return String(valor).trim() || this.translate.instant('VERSIONES_GRADO.sin_dato');
    return this.translate.instant('VERSIONES_GRADO.sin_dato');
  }

  fecha(valor: string | null | undefined): string {
    const fecha = fechaGradoPersistida(valor);
    if (fecha === null) return this.translate.instant('VERSIONES_GRADO.sin_dato');
    return new Intl.DateTimeFormat(this.translate.currentLang === 'en' ? 'en-US' : 'es-CO', {
      timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(fecha);
  }

  async abrirPDF(tipo: TipoSoporteGrado): Promise<void> {
    if (!this.solicitudId || !this.versionSeleccionada || !this.seleccionada || this.cargando ||
      !this.permisos.permite('grado_ver_soporte') || !this.permisos.permite('grado_consultar_expediente') ||
      !this.seleccionada.Soportes.some(s => s.TipoSoporte === tipo)) return;
    const turno = this.turno;
    this.cargando = true;
    this.error = '';
    try {
      const archivo = await firstValueFrom(this.servicio.archivo(this.solicitudId, this.versionSeleccionada, tipo, this.vista));
      if (turno !== this.turno || !this.permisos.permite('grado_ver_soporte') ||
        !this.permisos.permite('grado_consultar_expediente')) return;
      this.liberarPDF();
      const url = URL.createObjectURL(archivo.blob);
      this.urlPDF = url;
      this.dialogo = this.dialog.open(this.visorPDF, { width: '95vw', maxWidth: '1100px', maxHeight: '95vh',
        ariaLabel: this.translate.instant('VERSIONES_GRADO.vista_previa'),
        data: { nombre: archivo.nombre, url: this.sanitizer.bypassSecurityTrustResourceUrl(url), enlace: url } });
      this.dialogo.afterClosed().subscribe(() => {
        if (this.urlPDF === url) { URL.revokeObjectURL(url); this.urlPDF = ''; this.dialogo = undefined; }
      });
    } catch {
      if (turno === this.turno) {
        this.liberarPDF();
        this.error = this.translate.instant('VERSIONES_GRADO.error_pdf');
      }
    } finally {
      if (turno === this.turno) this.cargando = false;
    }
  }

  private liberarPDF(): void {
    this.dialogo?.close();
    this.dialogo = undefined;
    if (this.urlPDF) URL.revokeObjectURL(this.urlPDF);
    this.urlPDF = '';
  }
}
