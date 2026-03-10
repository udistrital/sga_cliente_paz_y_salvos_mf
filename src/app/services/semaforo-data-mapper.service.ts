import { Injectable } from '@angular/core';
import { SemaforoRow, Semaforo } from '../models/semaforo-row';
import { SemaforoFilters, SemaforoQueryParams, ProyectoAsignado, CatalogoOption } from '../models/semaforo-filters.model';

/**
 * Servicio para mapeo y transformación de datos del semáforo
 * Centraliza la lógica de conversión entre formatos del backend y frontend
 */
@Injectable({
  providedIn: 'root'
})
export class SemaforoDataMapperService {

  constructor() {}

  /**
   * Construye los parámetros de query para el backend a partir de los filtros
   */
  buildQueryParams(filters: SemaforoFilters, currentPage: number, pageSize: number): SemaforoQueryParams {
    const params: SemaforoQueryParams = {
      limit: pageSize,
      offset: currentPage * pageSize
    };

    if (filters.codigoEstudiante) {
      params.codigo = filters.codigoEstudiante;
    }
    if (filters.idProyecto !== null && filters.idProyecto !== undefined) {
      params.idProyecto = filters.idProyecto;
    }
    if (filters.anioInsGrado !== null && filters.anioInsGrado !== undefined) {
      params.anio = filters.anioInsGrado;
    }
    if (filters.perInsGrado !== null && filters.perInsGrado !== undefined) {
      params.periodo = filters.perInsGrado;
    }
    if (filters.idFacultad !== null && filters.idFacultad !== undefined) {
      params.idFacultad = filters.idFacultad;
    }

    return params;
  }

  /**
   * Mapea los datos de respuesta del backend al formato de la tabla
   */
  mapResponseToRowData(data: any[]): SemaforoRow[] {
    return data.map((item: any) => ({
      Id: item.Id,
      CodigoEstudiante: item.CodigoEstudiante,
      NombreEstudiante: item.NombreEstudiante,
      NombreFacultad: item.NombreFacultad,
      NombreProyecto: item.NombreProyecto,
      IdFacultadOikos: item.IdFacultadOikos || 0,
      IdProyectoOikos: item.IdProyectoOikos || 0,
      IdFacultadGedep: item.IdFacultadGedep || 0,
      IdProyectoAccra: item.IdProyectoAccra || 0,
      AnioInsGrado: item.AnioInsGrado,
      PerInsGrado: item.PerInsGrado,
      Observacion: item.Observacion,
      Academico: !!item.Academico,
      Financiero: !!item.Financiero,
      Biblioteca: !!item.Biblioteca,
      Laboratorios: !!item.Laboratorios,
      Bienestar: !!item.Bienestar,
      Urelinter: !!item.Urelinter,
      Orc: item.Orc === null ? null : !!item.Orc,
      ObservacionCoordinacion: item.ObservacionCoordinacion || '',
      ObservacionFinanciera: item.ObservacionFinanciera || '',
      ObservacionBiblioteca: item.ObservacionBiblioteca || '',
      ObservacionLaboratorios: item.ObservacionLaboratorios || '',
      ObservacionBienestar: item.ObservacionBienestar || '',
      ObservacionUrelinter: item.ObservacionUrelinter || '',
      ObservacionOrc: item.ObservacionOrc || '',
      Activo: item.Activo !== false,
      FechaCreacion: item.FechaCreacion || '',
      FechaModificacion: item.FechaModificacion || '',
    }));
  }

  /**
   * Crea el objeto parcial para actualización (PATCH) de un registro
   * Solo incluye el campo que cambió para optimizar el request
   */
  createPatchPayload(row: SemaforoRow, changedField?: string): Partial<Semaforo> {
    const putStruct: Partial<Semaforo> = {};
    
    if (changedField) {
      (putStruct as any)[changedField] = (row as any)[changedField];
    } else {
      // Fallback: si no se especifica el campo, enviar todos
      putStruct.Observacion = row.Observacion;
      putStruct.Academico = row.Academico;
      putStruct.Financiero = row.Financiero;
      putStruct.Biblioteca = row.Biblioteca;
      putStruct.Laboratorios = row.Laboratorios;
      putStruct.Bienestar = row.Bienestar;
      putStruct.Urelinter = row.Urelinter;
      putStruct.Orc = row.Orc;
      putStruct.ObservacionCoordinacion = row.ObservacionCoordinacion;
      putStruct.ObservacionFinanciera = row.ObservacionFinanciera;
      putStruct.ObservacionBiblioteca = row.ObservacionBiblioteca;
      putStruct.ObservacionLaboratorios = row.ObservacionLaboratorios;
      putStruct.ObservacionBienestar = row.ObservacionBienestar;
      putStruct.ObservacionUrelinter = row.ObservacionUrelinter;
      putStruct.ObservacionOrc = row.ObservacionOrc;
    }

    return putStruct;
  }

  /**
   * Procesa la respuesta de proyectos asignados para un contratista o asistente de proyecto
   */
  procesarProyectosAsignados(responseData: any): {
    esAsistente: boolean;
    proyectosAsignados: ProyectoAsignado[];
    proyectos: CatalogoOption[];
  } {
    const esAsistente = !!responseData.EsAsistente;
    const proyectosAsignados = Array.isArray(responseData.ProyectosAsignados)
      ? responseData.ProyectosAsignados.map((p: any) => ({
          idOikos: p.IdOikos,
          codigo: p.Codigo,
          nombre: p.Nombre
        }))
      : [];
    
    const proyectos = proyectosAsignados.length > 0
      ? [{ id: null, nombre: 'Todos' }, ...proyectosAsignados.map((p: ProyectoAsignado) => ({ id: p.idOikos, nombre: p.nombre }))]
      : [];

    return { esAsistente, proyectosAsignados, proyectos };
  }

  /**
   * Extrae proyectos únicos de los datos cargados
   * Útil cuando no se puede consultar proyectos por facultad
   */
  extractProyectosFromData(rowData: SemaforoRow[]): CatalogoOption[] {
    const proyectosUnicos = new Map<number, string>();
    
    rowData.forEach(row => {
      if (row.IdProyectoOikos && row.NombreProyecto) {
        proyectosUnicos.set(row.IdProyectoOikos, row.NombreProyecto);
      }
    });
    
    const proyectosData = Array.from(proyectosUnicos.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    
    return [{ id: null, nombre: 'Todos' }, ...proyectosData];
  }

  /**
   * Verifica si hay filtros activos
   */
  hasActiveFilters(filters: SemaforoFilters): boolean {
    return !!(
      filters.codigoEstudiante ||
      filters.idFacultad ||
      filters.idProyecto ||
      filters.anioInsGrado ||
      filters.perInsGrado
    );
  }

  /**
   * Crea un objeto de filtros vacío
   */
  createEmptyFilters(): SemaforoFilters {
    return {
      codigoEstudiante: '',
      idFacultad: null,
      idProyecto: null,
      anioInsGrado: null,
      perInsGrado: null
    };
  }
}
