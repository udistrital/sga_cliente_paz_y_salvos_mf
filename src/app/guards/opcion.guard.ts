import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermisosService } from '../services/permisos.service';

export const opcionGuard: CanActivateFn = async route => {
  const permisos = inject(PermisosService);
  const router = inject(Router);
  for (let intento = 0; intento < 2; intento++) {
    try {
      await permisos.cargar(intento > 0);
      if (permisos.permite(route.data['opcion'], 'Menú')) return true;
      break;
    } catch {}
  }
  return router.createUrlTree(['/sin-acceso'], { queryParams: { destino: route.routeConfig?.path } });
};
