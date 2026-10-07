import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { PermisosService } from '../../services/permisos.service';

@Component({
  selector: 'app-perfil-selector',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, TranslateModule],
  templateUrl: './perfil-selector.component.html',
  styleUrls: ['./perfil-selector.component.scss']
})
export class PerfilSelectorComponent {
  @Input() perfiles: string[] = [];
  @Output() perfilSeleccionado = new EventEmitter<string>();
  perfil = '';

  constructor(public permisos: PermisosService) {}

  nombre(perfil: string): string { return perfil.replace(/_/g, ' '); }

  puedeSeleccionar(perfil: string): boolean {
    return this.perfiles.includes(perfil) &&
      this.permisos.permite('paz_salvos_seleccionar_perfil', 'Botón', perfil);
  }

  seleccionar(perfil: string): void {
    if (this.puedeSeleccionar(perfil)) this.perfil = perfil;
  }

  puedeConfirmar(): boolean {
    return this.puedeSeleccionar(this.perfil) &&
      this.permisos.permite('paz_salvos_confirmar_perfil', 'Botón', this.perfil);
  }

  confirmar(): void {
    if (this.puedeConfirmar()) this.perfilSeleccionado.emit(this.perfil);
  }
}
