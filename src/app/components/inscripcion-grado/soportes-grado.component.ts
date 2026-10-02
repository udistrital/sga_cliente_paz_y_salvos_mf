import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, TemplateRef, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { BorradorGrado, InscripcionGradoService, SoporteGrado, TipoSoporteGrado, mensajeErrorBorrador, validarPDFGrado } from '../../services/inscripcion-grado.service';
import { PermisosService } from '../../services/permisos.service';
import { OpcionDirective } from '../../directives/opcion.directive';
import { AlertService } from '../../services/alert.service';

interface DocumentoFormulario {
  codigo: TipoSoporteGrado;
  tituloKey: string;
  descripcionKey: string;
  soporte: SoporteGrado | null;
  error: string;
  mensaje: string;
}

@Component({
  selector: 'app-soportes-grado', standalone: true,
  imports: [CommonModule, TranslateModule, MatCardModule, MatButtonModule, MatDialogModule, MatProgressBarModule, OpcionDirective],
  templateUrl: './soportes-grado.component.html', styleUrls: ['./soportes-grado.component.scss']
})
export class SoportesGradoComponent implements OnChanges, OnDestroy {
  @Input() borrador: BorradorGrado | null = null;
  @Input() habilitado = false;
  @Output() ocupado = new EventEmitter<boolean>();
  @ViewChild('visorPDF', { static: true }) visorPDF!: TemplateRef<unknown>;
  documentos: DocumentoFormulario[] = [
    { codigo: 'TSG_ACTA_SUST', tituloKey: 'INSCRIPCION_GRADO.soportes.acta_titulo', descripcionKey: 'INSCRIPCION_GRADO.soportes.acta_descripcion', soporte: null, error: '', mensaje: '' },
    { codigo: 'TSG_RESULTADO_SABER', tituloKey: 'INSCRIPCION_GRADO.soportes.saber_titulo', descripcionKey: 'INSCRIPCION_GRADO.soportes.saber_descripcion', soporte: null, error: '', mensaje: '' },
    { codigo: 'TSG_PAGO_DERECHOS', tituloKey: 'INSCRIPCION_GRADO.soportes.pago_titulo', descripcionKey: 'INSCRIPCION_GRADO.soportes.pago_descripcion', soporte: null, error: '', mensaje: '' },
    { codigo: 'TSG_TITULO_PREVIO', tituloKey: 'INSCRIPCION_GRADO.soportes.titulo_previo_titulo', descripcionKey: 'INSCRIPCION_GRADO.soportes.titulo_previo_descripcion', soporte: null, error: '', mensaje: '' }
  ];
  cargando = false;
  consultaCorrecta = false;
  errorConsulta = '';
  subiendo: TipoSoporteGrado | null = null;
  descargando: TipoSoporteGrado | null = null;
  private clave = '';
  private consulta?: Subscription;
  private carga?: Subscription;
  private descarga?: Subscription;
  private dialogo?: MatDialogRef<unknown>;
  private urlPDF?: string;
  private cambiosPermisos: Subscription;
  private destruido = false;

  constructor(private servicio: InscripcionGradoService, private dialog: MatDialog, private sanitizer: DomSanitizer,
    public permisos: PermisosService, private alertas: AlertService, private translate: TranslateService) {
    this.cambiosPermisos = permisos.cambios$.subscribe(() => {
      if (!permisos.permite('grado_ver_soporte') || !permisos.permite('grado_consultar_soportes')) {
        this.descarga?.unsubscribe();
        this.cerrarVisor();
      }
    });
  }

  ngOnChanges(): void {
    const clave = this.borrador ? `${this.borrador.Solicitud.Id}/${this.borrador.Formulario.Id}` : '';
    if (clave === this.clave) return;
    this.clave = clave;
    if (this.subiendo) this.alertas.closeLoading();
    this.consulta?.unsubscribe();
    this.carga?.unsubscribe();
    this.descarga?.unsubscribe();
    this.cerrarVisor();
    this.documentos.forEach(d => { d.soporte = null; d.error = d.mensaje = ''; });
    this.recargar();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    if (this.subiendo) this.alertas.closeLoading();
    this.cambiosPermisos.unsubscribe();
    this.consulta?.unsubscribe();
    this.carga?.unsubscribe();
    this.descarga?.unsubscribe();
    this.cerrarVisor();
  }

  get puedeCargar(): boolean {
    return this.permisos.permite('grado_consultar_soportes') && !!this.borrador && !this.borrador.Formulario.FechaRadicacion && this.habilitado && this.consultaCorrecta && !this.cargando && !this.subiendo && !this.descargando;
  }

  opcionCarga(doc: DocumentoFormulario): string {
    const sufijo: Record<TipoSoporteGrado, string> = {
      TSG_ACTA_SUST: 'acta',
      TSG_RESULTADO_SABER: 'snp',
      TSG_PAGO_DERECHOS: 'pago_derechos',
      TSG_TITULO_PREVIO: 'titulo_previo'
    };
    return `grado_${doc.soporte ? 'reemplazar' : 'cargar'}_${sufijo[doc.codigo]}`;
  }

  puedeCargarDocumento(doc: DocumentoFormulario): boolean { return this.puedeCargar && this.permisos.permite(this.opcionCarga(doc)); }

  recargar(): void {
    if (this.subiendo) return;
    this.consulta?.unsubscribe();
    this.consultaCorrecta = false;
    this.errorConsulta = '';
    this.cargando = false;
    if (!this.borrador) return;
    if (!this.permisos.permite('grado_consultar_soportes')) {
      this.errorConsulta = this.translate.instant('INSCRIPCION_GRADO.errores.sin_permiso_soportes');
      return;
    }
    this.cargando = true;
	this.consulta = this.servicio.soportes(this.borrador.Solicitud.Id, this.borrador.Solicitud.TerceroId, this.borrador.Formulario.Id).pipe(
      finalize(() => this.cargando = false)
    ).subscribe({
      next: soportes => {
        this.documentos.forEach(d => d.soporte = soportes.find(s => s.TipoSoporte === d.codigo) || null);
        this.consultaCorrecta = true;
      },
      error: e => this.errorConsulta = mensajeErrorBorrador(e, this.translate.instant('INSCRIPCION_GRADO.errores.consultar_soportes'))
    });
  }

  async subir(documento: DocumentoFormulario, input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.puedeCargarDocumento(documento) || !this.borrador) return;
    documento.error = documento.mensaje = '';
    const contexto = {
      solicitudId: this.borrador.Solicitud.Id,
      formularioId: this.borrador.Formulario.Id,
      soporteId: documento.soporte?.Id || 0,
      opcion: this.opcionCarga(documento)
    };
    this.subiendo = documento.codigo;
    this.ocupado.emit(true);
    try {
      await validarPDFGrado(file);
    } catch (error) {
      const clave = error instanceof Error && error.message.includes('5 MiB')
        ? 'INSCRIPCION_GRADO.errores.pdf_tamano' : 'INSCRIPCION_GRADO.errores.pdf_invalido';
      documento.error = this.translate.instant(clave);
      this.subiendo = null;
      this.ocupado.emit(false);
      return;
    }
    if (this.destruido || !this.borrador || this.borrador.Solicitud.Id !== contexto.solicitudId ||
      this.borrador.Formulario.Id !== contexto.formularioId || (documento.soporte?.Id || 0) !== contexto.soporteId ||
      !this.habilitado || !this.consultaCorrecta || this.cargando || this.descargando ||
      !this.permisos.permite('grado_consultar_soportes') || !this.permisos.permite(contexto.opcion)) {
      this.subiendo = null;
      this.ocupado.emit(false);
      return;
    }
    let confirmado = false;
    try {
      const resultado = await this.alertas.showConfirmAlert(
        documento.soporte ? 'INSCRIPCION_GRADO.confirmaciones.reemplazar_soporte_texto' : 'INSCRIPCION_GRADO.confirmaciones.cargar_soporte_texto',
        {
          titleKey: documento.soporte ? 'INSCRIPCION_GRADO.confirmaciones.reemplazar_soporte_titulo' : 'INSCRIPCION_GRADO.confirmaciones.cargar_soporte_titulo',
          confirmButtonKey: documento.soporte ? 'INSCRIPCION_GRADO.confirmaciones.reemplazar' : 'INSCRIPCION_GRADO.confirmaciones.cargar',
          textParams: { archivo: file.name, soporte: this.translate.instant(documento.tituloKey) }
        }
      );
      confirmado = resultado.isConfirmed === true;
    } finally {
      if (!confirmado) {
        this.subiendo = null;
        this.ocupado.emit(false);
      }
    }
    if (!confirmado || this.destruido || !this.borrador || this.borrador.Solicitud.Id !== contexto.solicitudId ||
      this.borrador.Formulario.Id !== contexto.formularioId || (documento.soporte?.Id || 0) !== contexto.soporteId ||
      !this.habilitado || !this.consultaCorrecta || this.cargando || this.descargando ||
      !this.permisos.permite('grado_consultar_soportes') || !this.permisos.permite(contexto.opcion)) {
      if (confirmado) {
        this.subiendo = null;
        this.ocupado.emit(false);
      }
      return;
    }
    const { Solicitud, Formulario } = this.borrador;
    this.alertas.showLoading(this.translate.instant(documento.soporte
      ? 'INSCRIPCION_GRADO.progreso.reemplazando_soporte'
      : 'INSCRIPCION_GRADO.progreso.cargando_soporte'));
	this.carga = this.servicio.subirSoporte(Solicitud.Id, Solicitud.TerceroId, Formulario.Id, documento.codigo, documento.soporte?.Id || 0, file).pipe(
      finalize(() => { this.subiendo = null; this.ocupado.emit(false); })
    ).subscribe({
      next: soporte => {
        documento.soporte = soporte;
        documento.mensaje = this.translate.instant('INSCRIPCION_GRADO.mensajes.pdf_guardado');
        this.alertas.showSuccessAlert(documento.mensaje);
        this.cerrarVisor();
      },
      error: e => {
        documento.error = mensajeErrorBorrador(e, this.translate.instant('INSCRIPCION_GRADO.errores.cargar_pdf'));
        this.alertas.showErrorAlert(documento.error);
        // Nunca se interpreta un fallo como ausencia ni se reemplaza a ciegas.
        this.consultaCorrecta = false;
        this.errorConsulta = this.translate.instant('INSCRIPCION_GRADO.errores.recargar_tras_carga');
      }
    });
  }

  ver(documento: DocumentoFormulario): void {
    if (!this.permisos.permite('grado_ver_soporte') || !this.permisos.permite('grado_consultar_soportes') ||
      !this.borrador || !documento.soporte || this.descargando || this.subiendo) return;
    documento.error = '';
    this.descargando = documento.codigo;
	this.descarga = this.servicio.archivoSoporte(this.borrador.Solicitud.Id, this.borrador.Solicitud.TerceroId, documento.codigo).pipe(
      finalize(() => this.descargando = null)
    ).subscribe({
      next: archivo => {
        if (!this.permisos.permite('grado_ver_soporte') || !this.permisos.permite('grado_consultar_soportes')) return;
        this.cerrarVisor();
        const url = URL.createObjectURL(archivo.blob);
        this.urlPDF = url;
        this.dialogo = this.dialog.open(this.visorPDF, { width: '95vw', maxWidth: '1100px', ariaLabel: this.translate.instant(documento.tituloKey),
          data: { nombre: archivo.nombre, url: this.sanitizer.bypassSecurityTrustResourceUrl(url), enlace: url } });
        this.dialogo.afterClosed().subscribe(() => {
          URL.revokeObjectURL(url);
          if (this.urlPDF === url) this.urlPDF = undefined;
        });
      },
      error: e => documento.error = mensajeErrorBorrador(e, this.translate.instant('INSCRIPCION_GRADO.errores.recuperar_pdf'))
    });
  }

  descargar(event: Event): void {
    if (!this.permisos.permite('grado_descargar_soporte') || !this.permisos.permite('grado_ver_soporte')) event.preventDefault();
  }

  private cerrarVisor(): void {
    this.dialogo?.close();
    if (this.urlPDF) { URL.revokeObjectURL(this.urlPDF); this.urlPDF = undefined; }
  }
}
