import { Injectable } from '@angular/core';
import { SemaforoRow } from '../models/semaforo-row';
import {
  SemaforoPatch,
  SemaforoPatchField,
  SemaforoRecord,
  SemaforosData,
  SemaforoTable
} from '../models/semaforo-api';
import { SemaforoFilters, SemaforoQueryParams, ProyectoAsignado, CatalogoOption } from '../models/semaforo-filters.model';

/**
 * Servicio para mapeo y transformación de datos del semáforo
 * Centraliza la lógica de conversión entre formatos del backend y frontend
 */
@Injectable({
  providedIn: 'root'
})
export class SemaforoDataMapperService {

  private readonly patchFields: SemaforoPatchField[] = [
    'Academico',
    'Financiero',
    'Biblioteca',
    'Laboratorios',
    'Bienestar',
    'Urelinter',
    'Orc',
    'ObservacionCoordinacion',
    'ObservacionBiblioteca',
    'ObservacionLaboratorios',
    'ObservacionBienestar',
    'ObservacionUrelinter',
    'ObservacionOrc',
    'ObservacionFinanciera'
  ];

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
  mapResponseToRowData(data: Array<SemaforoTable | SemaforoRecord>): SemaforoRow[] {
    return data.map(item => {
      const source = item as Partial<SemaforoTable & SemaforoRecord>;
      return {
      Id: item.Id,
      CodigoEstudiante: item.CodigoEstudiante,
      NombreEstudiante: source.NombreEstudiante || '',
      NombreFacultad: source.NombreFacultad || '',
      NombreProyecto: source.NombreProyecto || '',
      IdFacultadOikos: source.IdFacultadOikos || 0,
      IdProyectoOikos: source.IdProyectoOikos || 0,
      IdFacultadGedep: source.IdFacultadGedep || 0,
      IdProyectoAccra: source.IdProyectoAccra || 0,
      AnioInsGrado: item.AnioInsGrado,
      PerInsGrado: item.PerInsGrado,
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
      Activo: source.Activo !== false,
      FechaCreacion: source.FechaCreacion || '',
      FechaModificacion: source.FechaModificacion || '',
      };
    });
  }

  /**
   * Crea el objeto parcial para actualización (PATCH) de un registro
   * Solo incluye el campo que cambió para optimizar el request
   */
  createPatchPayload(row: SemaforoRow, changedField?: string): SemaforoPatch {
    if (changedField) {
      if (!this.patchFields.includes(changedField as SemaforoPatchField)) {
        throw new Error(`El campo ${changedField} no está permitido para actualización parcial`);
      }
      const field = changedField as SemaforoPatchField;
      return { [field]: row[field] } as SemaforoPatch;
    }

    return {
      Academico: row.Academico,
      Financiero: row.Financiero,
      Biblioteca: row.Biblioteca,
      Laboratorios: row.Laboratorios,
      Bienestar: row.Bienestar,
      Urelinter: row.Urelinter,
      Orc: row.Orc,
      ObservacionCoordinacion: row.ObservacionCoordinacion,
      ObservacionFinanciera: row.ObservacionFinanciera,
      ObservacionBiblioteca: row.ObservacionBiblioteca,
      ObservacionLaboratorios: row.ObservacionLaboratorios,
      ObservacionBienestar: row.ObservacionBienestar,
      ObservacionUrelinter: row.ObservacionUrelinter,
      ObservacionOrc: row.ObservacionOrc
    };
  }

  /**
   * Procesa la respuesta de proyectos asignados para roles con proyectos específicos
   * Usado por: CONTRATISTA, ASIS_PROYECTO y COORDINADOR
   * Nota: EsAsistente solo viene en la respuesta de CONTRATISTA/ASIS_PROYECTO
   */
  procesarProyectosAsignados(responseData: SemaforosData): {
    esAsistente: boolean;
    proyectosAsignados: ProyectoAsignado[];
    proyectos: CatalogoOption[];
  } {
    // EsAsistente solo existe en respuesta de asistentes, para coordinador será undefined -> false
    const esAsistente = !!responseData.EsAsistente;
    const proyectosAsignados = Array.isArray(responseData.ProyectosAsignados)
      ? responseData.ProyectosAsignados.map(p => ({
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
