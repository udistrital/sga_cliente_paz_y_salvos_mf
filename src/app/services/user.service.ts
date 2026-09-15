import { Injectable } from "@angular/core";
import { uniq as _uniq } from "lodash";
import { decrypt } from "../utils/util-encrypt";
import { filtrarRolesDelModulo } from "../constants/roles.constants";

@Injectable()
export class UserService {
    private readonly SELECTED_ROLE_KEY = 'paz_y_salvos_selected_role';

    constructor() { }

    public getPersonaId(): Promise<number> {
        return new Promise((resolve, reject) => {
            const strcryptedId = localStorage.getItem('persona_id');
            if (strcryptedId != null) {
                const strId = decrypt(strcryptedId);
                if (strId) {
                    resolve(parseInt(strId, 10));
                } else {
                    reject(new Error('No id found'));
                }
            } else {
                reject(new Error('No persona_id found'));
            }
        });
    }

    // Nueva función para obtener el código del estudiante
    public getCodigoEstudiante(): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                const { user, userService } = this.decodeUser();
                ;
                if (user.Codigo) {
                    resolve(user.Codigo);
                } else if (userService.Codigo) {
                    resolve(userService.Codigo);
                } else {
                    reject(new Error("No Codigo found"));
                }
            } catch (error) {
                reject(error);
            }
        });
    }


    private decodeUser(): any {
        const strUser = localStorage.getItem("user");
        if (strUser === null || strUser === "") {
            throw new Error("No user information found");
        } else {
            try {
                const strdecoded = atob(strUser);
                const parsed = JSON.parse(strdecoded);
                if (parsed.user && parsed.userService) {
                    return parsed;
                } else {
                    throw new Error("Incomplete user information");
                }
            } catch (error) {
                throw new Error("Invalid user information: " + error);
            }
        }
    }

    public getUserRoles(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            try {
                const { user, userService } = this.decodeUser();
                const roleUser = typeof user.role !== 'undefined' ? user.role as string[] : [];
                const roleUserService = typeof userService.role !== 'undefined' ? userService.role as string[] : [];
                const roles = _uniq(roleUser.concat(roleUserService)).filter((data: string) => !data.includes('/'));
                resolve(roles);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Obtiene todos los roles del usuario filtrados para el módulo de Paz y Salvos
     * Si no hay sesión válida, limpia el rol seleccionado
     */
    public getUserModuleRoles(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            this.getUserRoles()
                .then(roles => {
                    const moduloRoles = filtrarRolesDelModulo(roles);
                    resolve(moduloRoles);
                })
                .catch(error => {
                    // Si hay error (ej: no hay sesión), limpiar el rol seleccionado
                    this.clearSelectedRole();
                    reject(error);
                });
        });
    }

    /**
     * Obtiene el rol efectivo del usuario para el módulo
     * Si hay un rol guardado en sesión, lo retorna
     * Si no, retorna todos los roles del módulo
     */
    public getEffectiveRole(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const selectedRole = this.getSelectedRole();
            if (selectedRole) {
                resolve([selectedRole]);
            } else {
                this.getUserModuleRoles()
                    .then(roles => resolve(roles))
                    .catch(error => reject(error));
            }
        });
    }

    /**
     * Guarda el rol seleccionado por el usuario en la sesión actual
     */
    public setSelectedRole(role: string): void {
        sessionStorage.setItem(this.SELECTED_ROLE_KEY, role);
    }

    /**
     * Obtiene el rol seleccionado de la sesión
     */
    public getSelectedRole(): string | null {
        return sessionStorage.getItem(this.SELECTED_ROLE_KEY);
    }

    /**
     * Limpia el rol seleccionado de la sesión
     */
    public clearSelectedRole(): void {
        sessionStorage.removeItem(this.SELECTED_ROLE_KEY);
    }

    /**
     * Verifica si el usuario tiene múltiples roles válidos para el módulo
     */
    public hasMultipleModuleRoles(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.getUserModuleRoles()
                .then(roles => resolve(roles.length > 1))
                .catch(error => reject(error));
        });
    }

    public getUserEmail(): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                const { user, userService } = this.decodeUser();
                if (user.email) {
                    resolve(user.email);
                } else if (userService.email) {
                    resolve(userService.email);
                } else {
                    reject(new Error("No email found"));
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    public getUserDocument(compuesto: boolean = false): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                const { user, userService } = this.decodeUser();
                const documentToSearch = compuesto ? 'documento_compuesto' : 'documento';
                if (user[documentToSearch]) {
                    resolve(user[documentToSearch]);
                } else if (userService[documentToSearch]) {
                    resolve(userService[documentToSearch]);
                } else {
                    reject(new Error("No document found"));
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    public getUserFacultad(): Promise<number | null> {
        return new Promise((resolve, reject) => {
            try {
                const { user, userService } = this.decodeUser();
                const facultadId = user.IdFacultad || userService.IdFacultad || 
                                   user.FacultadId || userService.FacultadId ||
                                   user.id_facultad || userService.id_facultad ||
                                   user.IdDependencia || userService.IdDependencia ||
                                   user.DependenciaId || userService.DependenciaId ||
                                   user.dependencia_id || userService.dependencia_id;
                if (facultadId) {
                    resolve(parseInt(String(facultadId), 10));
                } else {
                    resolve(null);
                }
            } catch (error) {
                reject(error);
            }
        });
    }
}