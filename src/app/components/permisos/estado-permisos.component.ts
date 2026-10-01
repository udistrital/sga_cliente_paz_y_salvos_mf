import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { PermisosService } from '../../services/permisos.service';

@Component({ selector: 'app-estado-permisos', standalone: true, imports: [CommonModule, MatButtonModule],
  template: `
    <div aria-live="polite" [attr.aria-busy]="permisos.estado === 'cargando'">
      <p *ngIf="permisos.estado === 'cargando'" role="status">Consultando permisos…</p>
      <p *ngIf="permisos.error" role="alert">{{ permisos.error }}</p>
      <button mat-button type="button" (click)="actualizar()" [disabled]="permisos.estado === 'cargando'">
        {{ permisos.estado === 'error' ? 'Reintentar permisos' : 'Actualizar permisos' }}
      </button>
    </div>`
})
export class EstadoPermisosComponent {
  @Output() actualizados = new EventEmitter<void>();
  constructor(public permisos: PermisosService) {}
  async actualizar(): Promise<void> {
    try { await this.permisos.cargar(true); } catch { /* Estado visible en el servicio. */ }
    this.actualizados.emit();
  }
}
