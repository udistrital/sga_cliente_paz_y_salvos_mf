import { Injectable } from '@angular/core';
import { SemaforoRow } from '../models/semaforo-row';
import { PermisosService } from './permisos.service';

export type ContextoSemaforo = 'propio' | 'programas-asignados' | 'programa-coordinado' | 'facultad' | 'laboratorios' | 'global';

const CONTEXTOS: Record<ContextoSemaforo, string> = {
  propio: 'paz_salvos_consultar_propios',
  'programas-asignados': 'paz_salvos_consultar_programas_asignados',
  'programa-coordinado': 'paz_salvos_consultar_programa_coordinado',
  facultad: 'paz_salvos_consultar_facultad_asignada',
  laboratorios: 'paz_salvos_consultar_laboratorios',
  global: 'paz_salvos_consultar_global'
};

const CAMPOS: Record<string, string> = {
  Academico: 'paz_salvos_legacy_cambiar_academico',
  ObservacionCoordinacion: 'paz_salvos_legacy_observar_coordinacion',
  Financiero: 'paz_salvos_legacy_cambiar_financiero',
  ObservacionFinanciera: 'paz_salvos_legacy_observar_financiero',
  Biblioteca: 'paz_salvos_legacy_cambiar_biblioteca',
  ObservacionBiblioteca: 'paz_salvos_legacy_observar_biblioteca',
  Laboratorios: 'paz_salvos_legacy_cambiar_laboratorios',
  ObservacionLaboratorios: 'paz_salvos_legacy_observar_laboratorios',
  Bienestar: 'paz_salvos_legacy_cambiar_bienestar',
  ObservacionBienestar: 'paz_salvos_legacy_observar_bienestar',
  Urelinter: 'paz_salvos_legacy_cambiar_urelinter',
  ObservacionUrelinter: 'paz_salvos_legacy_observar_urelinter',
  Orc: 'paz_salvos_legacy_cambiar_orc',
  ObservacionOrc: 'paz_salvos_legacy_observar_orc'
};

@Injectable({ providedIn: 'root' })
export class SemaforoPermissionsService {
  constructor(private permisos: PermisosService) {}

  private perfil(roles: string[]): string { return roles.length === 1 ? roles[0] : ''; }
  private filtro(nombre: string, roles: string[]): boolean {
    return this.permisos.permite(`paz_salvos_filtrar_${nombre}`, 'Acción', this.perfil(roles));
  }
  canUseCodigoFilter(roles: string[]): boolean { return this.filtro('codigo', roles); }
  canUseFacultadFilter(roles: string[]): boolean { return this.filtro('facultad', roles); }
  canUseProyectoFilter(roles: string[]): boolean { return this.filtro('proyecto', roles); }
  canUseAnioFilter(roles: string[]): boolean { return this.filtro('anio', roles); }
  canUsePeriodoFilter(roles: string[]): boolean { return this.filtro('periodo', roles); }

  canEditColumn(field: string, row: SemaforoRow, roles: string[]): boolean {
    const opcion = CAMPOS[field];
    if (!opcion || !this.permisos.permite(opcion, 'Acción', this.perfil(roles))) return false;
    return row.Orc === null || field === 'Orc' || field === 'ObservacionOrc';
  }

  canEditColumnIfOrcNull(field: string, row: SemaforoRow, roles: string[]): boolean {
    return this.canEditColumn(field, { ...row, Orc: null }, roles);
  }

  allDependenciesCleared(row: SemaforoRow, booleanFields: string[]): boolean {
    return booleanFields.filter(f => f !== 'Orc').every(f => !!row[f as keyof SemaforoRow]);
  }

  contextoConsulta(perfil: string): ContextoSemaforo | null {
    if (!this.permisos.permite('semaforo_paz_salvos', 'Menú', perfil) ||
      !this.permisos.permite('paz_salvos_consultar_semaforo', 'Botón', perfil)) return null;
    const encontrados = (Object.keys(CONTEXTOS) as ContextoSemaforo[])
      .filter(c => this.permisos.permite(CONTEXTOS[c], 'Acción', perfil));
    return encontrados.length === 1 ? encontrados[0] : null;
  }

  consultaPorProyectos(roles: string[]): boolean {
    const contexto = this.contextoConsulta(this.perfil(roles));
    return contexto === 'programas-asignados' || contexto === 'programa-coordinado';
  }

  shouldLoadProyectosFromFacultad(roles: string[]): boolean {
    const contexto = this.contextoConsulta(this.perfil(roles));
    return contexto === 'facultad' || contexto === 'laboratorios';
  }
}
