import { Component, Input, Output, EventEmitter } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { RoleInfo, getRoleInfo } from '../../../../constants/roles.constants';

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

  constructor(private translate: TranslateService) {}

  /**
   * Obtiene la información de un rol para mostrar su traducción
   */
  getRoleDisplayName(roleCode: string): string {
    const roleInfo = getRoleInfo(roleCode);
    if (roleInfo) {
      return this.translate.instant(roleInfo.translationKey);
    }
    return roleCode;
  }

  /**
   * Obtiene la descripción de un rol
   */
  getRoleDescription(roleCode: string): string {
    const roleInfo = getRoleInfo(roleCode);
    return roleInfo?.description || '';
  }

  /**
   * Maneja la selección de un rol
   */
  onRoleSelect(role: string): void {
    this.selectedRole = role;
  }

  /**
   * Confirma y emite el rol seleccionado
   */
  onConfirmRole(): void {
    if (this.selectedRole) {
      this.roleSelected.emit(this.selectedRole);
    }
  }

  /**
   * Verifica si se puede confirmar (hay un rol seleccionado)
   */
  canConfirm(): boolean {
    return !!this.selectedRole;
  }
}
