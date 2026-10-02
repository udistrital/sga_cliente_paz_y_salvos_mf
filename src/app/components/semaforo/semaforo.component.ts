import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { SemaforoRow } from '../../models/semaforo-row';
import { SemaforoFilters, CatalogoOption, ProyectoAsignado } from '../../models/semaforo-filters.model';
import { ApiResponse } from '../../models/api-response';
import { SemaforoPatchField, SemaforoRecord, SemaforosData } from '../../models/semaforo-api';
import { TranslateService } from '@ngx-translate/core';
import { GridApi } from 'ag-grid-community';
import { Subscription } from 'rxjs';

import { UserService } from '../../services/user.service';
import { SemaforoService } from '../../services/semaforo.service';
import { OikosService } from '../../services/oikos.service';
import { AlertService } from '../../services/alert.service';
import { SemaforoPermissionsService } from '../../services/semaforo-permissions.service';
import { SemaforoDataMapperService } from '../../services/semaforo-data-mapper.service';
import { SemaforoGridComponent } from './components/semaforo-grid/semaforo-grid.component';
import { PermisosService } from '../../services/permisos.service';

/**
 * Componente principal del Semáforo de Paz y Salvos
 * Orquesta los sub-componentes y gestiona el flujo de datos
 * 
 * Si el usuario tiene múltiples roles válidos para el módulo, 
 * primero se muestra un selector de roles antes de cargar el contenido
 */
@Component({
  selector: 'app-semaforo',
  templateUrl: './semaforo.component.html',
  styleUrl: './semaforo.component.scss'
})
export class SemaforoComponent implements OnInit, OnDestroy {
  @ViewChild(SemaforoGridComponent) gridComponent!: SemaforoGridComponent;

  // Estado de carga
  loading = false;
  userRoles: string[] = [];
  errorAcceso = '';
  private consultaDatos?: Subscription;
  private actualizacion?: Subscription;
  private cambioSesion?: Subscription;
  private cambioPermisos?: Subscription;
  private versionInicio = 0;
  private versionConsulta = 0;
  private destruido = false;

  // Selector de roles
  showRoleSelector = false;
  availableRoles: string[] = [];

  // Información del usuario
  userName: string = '';
  activeRoleDisplay: string = '';

  // Datos de la tabla
  rowData: SemaforoRow[] = [];
  filteredRowData: SemaforoRow[] = [];

  // Paginación
  currentPage = 0;
  pageSize = 20;
  totalRecords = 0;

  // Filtros
  filtersExpanded = false;
  filters: SemaforoFilters;

  // Catálogos
  facultades: CatalogoOption[] = [];
  proyectos: CatalogoOption[] = [];
  loadingFacultades = false;
  loadingProyectos = false;

  // Datos de proyectos asignados (usado por COORDINADOR, CONTRATISTA y ASIS_PROYECTO)
  esAsistente = false;
  proyectosAsignados: ProyectoAsignado[] = [];

  // Grid API reference
  private gridApi!: GridApi;

  constructor(
    private userService: UserService,
    private semaforoService: SemaforoService,
    private oikosService: OikosService,
    private alertService: AlertService,
    private translate: TranslateService,
    private permissionsService: SemaforoPermissionsService,
    private dataMapperService: SemaforoDataMapperService,
    public permisos: PermisosService
  ) {
    this.filters = this.dataMapperService.createEmptyFilters();
  }

  async ngOnInit() {
    this.addBeforeUnloadListener();
    this.cambioPermisos = this.permisos.cambios$.subscribe(() => {
      if (this.permisos.estado === 'listo') void this.checkAndInitializeRoles();
      else this.limpiarConsulta();
    });
    this.cambioSesion = this.permisos.sesionCambiada$.subscribe(() => {
      this.limpiarConsulta();
      this.userRoles = [];
      this.availableRoles = [];
      void this.checkAndInitializeRoles();
    });
    await this.checkAndInitializeRoles();
  }

  ngOnDestroy() {
    this.destruido = true;
    this.cambioSesion?.unsubscribe();
    this.cambioPermisos?.unsubscribe();
    this.limpiarConsulta();
    this.userService.clearSelectedRole();
    this.removeBeforeUnloadListener();
  }

  private beforeUnloadHandler = (): void => {
    this.userService.clearSelectedRole();
  };

  private addBeforeUnloadListener(): void {
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }

  private removeBeforeUnloadListener(): void {
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
  }

  // ============ GESTIÓN DE ROLES ============

  get perfilActual(): string { return this.userRoles.length === 1 ? this.userRoles[0] : ''; }
  get puedeConsultar(): boolean { return this.permissionsService.contextoConsulta(this.perfilActual) !== null; }
  get mostrarFiltros(): boolean {
    return this.permissionsService.canUseCodigoFilter(this.userRoles) || this.permissionsService.canUseFacultadFilter(this.userRoles) ||
      this.permissionsService.canUseProyectoFilter(this.userRoles) || this.permissionsService.canUseAnioFilter(this.userRoles) ||
      this.permissionsService.canUsePeriodoFilter(this.userRoles);
  }

  private limpiarConsulta(): void {
    this.versionConsulta++;
    this.consultaDatos?.unsubscribe();
    this.actualizacion?.unsubscribe();
    this.rowData = this.filteredRowData = [];
    this.totalRecords = 0;
    this.loading = false;
    this.loadingFacultades = this.loadingProyectos = false;
    this.facultades = this.proyectos = [];
    this.proyectosAsignados = [];
    this.filters = this.dataMapperService.createEmptyFilters();
    this.currentPage = 0;
    this.alertService.closeLoading();
  }

  revisarPerfiles(): void { void this.checkAndInitializeRoles(); }

  /**
   * Verifica si el usuario tiene múltiples roles y muestra el selector si es necesario
   */
  private async checkAndInitializeRoles() {
    const version = ++this.versionInicio;
    this.limpiarConsulta();
    this.errorAcceso = '';
    try {
      await this.permisos.cargar();
      if (this.destruido || version !== this.versionInicio) return;
      const userRoles = this.permisos.perfilesPara('semaforo_paz_salvos')
        .map(p => p.nombre).filter(p => this.permisos.permite('paz_salvos_consultar_semaforo', 'Botón', p));

      // Si no hay roles válidos, mostrar error
      if (userRoles.length === 0) {
        this.availableRoles = this.userRoles = [];
        this.showRoleSelector = false;
        this.errorAcceso = 'No tienes perfiles con acceso a esta consulta en Configuración.';
        return;
      }

      this.availableRoles = userRoles;

      const selectedRole = this.userService.getSelectedRole();
      if (selectedRole) {
        if (!this.availableRoles.includes(selectedRole)) {
          this.userService.clearSelectedRole();
        } else {
          this.userRoles = [selectedRole];
          this.showRoleSelector = false;
          await this.initializeModule();
          return;
        }
      }

      if (this.availableRoles.length === 1) {
        this.userRoles = this.availableRoles;
        this.showRoleSelector = false;
        await this.initializeModule();
        return;
      }

      // Si hay múltiples roles, mostrar selector
      this.userRoles = [];
      this.showRoleSelector = true;
    } catch (error) {
      if (this.destruido || version !== this.versionInicio) return;
      this.availableRoles = this.userRoles = [];
      this.showRoleSelector = false;
      this.errorAcceso = 'No fue posible verificar los perfiles autorizados. Reintenta los permisos.';
    }
  }

  /**
   * Maneja la selección de rol del usuario
   */
  onRoleSelected(role: string): void {
    if (!this.availableRoles.includes(role) || !this.permisos.permite('paz_salvos_seleccionar_perfil', 'Botón', role) ||
      !this.permisos.permite('paz_salvos_confirmar_perfil', 'Botón', role)) return;
    this.limpiarConsulta();
    this.userService.setSelectedRole(role);
    this.userRoles = [role];
    this.showRoleSelector = false;
    this.updateActiveRoleDisplay();
    this.initializeModule();
  }

  /**
   * Inicializa el módulo después de determinar el rol
   */
  private async initializeModule() {
    if (!this.puedeConsultar) {
      this.errorAcceso = 'El perfil no tiene un contexto de consulta único en Configuración.';
      return;
    }
    this.errorAcceso = '';
    await this.loadUserInfo();
    if (this.destruido || !this.puedeConsultar) return;
    if (this.permissionsService.canUseFacultadFilter(this.userRoles)) {
      await this.loadFacultades();
    }
    this.loadData();
  }

  // ============ GESTIÓN DE DATOS ============

  private async loadUserInfo() {
    try {
      await this.userService.getPersonaId();


      this.updateActiveRoleDisplay();
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  }

  /**
   * Actualiza el nombre del rol activo traducido
   */
  private updateActiveRoleDisplay() {
    this.activeRoleDisplay = this.perfilActual.replace(/_/g, ' ');
  }

  private async loadData() {
    if (!this.puedeConsultar || this.destruido) return;
    const version = ++this.versionConsulta;
    this.consultaDatos?.unsubscribe();
    const endpoint = await this.buildEndpoint();
    if (!endpoint || version !== this.versionConsulta || !this.puedeConsultar || this.destruido) return;

    this.loading = true;
    this.translate.get('SEMAFORO.cargando_estudiantes').subscribe(translation => {
      this.alertService.showLoading(translation);
    });

    this.filters = this.filtrosPermitidos(this.filters);
    const params = this.dataMapperService.buildQueryParams(this.filters, this.currentPage, this.pageSize);

    this.consultaDatos = this.semaforoService.get<SemaforosData>(endpoint, params).subscribe({
      next: response => { if (version === this.versionConsulta && this.puedeConsultar) this.handleLoadDataSuccess(response); },
      error: error => { if (version === this.versionConsulta && this.puedeConsultar) this.handleLoadDataError(error); }
    });
  }

  private async buildEndpoint(): Promise<string | null> {
    const roleType = this.permissionsService.contextoConsulta(this.perfilActual);
    if (!roleType) return null;

    try {
      switch (roleType) {
        case 'propio':
          const codigo = await this.userService.getCodigoEstudiante();
          return `semaforo/estudiante/${encodeURIComponent(codigo)}`;

        case 'programas-asignados':
          const cedulaAsisProyecto = await this.userService.getUserDocument();
          return `semaforo/asistente_proyecto/${encodeURIComponent(cedulaAsisProyecto)}`;

        case 'programa-coordinado':
          const idCoordinador = await this.userService.getUserDocument();
          return `semaforo/proyecto/${encodeURIComponent(idCoordinador)}`;

        case 'facultad':
          const idSecretario = await this.userService.getUserDocument();
          return `semaforo/facultad/${encodeURIComponent(idSecretario)}`;

        case 'laboratorios':
          const idJefe = await this.userService.getUserDocument();
          return `semaforo/laboratorios/${encodeURIComponent(idJefe)}`;

        case 'global':
          return 'semaforo';
      }
    } catch (error) {
      this.showEndpointError(roleType);
      return null;
    }
  }

  private showEndpointError(roleType: string) {
    const errorKeyMap: { [key: string]: string } = {
      'estudiante': 'SEMAFORO.error_codigo',
      'contratista': 'SEMAFORO.error_cedula',
      'asis_proyecto': 'SEMAFORO.error_cedula',
      'coordinador': 'SEMAFORO.error_id_coordinador',
      'secretario': 'SEMAFORO.error_id_secretario',
      'laboratorios': 'SEMAFORO.error_id_jefe'
    };

    const errorKey = errorKeyMap[roleType] || 'SEMAFORO.error_cargar_datos';
    this.translate.get(['GLOBAL.error', errorKey]).subscribe(translations => {
      this.alertService.showAlert(translations['GLOBAL.error'], translations[errorKey]);
    });
  }

  private handleLoadDataSuccess(response: ApiResponse<SemaforosData>) {
    const responseData = response.Data;

    if (this.permissionsService.consultaPorProyectos(this.userRoles)) {
      const proyectosData = this.dataMapperService.procesarProyectosAsignados(responseData);
      this.esAsistente = proyectosData.esAsistente;
      this.proyectosAsignados = proyectosData.proyectosAsignados;
      this.proyectos = proyectosData.proyectos;
    }

    // Extraer datos
    const data = responseData.Semaforos;
    this.totalRecords = responseData.TotalCount;

    if (!Array.isArray(data) || data.length === 0) {
      this.handleEmptyResponse();
      return;
    }

    this.rowData = this.dataMapperService.mapResponseToRowData(data);
    this.filteredRowData = this.rowData;

    // Cargar proyectos si es necesario
    if (this.permissionsService.shouldLoadProyectosFromFacultad(this.userRoles)) {
      this.loadProyectosFromFacultad(responseData);
    }

    this.loading = false;
    this.alertService.closeLoading();
  }

  private handleLoadDataError(error: ApiResponse<SemaforosData | null>) {
    if (error.Status === 404) {
      // Para contratistas, asistentes de proyecto y coordinadores
      if (error.Data && this.permissionsService.consultaPorProyectos(this.userRoles)) {
        const proyectosData = this.dataMapperService.procesarProyectosAsignados(error.Data);
        this.esAsistente = proyectosData.esAsistente;
        this.proyectosAsignados = proyectosData.proyectosAsignados;
        this.proyectos = proyectosData.proyectos;
      }
      this.handleEmptyResponse();
    } else {
      this.rowData = [];
      this.filteredRowData = [];
      this.totalRecords = 0;
      this.alertService.closeLoading();
      this.translate.get(['GLOBAL.error', 'SEMAFORO.error_cargar_datos']).subscribe(translations => {
        this.alertService.showAlert(translations['GLOBAL.error'], translations['SEMAFORO.error_cargar_datos']);
      });
      this.loading = false;
    }
  }

  private handleEmptyResponse(): void {
    this.rowData = [];
    this.filteredRowData = [];
    this.totalRecords = 0;
    this.loading = false;
    this.alertService.closeLoading();

    if (this.dataMapperService.hasActiveFilters(this.filters)) {
      this.translate.get(['SEMAFORO.sin_resultados', 'SEMAFORO.sin_resultados_filtros']).subscribe(translations => {
        this.alertService.showAlert(
          translations['SEMAFORO.sin_resultados'],
          translations['SEMAFORO.sin_resultados_filtros']
        );
      });
    } else {
      const textKey = this.permissionsService.consultaPorProyectos(this.userRoles)
        ? 'SEMAFORO.sin_estudiantes_proyectos'
        : 'SEMAFORO.sin_estudiantes_activos';

      this.translate.get(['SEMAFORO.sin_estudiantes', textKey]).subscribe(translations => {
        this.alertService.showAlert(
          translations['SEMAFORO.sin_estudiantes'],
          translations[textKey]
        );
      });
    }
  }

  // ============ EVENTOS DE SUB-COMPONENTES ============

  onRefreshClick(): void {
    if (!this.permisos.permite('paz_salvos_recargar', 'Botón', this.perfilActual)) return;
    this.currentPage = 0;
    this.loadData();
  }

  onFiltersChange(newFilters: SemaforoFilters): void {
    this.filters = this.filtrosPermitidos(newFilters);
  }

  private filtrosPermitidos(filtros: SemaforoFilters): SemaforoFilters {
    return {
      codigoEstudiante: this.permissionsService.canUseCodigoFilter(this.userRoles) ? filtros.codigoEstudiante : '',
      idFacultad: this.permissionsService.canUseFacultadFilter(this.userRoles) ? filtros.idFacultad : null,
      idProyecto: this.permissionsService.canUseProyectoFilter(this.userRoles) ? filtros.idProyecto : null,
      anioInsGrado: this.permissionsService.canUseAnioFilter(this.userRoles) ? filtros.anioInsGrado : null,
      perInsGrado: this.permissionsService.canUsePeriodoFilter(this.userRoles) ? filtros.perInsGrado : null
    };
  }

  onFacultadChange(facultadId: number | null): void {
    if (!this.permissionsService.canUseFacultadFilter(this.userRoles)) return;
    this.proyectos = [];
    if (facultadId) {
      this.loadProyectosByFacultad(facultadId);
    }
  }

  onSearchFilters(): void {
    if (!this.permisos.permite('paz_salvos_buscar', 'Botón', this.perfilActual)) return;
    this.currentPage = 0;
    this.loadData();
  }

  onClearFilters(): void {
    if (!this.permisos.permite('paz_salvos_limpiar_filtros', 'Botón', this.perfilActual)) return;
    this.filters = this.dataMapperService.createEmptyFilters();
    this.proyectos = [];
    this.currentPage = 0;
    this.loadData();
  }

  onCellValueChanged(event: any): void {
    this.saveRow(event.data, event.colDef?.field);
  }

  onCellClicked(event: { data: SemaforoRow, field: string }): void {
    this.saveRow(event.data, event.field);
  }

  onGridReady(gridApi: GridApi): void {
    this.gridApi = gridApi;
  }

  // ============ PAGINACIÓN ============

  onPageSizeChange(newSize: number): void {
    if (!this.permisos.permite('paz_salvos_paginar', 'Botón', this.perfilActual) || ![10, 20, 50, 100].includes(Number(newSize))) return;
    this.pageSize = Number(newSize);
    this.currentPage = 0;
    this.loadData();
  }

  onFirstPage(): void {
    if (!this.permisos.permite('paz_salvos_paginar', 'Botón', this.perfilActual)) return;
    this.currentPage = 0;
    this.loadData();
  }

  onPreviousPage(): void {
    if (!this.permisos.permite('paz_salvos_paginar', 'Botón', this.perfilActual) || this.currentPage <= 0) return;
    this.currentPage--;
    this.loadData();
  }

  onNextPage(): void {
    if (!this.permisos.permite('paz_salvos_paginar', 'Botón', this.perfilActual) || this.currentPage >= Math.ceil(this.totalRecords / this.pageSize) - 1) return;
    this.currentPage++;
    this.loadData();
  }

  onLastPage(): void {
    if (!this.permisos.permite('paz_salvos_paginar', 'Botón', this.perfilActual) || !this.totalRecords) return;
    this.currentPage = Math.ceil(this.totalRecords / this.pageSize) - 1;
    this.loadData();
  }

  // ============ GUARDADO DE CAMBIOS ============

  private saveRow(row: SemaforoRow, changedField?: string) {
    if (this.loading || !this.puedeConsultar || !changedField || !this.permissionsService.canEditColumn(changedField, row, this.userRoles)) return;

    this.loading = true;
    this.translate.get('SEMAFORO.guardando_cambios').subscribe(translation => {
      this.alertService.showLoading(translation);
    });

    const payload = this.dataMapperService.createPatchPayload(row, changedField);
    const version = this.versionConsulta;
    this.actualizacion = this.semaforoService.patch('semaforo', row.Id, payload).subscribe({
      next: response => { if (version === this.versionConsulta && this.puedeConsultar) this.handleSaveSuccess(response, row.Id, changedField); },
      error: error => { if (version === this.versionConsulta && this.puedeConsultar) this.handleSaveError(error, row.Id); }
    });
  }

  private handleSaveSuccess(response: ApiResponse<SemaforoRecord>, rowId: number, changedField?: string) {
    if (response?.Data && this.gridComponent) {
      if (changedField) {
        const field = changedField as SemaforoPatchField;
        this.gridComponent.updateCellValue(rowId, changedField, response.Data[field]);
      } else {
        const updatedRow = this.dataMapperService.mapResponseToRowData([response.Data])[0];
        this.gridComponent.updateRowData(rowId, updatedRow);
      }
    }
    this.loading = false;
    this.alertService.closeLoading();
  }

  private handleSaveError(error: ApiResponse<unknown>, rowId: number) {
    const version = this.versionConsulta;
    this.alertService.closeLoading();
    this.loading = false;

    if (error.Status === 409) {
      const errorMessage = error.Message || 'Conflicto de estado detectado';
      this.translate.get(['SEMAFORO.conflicto_estado', 'SEMAFORO.refrescando_datos']).subscribe(translations => {
        this.alertService.showAlert(
          translations['SEMAFORO.conflicto_estado'],
          errorMessage + '. ' + translations['SEMAFORO.refrescando_datos']
        ).then(() => { if (version === this.versionConsulta) this.loadData(); });
      });
    } else {
      this.translate.get(['GLOBAL.error', 'SEMAFORO.error_guardar']).subscribe(translations => {
        this.alertService.showAlert(translations['GLOBAL.error'], translations['SEMAFORO.error_guardar']).then(() => {
          if (version === this.versionConsulta) this.refreshRow(rowId);
        });
      });
    }
  }

  private refreshRow(rowId: number): void {
    if (!this.puedeConsultar) return;
    const version = this.versionConsulta;
    this.semaforoService.get<SemaforoRecord>(`semaforo/${rowId}`).subscribe({
      next: response => {
        if (version !== this.versionConsulta || !this.puedeConsultar) return;
        if (response?.Data && this.gridComponent) {
          const updatedRow = this.dataMapperService.mapResponseToRowData([response.Data])[0];
          this.gridComponent.updateRowData(rowId, updatedRow);
        }
      },
      error: () => this.loadData()
    });
  }

  // ============ CATÁLOGOS ============

  private async loadFacultades() {
    const version = this.versionInicio;
    this.loadingFacultades = true;
    this.oikosService.getFacultades().subscribe({
      next: (response: any) => {
        if (this.destruido || version !== this.versionInicio) return;
        const data = response.Data || response;
        if (Array.isArray(data)) {
          const facultadesData = data
            .map((item: any) => ({
              id: item.DependenciaId?.Id || item.Id,
              nombre: item.DependenciaId?.Nombre || item.Nombre
            }))
            .filter(f => f.id && f.nombre);

          this.facultades = [{ id: null, nombre: 'Todas' }, ...facultadesData];
        }
        this.loadingFacultades = false;
      },
      error: () => { this.loadingFacultades = false; }
    });
  }

  private loadProyectosByFacultad(idFacultad: number) {
    const version = this.versionInicio;
    this.loadingProyectos = true;
    this.oikosService.getProyectosByFacultad(idFacultad).subscribe({
      next: (response: any) => {
        if (this.destruido || version !== this.versionInicio) return;
        const data = response.Data || response;
        if (Array.isArray(data)) {
          const proyectosData = data
            .map((item: any) => ({
              id: item.DependenciaId?.Id || item.Id,
              nombre: item.DependenciaId?.Nombre || item.Nombre
            }))
            .filter(p => p.id && p.nombre);

          this.proyectos = [{ id: null, nombre: 'Todos' }, ...proyectosData];
        }
        this.loadingProyectos = false;
      },
      error: () => { this.loadingProyectos = false; }
    });
  }

  private loadProyectosFromFacultad(responseData: any) {
    const facultadId = responseData.IdFacultad ||
      responseData.FacultadId ||
      responseData.IdFacultadOikos ||
      (this.rowData.length > 0 ? this.rowData[0].IdFacultadOikos : null);

    if (facultadId) {
      this.loadProyectosByFacultad(facultadId);
    } else {
      this.proyectos = this.dataMapperService.extractProyectosFromData(this.rowData);
    }
  }
}
