import { NgModule, Component } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

// Angular Material
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SemaforoComponent } from './components/semaforo/semaforo.component';
import { AgGridModule } from "ag-grid-angular";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { UserService } from './services/user.service';
import { HttpClientModule } from '@angular/common/http';
ModuleRegistry.registerModules([AllCommunityModule]);
@NgModule({
  declarations: [
    AppComponent,
    SemaforoComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    AgGridModule,
    HttpClientModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  providers: [
    UserService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }