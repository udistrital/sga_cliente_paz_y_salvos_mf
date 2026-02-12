/**
 * Modelo de filtros para el semáforo de paz y salvos
 */
export interface SemaforoFilters {
  codigoEstudiante: string;
  idFacultad: number | null;
  idProyecto: number | null;
  anioInsGrado: number | null;
  perInsGrado: number | null;
}

/**
 * Opciones de catálogo para dropdowns
 */
export interface CatalogoOption {
  id: number | null;
  nombre: string;
}

/**
 * Proyecto asignado a un contratista/asistente
 */
export interface ProyectoAsignado {
  idOikos: number;
  codigo: string;
  nombre: string;
}

/**
 * Parámetros para queries al backend
 */
export interface SemaforoQueryParams {
  limit: number;
  offset: number;
  codigo?: string;
  idProyecto?: number;
  anio?: number;
  periodo?: number;
  idFacultad?: number;
}
