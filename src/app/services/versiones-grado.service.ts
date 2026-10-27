import { Injectable } from '@angular/core';
import { Observable, defer, map } from 'rxjs';
import { RequestManager } from '../managers/requestManager';
import { reintentarConsulta } from '../utils/reintentar-consulta';
import { MAX_PDF_GRADO, TipoSoporteGrado } from './inscripcion-grado.service';

export type VistaVersionGrado = 'estudiante' | 'secretaria';
export type EstadoSolicitudVersion = 'SG_RADICADA' | 'SG_OBSERVADA' | 'SG_DOC_APROBADA';

export interface VersionGradoResumen {
  FormularioId: number;
  Version: number;
  FechaRadicacion: string;
  EstadoCodigo: EstadoSolicitudVersion;
  Justificacion: string | null;
}

export interface ActuacionVersionGrado {
  Id: number;
  EstadoCodigo: string;
  Justificacion?: string | null;
  Observacion?: string | null;
  FechaCreacion: string;
}

export interface SoporteVersionGrado {
  Soporte: { Id: number; DocumentoId: number; FormularioSolicitudGradoId: number };
  TipoSoporte: TipoSoporteGrado;
  EstadoActual: ActuacionVersionGrado;
  Historial: ActuacionVersionGrado[];
}

export interface VersionGradoDetalle {
  Solicitud: { Id: number; TerceroId: number };
  Formulario: { Id: number; Version: number; FechaRadicacion: string; Contenido: Record<string, unknown> };
  Estado: EstadoSolicitudVersion;
  Referencias?: { Modalidad: string; Director1: string; Director2: string };
  Historial: ActuacionVersionGrado[];
  Soportes: SoporteVersionGrado[];
}

@Injectable({ providedIn: 'root' })
export class VersionesGradoService {
  constructor(private request: RequestManager) {}

  private base(id: number, vista: VistaVersionGrado): string {
    return `solicitud-grado/${vista === 'estudiante' ? 'borrador' : 'revision'}/${id}/versiones`;
  }

  private obtener<T>(ruta: string): Observable<T> {
    return defer(() => {
      this.request.setPath('SGA_PAZ_Y_SALVOS_MID_SERVICE');
      return this.request.get(ruta);
    }).pipe(map(respuesta => {
      if (Number(respuesta?.Status) >= 500) throw respuesta;
      return respuesta;
    }), reintentarConsulta(), map(respuesta => {
      if (respuesta?.Success !== true || respuesta?.Data === undefined || respuesta?.Data === null) throw respuesta;
      return respuesta.Data as T;
    }));
  }

  listar(id: number, vista: VistaVersionGrado): Observable<VersionGradoResumen[]> {
    return this.obtener<VersionGradoResumen[]>(this.base(id, vista)).pipe(map(versiones => {
      if (!Array.isArray(versiones) || versiones.some(v => !Number.isInteger(v.Version) || v.Version <= 0 || !v.FechaRadicacion ||
        !['SG_RADICADA', 'SG_OBSERVADA', 'SG_DOC_APROBADA'].includes(v.EstadoCodigo))) throw { Status: 502 };
      return versiones;
    }));
  }

  consultar(id: number, version: number, vista: VistaVersionGrado): Observable<VersionGradoDetalle> {
    return this.obtener<VersionGradoDetalle>(`${this.base(id, vista)}/${version}`).pipe(map(detalle => {
      if (detalle?.Solicitud?.Id !== id || detalle.Formulario?.Version !== version || !detalle.Formulario.FechaRadicacion ||
        !Array.isArray(detalle.Historial) || !Array.isArray(detalle.Soportes) ||
        detalle.Soportes.some(s => s.Soporte?.FormularioSolicitudGradoId !== detalle.Formulario.Id)) throw { Status: 502 };
      return detalle;
    }));
  }

  archivo(id: number, version: number, tipo: TipoSoporteGrado, vista: VistaVersionGrado): Observable<{ nombre: string; blob: Blob }> {
    return this.obtener<{ Nombre: string; MimeType: string; Archivo: string }>(
      `${this.base(id, vista)}/${version}/soportes/${tipo}`).pipe(map(datos => {
      if (datos.MimeType !== 'application/pdf' || !datos.Nombre || typeof datos.Archivo !== 'string' ||
        datos.Archivo.length > Math.ceil(MAX_PDF_GRADO / 3) * 4) throw { Status: 502 };
      const bytes = Uint8Array.from(atob(datos.Archivo), caracter => caracter.charCodeAt(0));
      if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw { Status: 502 };
      return { nombre: datos.Nombre, blob: new Blob([bytes], { type: 'application/pdf' }) };
    }));
  }
}
