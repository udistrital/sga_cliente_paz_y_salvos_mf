import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermisosService } from '../services/permisos.service';

export const opcionGuard: CanActivateFn = async route => {
  const permisos = inject(PermisosService);
  const router = inject(Router);
  try {
    await permisos.cargar(true);
    if (permisos.permite(route.data['opcion'], 'Menú')) return true;
  } catch { /* La pantalla de acceso muestra el error de Configuración. */ }
  return router.createUrlTree(['/sin-acceso'], { queryParams: { destino: route.routeConfig?.path } });
};
