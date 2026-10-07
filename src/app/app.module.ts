import { NgModule, Component } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { UserService } from './services/user.service';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { environment } from '../environments/environment';
import { OpcionDirective } from './directives/opcion.directive';
import { EstadoPermisosComponent } from './components/permisos/estado-permisos.component';

// Función para crear el loader de traducciones
export function createTranslateLoader(http: HttpClient) {
  const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const baseUrl = local ? `${window.location.origin}/` : environment.apiUrl;
  return new TranslateHttpLoader(http, baseUrl + 'assets/i18n/', `.json?v=${Date.now()}`);
}

ModuleRegistry.registerModules([AllCommunityModule]);
@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    OpcionDirective,
    EstadoPermisosComponent,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient]
      }
    })
  ],
  providers: [
    UserService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
