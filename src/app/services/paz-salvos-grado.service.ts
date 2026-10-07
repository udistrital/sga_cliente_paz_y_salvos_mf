import { Injectable } from '@angular/core';
import { Observable, defer, map, retry, throwError, timer } from 'rxjs';
import { RequestManager } from '../managers/requestManager';
import { TipoSoporteGrado } from './inscripcion-grado.service';

export type CodigoTipoPazSalvo = 'TPS_COORDINACION' | 'TPS_FINANCIERO' | 'TPS_BIBLIOTECA' |
  'TPS_LABORATORIOS' | 'TPS_BIENESTAR' | 'TPS_URELINTER' | 'TPS_EXTENSION' | 'TPS_SECRETARIA';
export type CodigoEstadoPazSalvo = 'PS_PENDIENTE' | 'PS_APROBADO' | 'PS_DESAPROBADO';

export interface HistorialPazSalvoGrado {
  Id: number;
  TerceroId: number;
  EstadoCodigo: CodigoEstadoPazSalvo;
  Justificacion: string;
  FechaCreacion: string;
}

export interface CheckPazSalvoGrado {
  PazSalvo: { Id: number; TipoPazSalvoId: number; TipoCodigo: CodigoTipoPazSalvo };
  EstadoActual: HistorialPazSalvoGrado;
  Historial: HistorialPazSalvoGrado[];
}

export interface SolicitudPazSalvosGrado {
  Solicitud: {
    Id: number;
    TerceroId: number;
    CodigoEstudiante: string;
    PeriodoId: number;
    ProgramaAcademicoId: number;
    DependenciaOikosId: number;
  };
  Estudiante?: {
    NombreCompleto: string;
    TipoIdentificacion: string;
    NumeroIdentificacion: string;
    Telefono: string;
    TelefonoAlterno: string;
    Correo: string;
    Direccion: string;
  };
  Programa: string;
  Periodo: string;
  Checks: CheckPazSalvoGrado[];
  Soportes: { Id: number; TipoSoporte: TipoSoporteGrado; Nombre: string }[];
}

export interface PaginaPazSalvosGrado {
  Solicitudes: SolicitudPazSalvosGrado[];
  Total: number;
  TipoGestionado?: CodigoTipoPazSalvo;
  TipoGestionadoId: number;
}

export interface FiltrosConsultaPazSalvosGrado {
  codigo: string;
  facultadId: number;
  programaId: number;
  periodoId: number;
}

export interface CatalogosPazSalvosGrado {
  Periodos: { Id: number; Nombre: string }[];
  Facultades: { Id: number; Nombre: string }[];
  Programas: { Id: number; Nombre: string; DependenciaId: number; FacultadId: number }[];
}

function reintentarPazSalvos<T>() {
  return retry<T>({
    count: 1,
    delay: error => {
      const status = Number(error?.error?.Status ?? error?.Status ?? error?.status ?? 0);
      return status === 0 || status >= 500 ? timer(750) : throwError(() => error);
    }
  });
}

@Injectable({ providedIn: 'root' })
export class PazSalvosGradoService {
  constructor(private request: RequestManager) {}

  private mid<T>(metodo: 'get' | 'post', endpoint: string, body?: object): Observable<T> {
    return defer(() => {
      this.request.setPath('SGA_PAZ_Y_SALVOS_MID_SERVICE');
      return metodo === 'get' ? this.request.get(endpoint) : this.request.post(endpoint, body);
    }).pipe(map(respuesta => {
      if (respuesta?.Success !== true || respuesta?.Data === undefined || respuesta?.Data === null) {
        throw respuesta;
      }
      return respuesta.Data as T;
    }), reintentarPazSalvos<T>());
  }

  listar(perfil: string, tipo: CodigoTipoPazSalvo | undefined, limit: number, offset: number,
    filtros: FiltrosConsultaPazSalvosGrado = { codigo: '', facultadId: 0, programaId: 0, periodoId: 0 }): Observable<PaginaPazSalvosGrado> {
    const query = new URLSearchParams({ perfil, limit: String(limit), offset: String(offset) });
    if (tipo) query.set('tipo', tipo);
    if (filtros.codigo.trim()) query.set('codigo', filtros.codigo.trim());
    if (filtros.facultadId > 0) query.set('facultad_id', String(filtros.facultadId));
    if (filtros.programaId > 0) query.set('programa_id', String(filtros.programaId));
    if (filtros.periodoId > 0) query.set('periodo_id', String(filtros.periodoId));
    return this.mid('get', `solicitud-grado/paz-salvos?${query}`);
  }

  filtros(perfil: string, tipo?: CodigoTipoPazSalvo): Observable<CatalogosPazSalvosGrado> {
    const query = new URLSearchParams({ perfil });
    if (tipo) query.set('tipo', tipo);
    return this.mid('get', `solicitud-grado/paz-salvos/filtros?${query}`);
  }

  consultar(id: number, perfil: string): Observable<SolicitudPazSalvosGrado> {
    return this.mid('get', `solicitud-grado/${id}/paz-salvos?perfil=${encodeURIComponent(perfil)}`);
  }

  decidir(id: number, tipo: CodigoTipoPazSalvo, estado: CodigoEstadoPazSalvo,
    justificacion: string, perfil: string): Observable<SolicitudPazSalvosGrado> {
    return this.mid('post', `solicitud-grado/${id}/paz-salvos/${encodeURIComponent(tipo)}`, {
      Estado: estado,
      Justificacion: justificacion.trim(),
      Perfil: perfil
    });
  }

  archivo(id: number, tipoCheck: CodigoTipoPazSalvo, tipoSoporte: TipoSoporteGrado, perfil: string): Observable<{ nombre: string; blob: Blob }> {
    const query = new URLSearchParams({ tipo_check: tipoCheck, perfil });
    return this.mid<{ Nombre: string; MimeType: string; Archivo: string }>('get',
      `solicitud-grado/${id}/paz-salvos/soportes/${tipoSoporte}?${query}`).pipe(map(datos => {
      if (datos.MimeType !== 'application/pdf' || !datos.Nombre || typeof datos.Archivo !== 'string') throw { Status: 502 };
      const bytes = Uint8Array.from(atob(datos.Archivo), caracter => caracter.charCodeAt(0));
      if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw { Status: 502 };
      return { nombre: datos.Nombre, blob: new Blob([bytes], { type: 'application/pdf' }) };
    }));
  }
}
