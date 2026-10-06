import { Injectable, OnDestroy } from '@angular/core';
import { firstValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { RequestManager } from '../managers/requestManager';
import { UserService } from './user.service';

export interface PerfilPermisos { id: number; nombre: string; }
type EstadoPermisos = 'inicial' | 'cargando' | 'listo' | 'error';

@Injectable({ providedIn: 'root' })
export class PermisosService implements OnDestroy {
  readonly cambios$ = new Subject<void>();
  readonly sesionCambiada$ = new Subject<void>();
  private estadoActual: EstadoPermisos = 'inicial';
  private errorActual = '';
  private clave = '';
  private identidad = '';
  private cancelarConsulta$ = new Subject<void>();
  private generacion = 0;
  private cargadoEn = 0;
  private pendiente?: Promise<void>;
  private perfilesActuales: PerfilPermisos[] = [];
  private opciones = new Map<string, Set<string>>();
  private readonly storageChanged = (event: StorageEvent) => {
    if (event.key === null || ['user', 'persona_id', 'access_token', 'id_token'].includes(event.key)) this.comprobarSesion();
  };

  constructor(private request: RequestManager, private usuario: UserService) {
    window.addEventListener('storage', this.storageChanged);
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.storageChanged);
    this.limpiar('');
    this.cambios$.complete();
    this.sesionCambiada$.complete();
    this.cancelarConsulta$.complete();
  }

  get estado(): EstadoPermisos { this.comprobarSesion(); return this.estadoActual; }
  get error(): string { this.comprobarSesion(); return this.errorActual; }

  private sesion(): string {
    const token = localStorage.getItem('access_token');
    const usuario = localStorage.getItem('user');
    return token && usuario ? JSON.stringify([token, usuario, localStorage.getItem('persona_id')]) : '';
  }

  private limpiar(clave: string): void {
    let identidad = '';
    if (clave) {
      const raw = localStorage.getItem('user') || '';
      try {
        const { user, userService } = JSON.parse(atob(raw));
        const datos = [user?.sub, user?.documento, user?.email, userService?.documento, userService?.email];
        identidad = datos.some(Boolean) ? JSON.stringify(datos) : raw;
      } catch { identidad = JSON.stringify([raw, localStorage.getItem('persona_id')]); }
    }
    const cambioIdentidad = identidad !== this.identidad;
    this.identidad = identidad;
    this.generacion++;
    this.clave = clave;
    this.pendiente = undefined;
    this.cargadoEn = 0;
    this.perfilesActuales = [];
    this.opciones.clear();
    this.estadoActual = 'inicial';
    this.errorActual = '';
    this.cancelarConsulta$.next();
    if (cambioIdentidad) {
      this.usuario.clearSelectedRole();
      // permite() también se evalúa desde templates: limpiar datos de los
      // componentes en el siguiente microtask evita mutarlos durante ese CD.
      const identidadActual = this.identidad;
      queueMicrotask(() => {
        if (this.identidad === identidadActual) this.sesionCambiada$.next();
      });
    }
    this.cambios$.next();
  }

  private comprobarSesion(): void {
    const clave = this.sesion();
    if (clave === this.clave) return;
    this.limpiar(clave);
    if (clave) void this.cargar().catch(() => undefined);
  }

  permite(nombre: string, tipo = 'Botón', perfil?: string): boolean {
    this.comprobarSesion();
    if (!this.clave || this.estadoActual !== 'listo') return false;
    const key = `${tipo}\u0000${nombre}`;
    if (perfil !== undefined) return this.opciones.get(perfil)?.has(key) === true;
    return [...this.opciones.values()].some(opciones => opciones.has(key));
  }

  perfilesPara(nombre: string, tipo = 'Menú'): PerfilPermisos[] {
    this.comprobarSesion();
    return this.perfilesActuales.filter(p => this.permite(nombre, tipo, p.nombre));
  }

  cargar(forzar = false): Promise<void> {
    const clave = this.sesion();
    if (clave !== this.clave) this.limpiar(clave);
    if (!clave) {
      this.estadoActual = 'error';
      this.errorActual = 'No hay una sesión disponible. Inicia sesión nuevamente.';
      this.cambios$.next();
      return Promise.reject(new Error(this.errorActual));
    }
    if (!forzar && this.pendiente) return this.pendiente;
    if (!forzar && this.estadoActual === 'listo' && Date.now() - this.cargadoEn < 60000) return Promise.resolve();
    const generacion = ++this.generacion;
    this.cancelarConsulta$.next();
    this.estadoActual = 'cargando';
    this.errorActual = '';
    this.opciones.clear();
    this.perfilesActuales = [];
    this.cambios$.next();
    const trabajo = this.consultar(clave, generacion).catch(error => {
      if (generacion === this.generacion && clave === this.sesion()) {
        this.estadoActual = 'error';
        this.errorActual = 'No fue posible verificar los permisos en Configuración. Reintenta la consulta.';
        this.cambios$.next();
      }
      throw error;
    }).finally(() => { if (this.pendiente === trabajo) this.pendiente = undefined; });
    this.pendiente = trabajo;
    return trabajo;
  }

  private async lista(recurso: string, query: string): Promise<any[]> {
    this.request.setPath('CONFIGURACION_SERVICE');
    const respuesta = await firstValueFrom(this.request.get(`${recurso}?${new URLSearchParams({ query, limit: '-1' })}`).pipe(takeUntil(this.cancelarConsulta$)));
    if (!Array.isArray(respuesta)) throw new Error('Respuesta de Configuración inválida');
    return respuesta;
  }

  private async consultar(clave: string, generacion: number): Promise<void> {
    const roles = await this.usuario.getUserRoles();
    if (clave !== this.sesion() || generacion !== this.generacion) throw new Error('La sesión cambió');
    if (!roles.length || roles.some(r => /[,:|]/.test(r))) throw new Error('Perfiles de sesión no verificables');
    const apps = await this.lista('aplicacion', `Nombre:${environment.CONFIGURACION_APLICACION},Estado:true`);
    if (clave !== this.sesion() || generacion !== this.generacion) throw new Error('La sesión cambió');
    const app = apps[0];
    if (apps.length !== 1 || app?.Nombre !== environment.CONFIGURACION_APLICACION || app.Estado !== true || !Number.isSafeInteger(app.Id) || app.Id <= 0) {
      throw new Error('Aplicación ausente o ambigua');
    }
    const filas = await this.lista('perfil_x_menu_opcion',
      `Perfil.Aplicacion.Id:${app.Id},Opcion.Aplicacion.Id:${app.Id},Perfil.Nombre__in:${roles.join('|')}`);
    const perfiles = new Map<string, PerfilPermisos>();
    const opciones = new Map<string, Set<string>>();
    const identidadesOpciones = new Map<string, number>();
    const nombresPorId = new Map<number, string>();
    for (const fila of filas) {
      const p = fila?.Perfil;
      const o = fila?.Opcion;
      if (!p || !o || typeof o.Nombre !== 'string') throw new Error('Asignación inválida');
      // SGA_MF comparte perfiles con otros módulos; sus opciones no autorizan
      // ni condicionan esta pantalla, incluso si contienen nombres duplicados.
      if (!['grados_paz_salvos', 'semaforo_paz_salvos', 'inscripciones_grado', 'revision_solicitudes_grado'].includes(o.Nombre) &&
        !o.Nombre.startsWith('grado_') && !o.Nombre.startsWith('paz_salvos_')) continue;
      if (!p || !o || p.Aplicacion?.Id !== app.Id || o.Aplicacion?.Id !== app.Id || !roles.includes(p.Nombre) ||
        !Number.isSafeInteger(p.Id) || p.Id <= 0 || !Number.isSafeInteger(o.Id) || o.Id <= 0 ||
        typeof o.Nombre !== 'string' || !o.Nombre.trim() || typeof o.TipoOpcion !== 'string' || !o.TipoOpcion.trim()) {
        throw new Error('Asignación fuera de la aplicación o sesión');
      }
      if (perfiles.has(p.Nombre) && perfiles.get(p.Nombre)!.id !== p.Id) throw new Error('Perfil ambiguo');
      if (identidadesOpciones.has(o.Nombre) && identidadesOpciones.get(o.Nombre) !== o.Id) throw new Error('Opción ambigua');
      const key = `${o.TipoOpcion}\u0000${o.Nombre}`;
      if (nombresPorId.has(o.Id) && nombresPorId.get(o.Id) !== key) throw new Error('Opción inconsistente');
      identidadesOpciones.set(o.Nombre, o.Id);
      nombresPorId.set(o.Id, key);
      perfiles.set(p.Nombre, { id: p.Id, nombre: p.Nombre });
      if (!opciones.has(p.Nombre)) opciones.set(p.Nombre, new Set());
      opciones.get(p.Nombre)!.add(key);
    }
    if (clave !== this.sesion() || generacion !== this.generacion) throw new Error('La sesión cambió durante la consulta');
    this.perfilesActuales = [...perfiles.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
    this.opciones = opciones;
    this.estadoActual = 'listo';
    this.cargadoEn = Date.now();
    this.cambios$.next();
  }
}
