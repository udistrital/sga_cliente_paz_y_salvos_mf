import { Component, Input, Output, EventEmitter } from '@angular/core';
import { PermisosService } from '../../../../services/permisos.service';

/**
 * Componente de selección de rol
 * Se muestra cuando el usuario tiene múltiples roles válidos para el módulo
 */
@Component({
  selector: 'app-role-selector',
  templateUrl: './role-selector.component.html',
  styleUrls: ['./role-selector.component.scss']
})
export class RoleSelectorComponent {
  @Input() availableRoles: string[] = [];
  @Output() roleSelected = new EventEmitter<string>();

  selectedRole: string = '';

  constructor(public permisos: PermisosService) {}

  /**
   * Obtiene la información de un rol para mostrar su traducción
   */
  getRoleDisplayName(roleCode: string): string {
    return roleCode.replace(/_/g, ' ');
  }

  /**
   * Obtiene la descripción de un rol
   */
  getRoleDescription(roleCode: string): string {
    return this.permisos.permite('semaforo_paz_salvos', 'Menú', roleCode) ? 'Perfil autorizado en Configuración' : '';
  }

  puedeSeleccionar(role: string): boolean {
    return this.availableRoles.includes(role) && this.permisos.permite('paz_salvos_seleccionar_perfil', 'Botón', role);
  }

  /**
   * Maneja la selección de un rol
   */
  onRoleSelect(role: string): void {
    if (!this.puedeSeleccionar(role)) return;
    this.selectedRole = role;
  }

  /**
   * Confirma y emite el rol seleccionado
   */
  onConfirmRole(): void {
    if (this.canConfirm()) {
      this.roleSelected.emit(this.selectedRole);
    }
  }

  /**
   * Verifica si se puede confirmar (hay un rol seleccionado)
   */
  canConfirm(): boolean {
    return this.puedeSeleccionar(this.selectedRole) && this.permisos.permite('paz_salvos_confirmar_perfil', 'Botón', this.selectedRole);
  }
}
