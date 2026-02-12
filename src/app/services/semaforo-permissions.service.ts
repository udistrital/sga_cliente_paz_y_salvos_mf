import { Injectable } from '@angular/core';
import { SemaforoRow } from '../models/semaforo-row';

/**
 * Servicio centralizado para la gestión de permisos del semáforo
 * Maneja todas las validaciones de roles y restricciones de edición
 */
@Injectable({
  providedIn: 'root'
})
export class SemaforoPermissionsService {
  
  constructor() {}

  /**
   * Verifica si el usuario puede usar el filtro de código de estudiante
   * Todos excepto ESTUDIANTE
   */
  canUseCodigoFilter(userRoles: string[]): boolean {
    return !userRoles.includes('ESTUDIANTE');
  }

  /**
   * Verifica si el usuario puede usar el filtro de facultad
   * Solo roles globales: BIBLIOTECA, ADMIN_BIENESTAR, URELINTER, ADMISIONES_REG
   */
  canUseFacultadFilter(userRoles: string[]): boolean {
    return userRoles.includes('BIBLIOTECA') ||
           userRoles.includes('ADMIN_BIENESTAR') ||
           userRoles.includes('URELINTER') ||
           userRoles.includes('ADMISIONES_REG');
  }

  /**
   * Verifica si el usuario puede usar el filtro de proyecto
   * Todos excepto ESTUDIANTE y COORDINADOR
   */
  canUseProyectoFilter(userRoles: string[]): boolean {
    if (userRoles.includes('CONTRATISTA')) return true;
    return !userRoles.includes('ESTUDIANTE') && 
           !userRoles.includes('COORDINADOR');
  }

  /**
   * Verifica si el usuario puede usar el filtro de año
   * Todos excepto ESTUDIANTE
   */
  canUseAnioFilter(userRoles: string[]): boolean {
    return !userRoles.includes('ESTUDIANTE');
  }

  /**
   * Verifica si el usuario puede usar el filtro de periodo
   * Todos excepto ESTUDIANTE
   */
  canUsePeriodoFilter(userRoles: string[]): boolean {
    return !userRoles.includes('ESTUDIANTE');
  }

  /**
   * Verifica si el usuario puede editar una columna específica
   * Considera el estado de ORC y los roles del usuario
   */
  canEditColumn(colField: string, rowData: SemaforoRow, userRoles: string[]): boolean {
    // ADMISIONES_REG siempre puede editar ObservacionOrc
    if (userRoles.includes('ADMISIONES_REG') && colField === 'ObservacionOrc') {
      return true;
    }

    // Si Orc NO es null (es true o false), solo ADMISIONES_REG puede editar Orc y ObservacionOrc
    if (rowData.Orc !== null) {
      return (
        userRoles.includes('ADMISIONES_REG') &&
        (colField === 'Orc' || colField === 'ObservacionOrc')
      );
    }

    // Permisos por rol
    if (userRoles.includes('CONTRATISTA')) {
      return colField === 'Academico' || colField === 'Financiero' || colField === 'ObservacionCoordinacion';
    }
    if (userRoles.includes('COORDINADOR')) {
      return colField === 'Academico' || colField === 'Financiero' || colField === 'ObservacionCoordinacion';
    }
    if (userRoles.includes('BIBLIOTECA')) {
      return colField === 'Biblioteca' || colField === 'ObservacionBiblioteca';
    }
    if (userRoles.includes('LABORATORIOS') || userRoles.includes('JEFE_LABORATORIO')) {
      return colField === 'Laboratorios' || colField === 'ObservacionLaboratorios';
    }
    if (userRoles.includes('ADMIN_BIENESTAR')) {
      return colField === 'Bienestar' || colField === 'ObservacionBienestar';
    }
    if (userRoles.includes('URELINTER')) {
      return colField === 'Urelinter' || colField === 'ObservacionUrelinter';
    }
    
    // ESTUDIANTE Y SECRETARIOS solo consulta
    return false;
  }

  /**
   * Verifica si el campo pertenece al usuario ignorando el estado de ORC
   * Útil para determinar si el usuario tiene permiso sobre el campo en general
   */
  canEditColumnIfOrcNull(colField: string, rowData: SemaforoRow, userRoles: string[]): boolean {
    const tempRow = { ...rowData, Orc: null };
    return this.canEditColumn(colField, tempRow, userRoles);
  }

  /**
   * Verifica si todas las dependencias están en estado aprobado (true)
   * Necesario para validar si ORC puede aprobar
   */
  allDependenciesCleared(row: SemaforoRow, booleanFields: string[]): boolean {
    return booleanFields
      .filter(f => f !== 'Orc')
      .every(f => !!(row as any)[f]);
  }

  /**
   * Determina el endpoint a usar según el rol del usuario
   */
  getEndpointForRole(userRoles: string[]): 'estudiante' | 'coordinador' | 'secretario' | 'laboratorios' | 'contratista' | 'global' {
    if (userRoles.includes('ESTUDIANTE')) return 'estudiante';
    if (userRoles.includes('CONTRATISTA')) return 'contratista';
    if (userRoles.includes('COORDINADOR')) return 'coordinador';
    if (userRoles.includes('SECRETARIA_ACADEMICA') || userRoles.includes('SECRETARIO_ACADEMICO')) return 'secretario';
    if (userRoles.includes('LABORATORIOS') || userRoles.includes('JEFE_LABORATORIO')) return 'laboratorios';
    return 'global';
  }

  /**
   * Verifica si el rol necesita cargar proyectos desde la facultad
   */
  shouldLoadProyectosFromFacultad(userRoles: string[]): boolean {
    return userRoles.includes('SECRETARIA_ACADEMICA') || 
           userRoles.includes('SECRETARIO_ACADEMICO') ||
           userRoles.includes('LABORATORIOS') || 
           userRoles.includes('JEFE_LABORATORIO');
  }
}
