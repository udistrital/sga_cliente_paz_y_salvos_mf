import { Injectable } from '@angular/core';
import { Observable, defer, map, retry, throwError, timer } from 'rxjs';
import { RequestManager } from '../managers/requestManager';
import { TipoSoporteGrado } from './inscripcion-grado.service';

export interface SolicitudRevisionResumen {
  Solicitud: {
    Id: number;
    TerceroId: number;
    CodigoEstudiante: string;
    PeriodoId: number;
    ProgramaAcademicoId: number;
    DependenciaOikosId: number;
  };
  Estudiante: {
    NombreCompleto: string;
    TipoIdentificacion: string;
    NumeroIdentificacion: string;
    FechaNacimiento: string | null;
    FechaExpedicion: string | null;
    Genero: string;
    Telefono: string;
    TelefonoAlterno: string;
    Correo: string;
    Direccion: string;
  };
  Programa: string;
  Periodo: string;
  Formulario: {
    TrabajoGrado: string;
    Modalidad: string;
    DirectorPrincipal: string;
    DirectorSecundario: string;
    CiudadExpedicion: string;
    DepartamentoExpedicion: string;
    PaisExpedicion: string;
    NumeroActaSustentacion: string;
    NumeroRegistroSnp: string;
    TrabajaActualmente: boolean | null;
    Empresa: string;
    DireccionEmpresa: string;
    TelefonoEmpresa: string;
  };
  Version: number;
  Estado: 'SG_BORRADOR' | 'SG_RADICADA' | 'SG_OBSERVADA' | 'SG_DOC_APROBADA';
  Comentario: string | null;
  RadicadaEn: string | null;
  Soportes: SoporteRevisionGrado[];
}

export interface FiltrosRevisionGrado {
	Periodos: { Id: number; Nombre: string }[];
	Programas: { Id: number; Nombre: string; DependenciaId: number }[];
}

export interface PaginaRevisionGrado {
	Solicitudes: SolicitudRevisionResumen[];
	Total: number;
}

export interface SoporteRevisionGrado {
  Id: number;
  FormularioId: number;
  TipoSoporte: TipoSoporteGrado;
  DocumentoId: number;
  Nombre: string;
}

export interface DecisionSoporteRevision {
  SoporteId: number;
  Observado: boolean;
  Observacion: string;
}

export interface RevisionDocumentalEntrada {
  FormularioId: number;
  Aprobada: boolean;
  Justificacion: string;
  Soportes: DecisionSoporteRevision[];
}

function reintentarRevision<T>() {
  return retry<T>({
    count: 1,
    delay: error => {
      const status = Number(error?.error?.Status ?? error?.Status ?? error?.status ?? 0);
      return status === 0 || status >= 500 ? timer(750) : throwError(() => error);
    }
  });
}

@Injectable({ providedIn: 'root' })
export class RevisionDocumentalGradoService {
  constructor(private request: RequestManager) {}

  private mid<T>(metodo: 'get' | 'post', endpoint: string, body?: object): Observable<T> {
    return defer(() => {
      this.request.setPath('SGA_PAZ_Y_SALVOS_MID_SERVICE');
      return metodo === 'get' ? this.request.get(endpoint) : this.request.post(endpoint, body);
    }).pipe(map(respuesta => {
      if (respuesta?.Success !== true || respuesta?.Data === undefined || respuesta?.Data === null) {
        throw respuesta?.Success === false ? respuesta : { Status: 502 };
      }
      return respuesta.Data as T;
    }));
  }

	  listar(limit = 10, offset = 0, periodoId = 0, programaId = 0, estado = '', texto = ''): Observable<PaginaRevisionGrado> {
		if (!Number.isSafeInteger(limit) || limit <= 0 || limit > 100 || !Number.isSafeInteger(offset) || offset < 0 ||
			!Number.isSafeInteger(periodoId) || periodoId < 0 || !Number.isSafeInteger(programaId) || programaId < 0) {
		  return throwError(() => new Error('Filtros de consulta inválidos.'));
		}
		const parametros = [`limit=${limit}`, `offset=${offset}`];
		if (periodoId > 0) parametros.push(`periodo_id=${periodoId}`);
		if (programaId > 0) parametros.push(`programa_id=${programaId}`);
		if (estado) parametros.push(`estado=${encodeURIComponent(estado)}`);
		if (texto.trim()) parametros.push(`texto=${encodeURIComponent(texto.trim())}`);
	    return this.mid<PaginaRevisionGrado>('get', `solicitud-grado/revision?${parametros.join('&')}`).pipe(
	      map(pagina => {
			if (!Array.isArray(pagina?.Solicitudes) || !Number.isSafeInteger(pagina?.Total) || pagina.Total < 0) throw { Status: 502 };
			return pagina;
		  }),
	      reintentarRevision()
	    );
	  }

  filtros(): Observable<FiltrosRevisionGrado> {
	return this.mid<FiltrosRevisionGrado>('get', 'solicitud-grado/revision/filtros').pipe(map(datos => {
	  if (!Array.isArray(datos?.Periodos) || !Array.isArray(datos?.Programas)) throw { Status: 502 };
	  return datos;
	}), reintentarRevision());
  }

  consultar(id: number): Observable<SolicitudRevisionResumen> {
    return this.mid<SolicitudRevisionResumen>('get', `solicitud-grado/revision/${id}`).pipe(reintentarRevision());
  }

  revisar(id: number, entrada: RevisionDocumentalEntrada): Observable<SolicitudRevisionResumen> {
    return this.mid<SolicitudRevisionResumen>('post', `solicitud-grado/revision/${id}`, entrada);
  }

  archivo(id: number, tipo: TipoSoporteGrado): Observable<{ nombre: string; blob: Blob }> {
    return this.mid<{ Nombre: string; MimeType: string; Archivo: string }>('get',
      `solicitud-grado/revision/${id}/soportes/${tipo}`).pipe(map(datos => {
      if (datos.MimeType !== 'application/pdf' || !datos.Nombre || typeof datos.Archivo !== 'string') {
        throw { Status: 502 };
      }
      const bytes = Uint8Array.from(atob(datos.Archivo), caracter => caracter.charCodeAt(0));
      if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw { Status: 502 };
      return { nombre: datos.Nombre, blob: new Blob([bytes], { type: 'application/pdf' }) };
    }));
  }
}
