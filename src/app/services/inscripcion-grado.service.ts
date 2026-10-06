import { Injectable } from '@angular/core';
import { MonoTypeOperatorFunction, Observable, defer, forkJoin, of, throwError, timer } from 'rxjs';
import { catchError, map, retry, switchMap } from 'rxjs/operators';
import { RequestManager } from '../managers/requestManager';

export interface PeriodoGrado { Id: number; Nombre: string; }
interface Nivel { Id: number; NivelFormacionPadreId?: Nivel | null; }
export interface ProgramaGrado {
  Id: number;
  Nombre: string;
  DependenciaId: number;
  NivelFormacionId: Nivel;
  Activo: boolean;
}

function reintentarLectura<T>(): MonoTypeOperatorFunction<T> {
  return retry({
    count: 1,
    delay: error => {
      const status = Number(error?.error?.Status ?? error?.Status ?? error?.status ?? 0);
      return status === 0 || status >= 500 ? timer(750) : throwError(() => error);
    }
  });
}
interface Vinculacion {
  DependenciaId: number;
  Activo: boolean;
  FechaInicioVinculacion?: string | null;
  FechaFinVinculacion?: string | null;
}
export interface EventoGrado {
  EventoId: number;
  CodigoAbreviacion: string;
  FechaInicioEvento: string;
  FechaFinEvento: string;
}
interface CalendarioPrograma {
  ProyectoId: number;
  CalendarioID: string;
  Proceso: { CodigoAbreviacion: string; Eventos: EventoGrado[] }[];
}
export interface DisponibilidadGrado {
  calendarioId: string;
  inscripcion: EventoGrado;
  aprobacion: EventoGrado;
}
export interface BorradorGrado {
  Solicitud: { Id: number; TerceroId: number; PeriodoId: number; ProgramaAcademicoId: number; CodigoEstudiante?: string };
	Formulario: { Id: number; Version?: number; Contenido: { [campo: string]: unknown }; FechaRadicacion: string | null };
	Estado?: 'SG_BORRADOR' | 'SG_RADICADA' | 'SG_OBSERVADA' | 'SG_DOC_APROBADA';
	Comentario?: string | null;
	EstadosSoportes?: { SoporteGradoId: number; EstadoSoporteId: number; Observacion: string }[];
}
export interface DatosBasicosGrado {
  Id: number;
  NombreCompleto?: string | null;
  PrimerNombre?: string | null;
  SegundoNombre?: string | null;
  PrimerApellido?: string | null;
  SegundoApellido?: string | null;
  TipoIdentificacion?: { Nombre?: string | null } | null;
  NumeroIdentificacion?: string | null;
  FechaNacimiento?: string | null;
  FechaExpedicion?: string | null;
  Genero?: { Nombre?: string | null } | null;
  Telefono?: string | number | null;
  TelefonoAlterno?: string | number | null;
}
export interface DirectorGrado {
  DIR_NRO_IDEN: string;
  DIR_NOMBRE: string;
  DIR_APELLIDO: string;
  DIR_ESTADO: string;
}
export interface ModalidadGrado {
  Id: number;
  Nombre: string;
  CodigoAbreviacion: string;
  Activo: boolean;
  NumeroOrden: number;
}
export interface LugarExpedicionGrado {
  Id: number;
  Nombre: string;
  DepartamentoId: number;
  DepartamentoNombre: string;
  PaisId: number;
  PaisNombre: string;
}
export interface LugarExpedicionIdentificacionGrado {
  Registrado: boolean;
  Lugar: LugarExpedicionGrado | null;
}
export interface PaisExpedicionGrado {
  Id: number;
  Nombre: string;
}
export interface DepartamentoExpedicionGrado {
  Id: number;
  Nombre: string;
  PaisId: number;
  PaisNombre: string;
}
export type TipoSoporteGrado = 'TSG_ACTA_SUST' | 'TSG_RESULTADO_SABER' | 'TSG_PAGO_DERECHOS' | 'TSG_TITULO_PREVIO';
export interface SoporteGrado {
  Id: number;
  FormularioId: number;
  TipoSoporte: TipoSoporteGrado;
  DocumentoId: number;
  Nombre: string;
}
export const MAX_PDF_GRADO = 5 * 1024 * 1024;

export async function validarPDFGrado(file: File): Promise<void> {
  if (!file.size || file.size > MAX_PDF_GRADO) throw new Error('Selecciona un PDF de hasta 5 MiB.');
  if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf') ||
    new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== '%PDF-' ||
    !new TextDecoder().decode(await file.slice(-1024).arrayBuffer()).trimEnd().endsWith('%%EOF')) {
    throw new Error('El archivo debe ser un PDF válido.');
  }
}

export async function pdfGradoBase64(file: File): Promise<string> {
  await validarPDFGrado(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No fue posible leer el archivo.'));
    reader.onabort = () => reject(new Error('La lectura del archivo fue cancelada.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.readAsDataURL(file);
  });
}

export function mensajeErrorBorrador(error: any, fallback: string): string {
  const mensaje = error?.error?.Message ?? error?.Message ?? error?.message;
  return typeof mensaje === 'string' && mensaje.trim() ? mensaje : fallback;
}

// Consulta informativa. La autorización de radicación corresponde al MID.
export function fechaGrado(valor?: string | null): number | null {
  if (!valor || valor.startsWith('0001-')) return null;
  const texto = valor.trim();
  // Las fechas particulares del calendario no incluyen zona: horario de Bogotá.
  const normalizada = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(texto)
    ? texto : `${texto.replace(' ', 'T')}-05:00`;
  const resultado = Date.parse(normalizada);
  return Number.isFinite(resultado) ? resultado : null;
}

// PostgreSQL entrega los timestamp without time zone con la hora de pared de Bogotá,
// aunque algunos serializadores agreguen Z u otro offset al convertir time.Time a JSON.
export function fechaGradoPersistida(valor?: string | null): number | null {
  if (!valor) return null;
  const horaBogota = valor.trim().replace(/(?:Z|[+-]\d{2}:?\d{2})$/i, '');
  return fechaGrado(horaBogota);
}

export function vinculacionVigente(v: Vinculacion, ahora = Date.now()): boolean {
  if (!v.Activo) return false;
  const inicio = fechaGrado(v.FechaInicioVinculacion);
  const fin = fechaGrado(v.FechaFinVinculacion);
  const invalida = (s?: string | null) => !!s && !s.startsWith('0001-') && fechaGrado(s) === null;
  if (invalida(v.FechaInicioVinculacion) || invalida(v.FechaFinVinculacion)) return false;
  return (inicio === null || ahora >= inicio) && (fin === null || ahora <= fin);
}

export function resolverEventos(datos: CalendarioPrograma[], programaId: number): DisponibilidadGrado | null {
  const programas = datos.filter(p => Number(p.ProyectoId) === programaId);
  if (!programas.length) return null;
  if (programas.length !== 1) throw new Error('Hay varios calendarios para el programa y periodo. Solicita revisar la configuración.');
  const procesos = (programas[0].Proceso || []).filter(p => p.CodigoAbreviacion === 'PROC_GRAD');
  if (!procesos.length) return null;
  if (procesos.length !== 1) throw new Error('Hay varios procesos de Grados para el programa.');
  const eventos = procesos[0].Eventos || [];
  const resolver = (codigo: string) => {
    const coincidencias = eventos.filter(e => e.CodigoAbreviacion === codigo);
    if (coincidencias.length !== 1) throw new Error(`Configuración incompleta o duplicada del evento ${codigo}.`);
    const evento = coincidencias[0];
    const inicio = fechaGradoPersistida(evento.FechaInicioEvento);
    const fin = fechaGradoPersistida(evento.FechaFinEvento);
    if (inicio === null || fin === null || fin < inicio) throw new Error(`Fechas inválidas en ${codigo}.`);
    return evento;
  };
  return { calendarioId: programas[0].CalendarioID, inscripcion: resolver('INSC_GRADO'), aprobacion: resolver('APROB_PAZ_SALVO') };
}

@Injectable({ providedIn: 'root' })
export class InscripcionGradoService {
  constructor(private request: RequestManager) {}

  private lista<T>(servicio: string, endpoint: string): Observable<T[]> {
    return defer(() => {
      this.request.setPath(servicio);
      return this.request.get(endpoint);
    }).pipe(map(res => {
      if (res?.Success === false || (res?.Status && Number(res.Status) >= 400)) {
        throw new Error('El servicio no pudo completar la consulta. Intenta nuevamente.');
      }
      const datos = Array.isArray(res) ? res : res?.Data;
      if (!Array.isArray(datos)) throw new Error('El servicio devolvió una respuesta inesperada.');
      return datos.filter(item => item && Object.keys(item).length > 0) as T[];
    }));
  }

  periodos(): Observable<PeriodoGrado[]> {
    return this.lista<PeriodoGrado>('PARAMETROS_SERVICE',
      'periodo?query=CodigoAbreviacion:PA,Activo:true&limit=0&sortby=Id&order=desc');
  }

  datosBasicos(terceroId: number): Observable<DatosBasicosGrado> {
    return defer(() => {
      if (!Number.isSafeInteger(terceroId) || terceroId <= 0) {
        throw new Error('No se pudo identificar al estudiante.');
      }
      this.request.setPath('TERCEROS_MID_SERVICE');
      return this.request.get(`personas/${terceroId}`);
    }).pipe(map(respuesta => {
      const persona = respuesta?.Data as DatosBasicosGrado | undefined;
      if (respuesta?.Success !== true || Number(respuesta?.Status) !== 200 || !persona || persona.Id !== terceroId) {
        throw new Error('No fue posible verificar los datos básicos del estudiante.');
      }
      return persona;
    }));
  }

  directores(terceroId: number): Observable<DirectorGrado[]> {
    return this.mid<DirectorGrado[]>('get', `solicitud-grado/directores?tercero_id=${terceroId}`).pipe(map(datos => {
      if (!Array.isArray(datos) || datos.some(d => !d || !/^[1-9][0-9]{0,37}$/.test(d.DIR_NRO_IDEN) ||
        !d.DIR_NOMBRE?.trim() || !d.DIR_APELLIDO?.trim() || d.DIR_ESTADO !== 'A') ||
        new Set(datos.map(d => d.DIR_NRO_IDEN)).size !== datos.length) {
        throw new Error('Catálogo de directores no verificable.');
      }
      return datos;
    }));
  }

  modalidades(terceroId: number): Observable<ModalidadGrado[]> {
    return this.mid<ModalidadGrado[]>('get', `solicitud-grado/modalidades?tercero_id=${terceroId}`).pipe(map(datos => {
      if (!Array.isArray(datos) || !datos.length || datos.some(m => !m || !Number.isSafeInteger(m.Id) || m.Id <= 0 ||
        !m.Nombre?.trim() || !m.CodigoAbreviacion?.trim() || m.Activo !== true) ||
        new Set(datos.map(m => m.Id)).size !== datos.length || new Set(datos.map(m => m.CodigoAbreviacion)).size !== datos.length) {
        throw new Error('Catálogo de modalidades no verificable.');
      }
      return datos;
    }));
  }

  paisesExpedicion(terceroId: number): Observable<PaisExpedicionGrado[]> {
    return this.mid<PaisExpedicionGrado[]>('get', `solicitud-grado/paises-expedicion?tercero_id=${terceroId}`).pipe(map(datos => {
      if (!Array.isArray(datos) || !datos.length || datos.some(p => !p || !Number.isSafeInteger(p.Id) || p.Id <= 0 || !p.Nombre?.trim()) ||
        new Set(datos.map(p => p.Id)).size !== datos.length) {
        throw new Error('Catálogo de países no verificable.');
      }
      return datos;
    }));
  }

  departamentosExpedicion(terceroId: number, paisId: number): Observable<DepartamentoExpedicionGrado[]> {
    return this.mid<DepartamentoExpedicionGrado[]>('get',
      `solicitud-grado/departamentos-expedicion?tercero_id=${terceroId}&pais_id=${paisId}`).pipe(map(datos => {
      if (!Array.isArray(datos) || datos.some(d => !d || !Number.isSafeInteger(d.Id) || d.Id <= 0 || d.PaisId !== paisId ||
        !d.Nombre?.trim() || !d.PaisNombre?.trim()) || new Set(datos.map(d => d.Id)).size !== datos.length) {
        throw new Error('Catálogo de departamentos no verificable.');
      }
      return datos;
    }));
  }

  lugaresExpedicion(terceroId: number, paisId: number, departamentoId: number): Observable<LugarExpedicionGrado[]> {
    return this.mid<LugarExpedicionGrado[]>('get',
      `solicitud-grado/lugares-expedicion?tercero_id=${terceroId}&pais_id=${paisId}&departamento_id=${departamentoId}`).pipe(map(datos => {
      if (!Array.isArray(datos) || datos.some(l => !l || !Number.isSafeInteger(l.Id) || l.Id <= 0 ||
        l.PaisId !== paisId || l.DepartamentoId !== departamentoId || !l.Nombre?.trim() || !l.DepartamentoNombre?.trim() || !l.PaisNombre?.trim()) ||
        new Set(datos.map(l => l.Id)).size !== datos.length) {
        throw new Error('Catálogo de lugares de expedición no verificable.');
      }
      return datos;
    }));
  }

  lugarExpedicion(terceroId: number, lugarId: number): Observable<LugarExpedicionGrado> {
    return this.mid<LugarExpedicionGrado>('get', `solicitud-grado/lugares-expedicion/${lugarId}?tercero_id=${terceroId}`).pipe(map(lugar => {
      if (!lugar || lugar.Id !== lugarId || !Number.isSafeInteger(lugar.PaisId) || lugar.PaisId <= 0 ||
        !Number.isSafeInteger(lugar.DepartamentoId) || lugar.DepartamentoId <= 0 || !lugar.Nombre?.trim() ||
        !lugar.DepartamentoNombre?.trim() || !lugar.PaisNombre?.trim()) {
        throw new Error('Lugar de expedición no verificable.');
      }
      return lugar;
    }));
  }

  lugarExpedicionIdentificacion(terceroId: number): Observable<LugarExpedicionIdentificacionGrado> {
    return this.mid<LugarExpedicionIdentificacionGrado>('get',
      `solicitud-grado/lugar-expedicion-identificacion?tercero_id=${terceroId}`).pipe(map(resultado => {
      if (!resultado || typeof resultado.Registrado !== 'boolean' ||
        (resultado.Registrado && (!resultado.Lugar || !Number.isSafeInteger(resultado.Lugar.Id) || resultado.Lugar.Id <= 0 ||
          !resultado.Lugar.Nombre?.trim() || !resultado.Lugar.DepartamentoNombre?.trim() || !resultado.Lugar.PaisNombre?.trim())) ||
        (!resultado.Registrado && resultado.Lugar !== null)) {
        throw new Error('Lugar de expedición de Terceros no verificable.');
      }
      return resultado;
    }));
  }

  programas(terceroId: number): Observable<ProgramaGrado[]> {
    if (!Number.isInteger(terceroId) || terceroId <= 0) throw new Error('No se pudo identificar al estudiante.');
    return this.lista<{ Id: number }>('PARAMETROS_SERVICE',
      'parametro?query=CodigoAbreviacion:EST,TipoParametroId.CodigoAbreviacion:TV,Activo:true&limit=0').pipe(
      switchMap(parametros => {
        if (parametros.length !== 1) throw new Error('No se pudo resolver el tipo de vinculación de estudiante.');
        return this.lista<Vinculacion>('TERCEROS_SERVICE',
          `vinculacion?query=TerceroPrincipalId.Id:${terceroId},TipoVinculacionId:${parametros[0].Id},Activo:true&limit=0`);
      }),
      switchMap(vinculaciones => {
        const dependencias = [...new Set(vinculaciones.filter(v => vinculacionVigente(v)).map(v => v.DependenciaId))];
        return dependencias.length ? forkJoin(dependencias.map(id =>
          this.lista<ProgramaGrado>('PROYECTO_ACADEMICO_SERVICE',
            `proyecto_academico_institucion?query=DependenciaId:${id},Activo:true&limit=0`))) : of([] as ProgramaGrado[][]);
      }),
      map(grupos => [...new Map(grupos.flat().filter(p => p.Activo).map(p => [p.Id, p])).values()]
        .sort((a, b) => a.Nombre.localeCompare(b.Nombre)))
    );
  }

  disponibilidad(programa: ProgramaGrado, periodoId: number): Observable<DisponibilidadGrado | null> {
    let nivel = programa.NivelFormacionId;
    while (nivel?.NivelFormacionPadreId) nivel = nivel.NivelFormacionPadreId;
    if (!nivel?.Id) throw new Error('El programa no tiene nivel de formación configurado.');
    return this.lista<CalendarioPrograma>('CALENDARIO_MID_SERVICE',
      `calendario-proyecto/calendario/proyecto?id-nivel=${nivel.Id}&id-periodo=${periodoId}`)
      .pipe(map(datos => resolverEventos(datos, programa.Id)));
  }

  private mid<T>(metodo: 'get' | 'post' | 'put' | 'delete', endpoint: string, body?: object): Observable<T> {
    return defer(() => {
      this.request.setPath('SGA_PAZ_Y_SALVOS_MID_SERVICE');
      const peticion = metodo === 'get' ? this.request.get(endpoint)
        : metodo === 'post' ? this.request.post(endpoint, body)
          : metodo === 'put' ? this.request.put(endpoint, body) : this.request.delete(endpoint);
      return peticion;
    }).pipe(map(respuesta => {
      if (respuesta?.Success !== true || !respuesta?.Data) {
        throw respuesta?.Success === false ? respuesta : new Error('No fue posible consultar o guardar el borrador.');
      }
      return respuesta.Data as T;
    }));
  }

  consultarBorrador(terceroId: number, periodoId: number, programaId: number): Observable<BorradorGrado | null> {
	return this.mid<BorradorGrado>('get',
	  `solicitud-grado/borrador?tercero_id=${terceroId}&periodo_id=${periodoId}&programa_id=${programaId}`).pipe(
      reintentarLectura(),
      catchError(error => Number(error?.error?.Status ?? error?.Status ?? error?.status) === 404 ? of(null) : throwError(() => error))
    );
  }

  crearBorrador(terceroId: number, periodoId: number, programaId: number, contenido: object): Observable<BorradorGrado> {
	return this.mid<BorradorGrado>('post', 'solicitud-grado/borrador', {
	  TerceroId: terceroId, PeriodoId: periodoId, ProgramaAcademicoId: programaId, Contenido: contenido
	});
  }

  guardarBorrador(id: number, terceroId: number, contenido: object): Observable<BorradorGrado> {
	return this.mid<BorradorGrado>('put', `solicitud-grado/borrador/${id}`, { TerceroId: terceroId, Contenido: contenido });
  }

  radicar(id: number, terceroId: number, formularioId: number, contenido: object): Observable<BorradorGrado> {
	return this.mid<BorradorGrado>('post', `solicitud-grado/borrador/${id}/radicar`, { TerceroId: terceroId, FormularioId: formularioId, Contenido: contenido });
  }

  subsanar(id: number, terceroId: number, formularioId: number): Observable<BorradorGrado> {
	return this.mid<BorradorGrado>('post', `solicitud-grado/borrador/${id}/subsanar`, { TerceroId: terceroId, FormularioId: formularioId });
  }

  soportes(id: number, terceroId: number, formularioId: number): Observable<SoporteGrado[]> {
	return this.mid<SoporteGrado[]>('get', `solicitud-grado/borrador/${id}/soportes?tercero_id=${terceroId}`).pipe(map(datos => {
      if (!Array.isArray(datos) || datos.length > 4 || new Set(datos.map(s => s?.TipoSoporte)).size !== datos.length ||
        datos.some(s => !s || s.FormularioId !== formularioId || !s.Nombre || !s.Id || !s.DocumentoId ||
          !['TSG_ACTA_SUST', 'TSG_RESULTADO_SABER', 'TSG_PAGO_DERECHOS', 'TSG_TITULO_PREVIO'].includes(s.TipoSoporte))) {
        throw new Error('No fue posible verificar los soportes de esta versión.');
      }
      return datos;
    }), reintentarLectura());
  }

  subirSoporte(id: number, terceroId: number, formularioId: number, tipo: TipoSoporteGrado, actual: number, archivo: File): Observable<SoporteGrado> {
    return defer(() => pdfGradoBase64(archivo)).pipe(switchMap(base64 =>
      this.mid<SoporteGrado>('put', `solicitud-grado/borrador/${id}/soportes/${tipo}`, {
		TerceroId: terceroId, FormularioId: formularioId, SoporteActualId: actual, Nombre: archivo.name, MimeType: 'application/pdf', Archivo: base64
      })), map(soporte => {
      if (!soporte?.Id || !soporte.DocumentoId || soporte.FormularioId !== formularioId || soporte.TipoSoporte !== tipo) {
        throw new Error('No se pudo confirmar la asociación del PDF. Recarga los soportes.');
      }
      return soporte;
    }));
  }

  eliminarSoporte(id: number, terceroId: number, formularioId: number, tipo: TipoSoporteGrado, actual: number): Observable<void> {
    return this.mid<{ Id: number; FormularioId: number; TipoSoporte: TipoSoporteGrado }>('delete',
      `solicitud-grado/borrador/${id}/soportes/${tipo}?tercero_id=${terceroId}&formulario_id=${formularioId}&soporte_actual_id=${actual}`).pipe(
      map(resultado => {
        if (!resultado || resultado.Id !== actual || resultado.FormularioId !== formularioId || resultado.TipoSoporte !== tipo) {
          throw new Error('No se pudo confirmar la eliminación del PDF. Recarga los soportes.');
        }
      })
    );
  }

  archivoSoporte(id: number, terceroId: number, tipo: TipoSoporteGrado): Observable<{ nombre: string; blob: Blob }> {
	return this.mid<{ Nombre: string; MimeType: string; Archivo: string }>('get',
	  `solicitud-grado/borrador/${id}/soportes/${tipo}?tercero_id=${terceroId}`).pipe(map(datos => {
      if (datos.MimeType !== 'application/pdf' || !datos.Nombre || typeof datos.Archivo !== 'string' || datos.Archivo.length > Math.ceil(MAX_PDF_GRADO / 3) * 4) {
        throw new Error('El archivo recuperado no es un PDF verificable.');
      }
      const bytes = Uint8Array.from(atob(datos.Archivo), c => c.charCodeAt(0));
      if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new Error('Contenido PDF inválido.');
      return { nombre: datos.Nombre, blob: new Blob([bytes], { type: 'application/pdf' }) };
    }));
  }
}
