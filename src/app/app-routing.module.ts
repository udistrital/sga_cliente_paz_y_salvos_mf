import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SemaforoComponent } from './components/semaforo/semaforo.component';
import { APP_BASE_HREF } from '@angular/common';
import { getSingleSpaExtraProviders } from 'single-spa-angular';
import { provideHttpClient, withFetch } from '@angular/common/http';

const routes: Routes = [
{
    path: 'semaforo',
//    canActivate: [AuthGuard],
    component: SemaforoComponent
},
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
