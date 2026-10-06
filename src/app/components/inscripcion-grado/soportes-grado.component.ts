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
	observacion: string;
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
  @Output() progreso = new EventEmitter<number>();
  @ViewChild('visorPDF', { static: true }) visorPDF!: TemplateRef<unknown>;
  documentos: DocumentoFormulario[] = [
    { codigo: 'TSG_ACTA_SUST', tituloKey: 'INSCRIPCION_GRADO.soportes.acta_titulo', descripcionKey: 'INSCRIPCION_GRADO.soportes.acta_descripcion', soporte: null, error: '', mensaje: '', observacion: '' },
    { codigo: 'TSG_RESULTADO_SABER', tituloKey: 'INSCRIPCION_GRADO.soportes.saber_titulo', descripcionKey: 'INSCRIPCION_GRADO.soportes.saber_descripcion', soporte: null, error: '', mensaje: '', observacion: '' },
    { codigo: 'TSG_PAGO_DERECHOS', tituloKey: 'INSCRIPCION_GRADO.soportes.pago_titulo', descripcionKey: 'INSCRIPCION_GRADO.soportes.pago_descripcion', soporte: null, error: '', mensaje: '', observacion: '' },
    { codigo: 'TSG_TITULO_PREVIO', tituloKey: 'INSCRIPCION_GRADO.soportes.titulo_previo_titulo', descripcionKey: 'INSCRIPCION_GRADO.soportes.titulo_previo_descripcion', soporte: null, error: '', mensaje: '', observacion: '' }
  ];
  cargando = false;
  consultaCorrecta = false;
  errorConsulta = '';
  subiendo: TipoSoporteGrado | null = null;
  eliminando: TipoSoporteGrado | null = null;
  descargando: TipoSoporteGrado | null = null;
  private clave = '';
  private consulta?: Subscription;
  private carga?: Subscription;
  private eliminacion?: Subscription;
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
    if (this.subiendo || this.eliminando) this.alertas.closeLoading();
    this.consulta?.unsubscribe();
    this.carga?.unsubscribe();
    this.eliminacion?.unsubscribe();
    this.descarga?.unsubscribe();
    this.cerrarVisor();
    this.documentos.forEach(d => { d.soporte = null; d.error = d.mensaje = d.observacion = ''; });
    this.emitirProgreso();
    this.recargar();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    if (this.subiendo || this.eliminando) this.alertas.closeLoading();
    this.cambiosPermisos.unsubscribe();
    this.consulta?.unsubscribe();
    this.carga?.unsubscribe();
    this.eliminacion?.unsubscribe();
    this.descarga?.unsubscribe();
    this.cerrarVisor();
  }

  get puedeCargar(): boolean {
    return this.permisos.permite('grado_consultar_soportes') && !!this.borrador && !this.borrador.Formulario.FechaRadicacion && this.habilitado && this.consultaCorrecta && !this.cargando && !this.subiendo && !this.eliminando && !this.descargando;
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
    if (this.subiendo || this.eliminando) return;
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
		this.documentos.forEach(d => {
		  d.soporte = soportes.find(s => s.TipoSoporte === d.codigo) || null;
		  d.observacion = this.borrador?.EstadosSoportes?.find(e => e.SoporteGradoId === d.soporte?.Id)?.Observacion || '';
		});
        this.consultaCorrecta = true;
        this.emitirProgreso();
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
        this.emitirProgreso();
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

  async eliminar(documento: DocumentoFormulario): Promise<void> {
    if (!documento.soporte || !this.puedeCargarDocumento(documento) || !this.borrador) return;
    documento.error = documento.mensaje = '';
    const contexto = {
      solicitudId: this.borrador.Solicitud.Id,
      terceroId: this.borrador.Solicitud.TerceroId,
      formularioId: this.borrador.Formulario.Id,
      soporteId: documento.soporte.Id,
      opcion: this.opcionCarga(documento)
    };
    this.eliminando = documento.codigo;
    this.ocupado.emit(true);
    let confirmado = false;
    try {
      const resultado = await this.alertas.showConfirmAlert('INSCRIPCION_GRADO.confirmaciones.eliminar_soporte_texto', {
        titleKey: 'INSCRIPCION_GRADO.confirmaciones.eliminar_soporte_titulo',
        confirmButtonKey: 'INSCRIPCION_GRADO.confirmaciones.eliminar',
        textParams: { soporte: this.translate.instant(documento.tituloKey) }
      });
      confirmado = resultado.isConfirmed === true;
    } finally {
      if (!confirmado) {
        this.eliminando = null;
        this.ocupado.emit(false);
      }
    }
    if (!confirmado || this.destruido || !this.borrador || this.borrador.Solicitud.Id !== contexto.solicitudId ||
      this.borrador.Formulario.Id !== contexto.formularioId || documento.soporte?.Id !== contexto.soporteId ||
      !this.habilitado || !this.consultaCorrecta || this.cargando || this.subiendo || this.descargando ||
      !this.permisos.permite('grado_consultar_soportes') || !this.permisos.permite(contexto.opcion)) {
      if (confirmado) {
        this.eliminando = null;
        this.ocupado.emit(false);
      }
      return;
    }
    this.alertas.showLoading(this.translate.instant('INSCRIPCION_GRADO.progreso.eliminando_soporte'));
    this.eliminacion = this.servicio.eliminarSoporte(contexto.solicitudId, contexto.terceroId, contexto.formularioId,
      documento.codigo, contexto.soporteId).pipe(
      finalize(() => { this.eliminando = null; this.ocupado.emit(false); })
    ).subscribe({
      next: () => {
        documento.soporte = null;
        documento.observacion = '';
        this.emitirProgreso();
        documento.mensaje = this.translate.instant('INSCRIPCION_GRADO.mensajes.pdf_eliminado');
        this.alertas.showSuccessAlert(documento.mensaje);
        this.cerrarVisor();
      },
      error: e => {
        documento.error = mensajeErrorBorrador(e, this.translate.instant('INSCRIPCION_GRADO.errores.eliminar_pdf'));
        this.alertas.showErrorAlert(documento.error);
        this.consultaCorrecta = false;
        this.errorConsulta = this.translate.instant('INSCRIPCION_GRADO.errores.recargar_tras_eliminar');
      }
    });
  }

  ver(documento: DocumentoFormulario): void {
    if (!this.permisos.permite('grado_ver_soporte') || !this.permisos.permite('grado_consultar_soportes') ||
      !this.borrador || !documento.soporte || this.descargando || this.subiendo || this.eliminando) return;
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

  private emitirProgreso(): void {
    this.progreso.emit(this.documentos.filter(documento =>
      documento.codigo !== 'TSG_RESULTADO_SABER' && !!documento.soporte).length);
  }

  private cerrarVisor(): void {
    this.dialogo?.close();
    if (this.urlPDF) { URL.revokeObjectURL(this.urlPDF); this.urlPDF = undefined; }
  }
}
