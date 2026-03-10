/**
 * Constantes de roles del módulo de Paz y Salvos
 * Define los roles que tienen acceso a funcionalidades específicas
 */

export interface RoleInfo {
  code: string;
  translationKey: string;
  description: string;
}

/**
 * Lista de roles válidos para el módulo de Paz y Salvos
 * Solo estos roles aparecerán en el selector cuando un usuario tenga múltiples roles
 */
export const MODULO_PAZ_Y_SALVOS_ROLES: RoleInfo[] = [
  {
    code: 'ESTUDIANTE',
    translationKey: 'ROLES.estudiante',
    description: 'Consulta su propio estado de paz y salvo'
  },
  {
    code: 'COORDINADOR',
    translationKey: 'ROLES.coordinador',
    description: 'Aprueba paz y salvo académico de sus proyectos curriculares'
  },
  {
    code: 'CONTRATISTA',
    translationKey: 'ROLES.contratista',
    description: 'Aprueba paz y salvo académico de proyectos asignados'
  },
  {
    code: 'ASIS_PROYECTO',
    translationKey: 'ROLES.asis_proyecto',
    description: 'Asistente de proyecto - Aprueba paz y salvo académico de proyectos asignados'
  },
  {
    code: 'SECRETARIA_ACADEMICA',
    translationKey: 'ROLES.secretario',
    description: 'Consulta paz y salvos de su facultad'
  },
  {
    code: 'LABORATORIOS',
    translationKey: 'ROLES.jefe_laboratorios',
    description: 'Aprueba paz y salvo de laboratorios'
  },
  {
    code: 'BIBLIOTECA',
    translationKey: 'ROLES.biblioteca',
    description: 'Aprueba paz y salvo de biblioteca'
  },
  {
    code: 'ADMIN_BIENESTAR',
    translationKey: 'ROLES.bienestar',
    description: 'Aprueba paz y salvo de bienestar'
  },
  {
    code: 'URELINTER',
    translationKey: 'ROLES.urelinter',
    description: 'Aprueba paz y salvo de URELINTER'
  },
  {
    code: 'ADMISIONES_REG',
    translationKey: 'ROLES.admisiones',
    description: 'Aprueba paz y salvo de Registro y Control'
  },
  {
    code: 'ASIS_FINANCIERA',
    translationKey: 'ROLES.asis_financiera',
    description: 'Aprueba paz y salvo financiero'
  }
];

/**
 * Obtiene los códigos de roles válidos para el módulo
 */
export function getModuloRolesCodes(): string[] {
  return MODULO_PAZ_Y_SALVOS_ROLES.map(role => role.code);
}

/**
 * Verifica si un rol es válido para el módulo de Paz y Salvos
 */
export function isRolValidoParaModulo(roleCode: string): boolean {
  return getModuloRolesCodes().includes(roleCode);
}

/**
 * Filtra una lista de roles para obtener solo los válidos para el módulo
 */
export function filtrarRolesDelModulo(roles: string[]): string[] {
  const rolesModulo = getModuloRolesCodes();
  return roles.filter(role => rolesModulo.includes(role));
}

/**
 * Obtiene información de un rol por su código
 */
export function getRoleInfo(roleCode: string): RoleInfo | undefined {
  return MODULO_PAZ_Y_SALVOS_ROLES.find(role => role.code === roleCode);
}
