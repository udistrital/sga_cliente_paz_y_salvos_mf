import { CanDeactivateFn } from '@angular/router';

export interface ComponenteConCambiosPendientes {
  puedeSalir(): boolean | Promise<boolean>;
}

export const cambiosSinGuardarGuard: CanDeactivateFn<ComponenteConCambiosPendientes> = component => component.puedeSalir();
