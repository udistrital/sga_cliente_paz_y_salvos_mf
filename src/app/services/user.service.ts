import { Injectable } from "@angular/core";
import { decrypt } from "../utils/util-encrypt";

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

    public async getUserRoles(): Promise<string[]> {
        const { user, userService } = this.decodeUser();
        const lista = (valor: unknown): string[] => {
            const valores = Array.isArray(valor) ? valor : typeof valor === 'string' ? valor.split(',') : [];
            return valores.filter((r): r is string => typeof r === 'string').map(r => r.trim()).filter(Boolean);
        };
        let rolesToken: string[] = [];
        try {
            const segmento = localStorage.getItem('id_token')?.split('.')[1];
            if (segmento) {
                const base64 = segmento.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(segmento.length / 4) * 4, '=');
                rolesToken = lista(JSON.parse(atob(base64)).role);
            }
        } catch { rolesToken = []; }
        return [...new Set([...lista(user.role), ...lista(userService.role), ...rolesToken])];
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
