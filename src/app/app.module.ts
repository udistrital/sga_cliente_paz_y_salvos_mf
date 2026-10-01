import { NgModule, Component } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

// Angular Material
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { NgSelectModule } from '@ng-select/ng-select';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SemaforoComponent } from './components/semaforo/semaforo.component';
import { SemaforoFiltersComponent } from './components/semaforo/components/semaforo-filters/semaforo-filters.component';
import { SemaforoGridComponent } from './components/semaforo/components/semaforo-grid/semaforo-grid.component';
import { SemaforoPaginationComponent } from './components/semaforo/components/semaforo-pagination/semaforo-pagination.component';
import { RoleSelectorComponent } from './components/semaforo/components/role-selector/role-selector.component';
import { AgGridModule } from "ag-grid-angular";
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
    AppComponent,
    SemaforoComponent,
    SemaforoFiltersComponent,
    SemaforoGridComponent,
    SemaforoPaginationComponent,
    RoleSelectorComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    OpcionDirective,
    EstadoPermisosComponent,
    BrowserAnimationsModule,
    AppRoutingModule,
    AgGridModule,
    HttpClientModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatExpansionModule,
    NgSelectModule,
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
