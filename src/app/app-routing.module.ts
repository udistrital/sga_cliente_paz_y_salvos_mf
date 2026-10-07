import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { APP_BASE_HREF } from '@angular/common';
import { getSingleSpaExtraProviders } from 'single-spa-angular';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { opcionGuard } from './guards/opcion.guard';
import { cambiosSinGuardarGuard } from './guards/cambios-sin-guardar.guard';

const routes: Routes = [
  {
    path: 'inscripcion-grado',
    canActivate: [opcionGuard],
    canDeactivate: [cambiosSinGuardarGuard],
    data: { opcion: 'inscripciones_grado' },
    loadComponent: () => import('./components/inscripcion-grado/inscripcion-grado.component').then(m => m.InscripcionGradoComponent)
  },
  {
    path: 'revision-solicitudes-grado',
    canActivate: [opcionGuard],
    data: { opcion: 'revision_solicitudes_grado' },
    loadComponent: () => import('./components/revision-documental-grado/revision-documental-grado.component').then(m => m.RevisionDocumentalGradoComponent)
  },
  {
	path: 'paz-salvos-grado',
	canActivate: [opcionGuard],
	data: { opcion: 'semaforo_paz_salvos' },
	loadComponent: () => import('./components/paz-salvos-grado/paz-salvos-grado.component').then(m => m.PazSalvosGradoComponent)
  },
  {
    path: 'semaforo',
    redirectTo: 'paz-salvos-grado',
    pathMatch: 'full'
  },
  { path: 'sin-acceso', loadComponent: () => import('./components/permisos/sin-acceso.component').then(m => m.SinAccesoComponent) },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [
    { provide: APP_BASE_HREF, useValue: '/paz-y-salvos/' },
    ...getSingleSpaExtraProviders(),
    provideHttpClient(withFetch())
  ]
})
export class AppRoutingModule { }
