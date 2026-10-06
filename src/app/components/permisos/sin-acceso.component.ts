import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { PermisosService } from '../../services/permisos.service';

@Component({ standalone: true, imports: [CommonModule, MatButtonModule, RouterLink],
  template: `<main style="padding:24px">
    <h1>Acceso a Grados y Paz y Salvos</h1>
    <p role="alert">{{ permisos.error || 'Tu perfil no tiene asignada esta opción en Configuración.' }}</p>
    <button mat-button type="button" (click)="reintentar()" [disabled]="permisos.estado === 'cargando'">Reintentar acceso</button>
    <a *ngIf="permisos.permite('semaforo_paz_salvos', 'Menú')" mat-button routerLink="/semaforo">Consultar semáforo</a>
  </main>`
})
export class SinAccesoComponent {
  constructor(public permisos: PermisosService, private route: ActivatedRoute, private router: Router) {}
  reintentar(): void {
    const destino = this.route.snapshot.queryParamMap.get('destino');
    if (['semaforo', 'inscripcion-grado', 'revision-solicitudes-grado'].includes(destino || '')) {
      void this.router.navigate(['/' + destino]);
    }
  }
}
