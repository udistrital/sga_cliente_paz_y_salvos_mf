import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { SemaforoRow } from '../../models/semaforo-row';
import { SemaforoFilters, CatalogoOption, ProyectoAsignado } from '../../models/semaforo-filters.model';
import { TranslateService } from '@ngx-translate/core';
import { GridApi } from 'ag-grid-community';

import { UserService } from '../../services/user.service';
import { SemaforoService } from '../../services/semaforo.service';
import { OikosService } from '../../services/oikos.service';
import { AlertService } from '../../services/alert.service';
import { SemaforoPermissionsService } from '../../services/semaforo-permissions.service';
import { SemaforoDataMapperService } from '../../services/semaforo-data-mapper.service';
import { SemaforoGridComponent } from './components/semaforo-grid/semaforo-grid.component';
import { getRoleInfo } from '../../constants/roles.constants';

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
    private dataMapperService: SemaforoDataMapperService
  ) {
    this.filters = this.dataMapperService.createEmptyFilters();
  }

  async ngOnInit() {
    this.addBeforeUnloadListener();
    await this.checkAndInitializeRoles();
  }

  ngOnDestroy() {
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

  private normalizeRolesForDisplay(roles: string[]): string[] {
    const hasContratista = roles.includes('CONTRATISTA');
    const hasAsisProyecto = roles.includes('ASIS_PROYECTO');

    // Si tiene ambos o solo CONTRATISTA, reemplazar por ASIS_PROYECTO
    if (hasContratista || hasAsisProyecto) {
      const normalizedRoles = roles.filter(r => r !== 'CONTRATISTA' && r !== 'ASIS_PROYECTO');
      normalizedRoles.push('ASIS_PROYECTO');
      return normalizedRoles;
    }

    return roles;
  }

  /**
   * Verifica si el usuario tiene múltiples roles y muestra el selector si es necesario
   */
  private async checkAndInitializeRoles() {
    try {
      // Obtener roles válidos para el módulo
      const userRoles = await this.userService.getUserModuleRoles();

      // Si no hay roles válidos, mostrar error
      if (userRoles.length === 0) {
        this.translate.get(['GLOBAL.error', 'SEMAFORO.sin_acceso_modulo']).subscribe(translations => {
          this.alertService.showAlert(translations['GLOBAL.error'], translations['SEMAFORO.sin_acceso_modulo']);
        });
        return;
      }

      this.availableRoles = this.normalizeRolesForDisplay(userRoles);

      const selectedRole = this.userService.getSelectedRole();
      if (selectedRole) {
        const normalizedSelected = selectedRole === 'CONTRATISTA' ? 'ASIS_PROYECTO' : selectedRole;

        if (!this.availableRoles.includes(normalizedSelected)) {
          this.userService.clearSelectedRole();
        } else {
          this.userRoles = [normalizedSelected];
          await this.initializeModule();
          return;
        }
      }

      if (this.availableRoles.length === 1) {
        this.userRoles = this.availableRoles;
        await this.initializeModule();
        return;
      }

      // Si hay múltiples roles, mostrar selector
      this.showRoleSelector = true;
    } catch (error) {
      console.error('Error checking roles:', error);
      this.translate.get(['GLOBAL.error', 'SEMAFORO.error_cargar_datos']).subscribe(translations => {
        this.alertService.showAlert(translations['GLOBAL.error'], translations['SEMAFORO.error_cargar_datos']);
      });
    }
  }

  /**
   * Maneja la selección de rol del usuario
   */
  onRoleSelected(role: string): void {
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
    await this.loadUserInfo();

    if (this.userRoles.includes('CONTRATISTA') || 
        this.userRoles.includes('ASIS_PROYECTO') || 
        this.userRoles.includes('COORDINADOR')) {
      this.loadData();
    } else {
      await this.loadFacultades();
      this.loadData();
    }
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
    if (this.userRoles.length > 0) {
      const roleCode = this.userRoles[0];
      const roleInfo = getRoleInfo(roleCode);
      if (roleInfo) {
        this.translate.get(roleInfo.translationKey).subscribe(translation => {
          this.activeRoleDisplay = translation;
        });
      } else {
        this.activeRoleDisplay = roleCode;
      }
    }
  }

  private async loadData() {
    const endpoint = await this.buildEndpoint();
    if (!endpoint) return;

    this.loading = true;
    this.translate.get('SEMAFORO.cargando_estudiantes').subscribe(translation => {
      this.alertService.showLoading(translation);
    });

    const params = this.dataMapperService.buildQueryParams(this.filters, this.currentPage, this.pageSize);

    this.semaforoService.get(endpoint, params).subscribe({
      next: response => this.handleLoadDataSuccess(response),
      error: error => this.handleLoadDataError(error)
    });
  }

  private async buildEndpoint(): Promise<string | null> {
    const roleType = this.permissionsService.getEndpointForRole(this.userRoles);

    try {
      switch (roleType) {
        case 'estudiante':
          const codigo = await this.userService.getCodigoEstudiante();
          return `semaforo/estudiante/${codigo}`;

        case 'asis_proyecto':
          const cedulaAsisProyecto = await this.userService.getUserDocument();
          return `semaforo/asistente_proyecto/${cedulaAsisProyecto}`;

        case 'coordinador':
          const idCoordinador = await this.userService.getUserDocument();
          return `semaforo/proyecto/${idCoordinador}`;

        case 'secretario':
          const idSecretario = await this.userService.getUserDocument();
          return `semaforo/facultad/${idSecretario}`;

        case 'laboratorios':
          const idJefe = await this.userService.getUserDocument();
          return `semaforo/laboratorios/${idJefe}`;

        default:
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

  private handleLoadDataSuccess(response: any) {
    const responseData = response.Data || response;

    if (this.userRoles.includes('CONTRATISTA') || 
        this.userRoles.includes('ASIS_PROYECTO') || 
        this.userRoles.includes('COORDINADOR')) {
      const proyectosData = this.dataMapperService.procesarProyectosAsignados(responseData);
      this.esAsistente = proyectosData.esAsistente;
      this.proyectosAsignados = proyectosData.proyectosAsignados;
      this.proyectos = proyectosData.proyectos;
    }

    // Extraer datos
    const data = responseData.Semaforos || responseData.Data || responseData;
    this.totalRecords = responseData.TotalCount || 0;

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

  private handleLoadDataError(error: any) {
    if (error.Status === 404) {
      // Para contratistas, asistentes de proyecto y coordinadores
      if (error?.Data && (this.userRoles.includes('CONTRATISTA') || 
                          this.userRoles.includes('ASIS_PROYECTO') || 
                          this.userRoles.includes('COORDINADOR'))) {
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
      const textKey = (this.userRoles.includes('CONTRATISTA') || 
                       this.userRoles.includes('ASIS_PROYECTO') || 
                       this.userRoles.includes('COORDINADOR'))
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
    this.currentPage = 0;
    this.loadData();
  }

  onFiltersChange(newFilters: SemaforoFilters): void {
    this.filters = newFilters;
  }

  onFacultadChange(facultadId: number | null): void {
    this.proyectos = [];
    if (facultadId) {
      this.loadProyectosByFacultad(facultadId);
    }
  }

  onSearchFilters(): void {
    this.currentPage = 0;
    this.loadData();
  }

  onClearFilters(): void {
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
    this.pageSize = newSize;
    this.currentPage = 0;
    this.loadData();
  }

  onFirstPage(): void {
    this.currentPage = 0;
    this.loadData();
  }

  onPreviousPage(): void {
    this.currentPage--;
    this.loadData();
  }

  onNextPage(): void {
    this.currentPage++;
    this.loadData();
  }

  onLastPage(): void {
    this.currentPage = Math.ceil(this.totalRecords / this.pageSize) - 1;
    this.loadData();
  }

  // ============ GUARDADO DE CAMBIOS ============

  private saveRow(row: SemaforoRow, changedField?: string) {
    if (this.loading) return;

    this.loading = true;
    this.translate.get('SEMAFORO.guardando_cambios').subscribe(translation => {
      this.alertService.showLoading(translation);
    });

    const payload = this.dataMapperService.createPatchPayload(row, changedField);

    this.semaforoService.patch('semaforo', row.Id, payload).subscribe({
      next: response => this.handleSaveSuccess(response, row.Id, changedField),
      error: error => this.handleSaveError(error, row.Id)
    });
  }

  private handleSaveSuccess(response: any, rowId: number, changedField?: string) {
    if (response?.Data && this.gridComponent) {
      if (changedField) {
        this.gridComponent.updateCellValue(rowId, changedField, response.Data[changedField]);
      } else {
        const updatedRow = this.dataMapperService.mapResponseToRowData([response.Data])[0];
        this.gridComponent.updateRowData(rowId, updatedRow);
      }
    }
    this.loading = false;
    this.alertService.closeLoading();
  }

  private handleSaveError(error: any, rowId: number) {
    this.alertService.closeLoading();
    this.loading = false;

    if (error.status === 409 || error.Status === '409') {
      const errorMessage = error.error?.Message || error.Message || 'Conflicto de estado detectado';
      this.translate.get(['SEMAFORO.conflicto_estado', 'SEMAFORO.refrescando_datos']).subscribe(translations => {
        this.alertService.showAlert(
          translations['SEMAFORO.conflicto_estado'],
          errorMessage + '. ' + translations['SEMAFORO.refrescando_datos']
        ).then(() => this.loadData());
      });
    } else {
      this.translate.get(['GLOBAL.error', 'SEMAFORO.error_guardar']).subscribe(translations => {
        this.alertService.showAlert(translations['GLOBAL.error'], translations['SEMAFORO.error_guardar']).then(() => {
          this.refreshRow(rowId);
        });
      });
    }
  }

  private refreshRow(rowId: number): void {
    this.semaforoService.get(`semaforo/${rowId}`).subscribe({
      next: response => {
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
    this.loadingFacultades = true;
    this.oikosService.getFacultades().subscribe({
      next: (response: any) => {
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
    this.loadingProyectos = true;
    this.oikosService.getProyectosByFacultad(idFacultad).subscribe({
      next: (response: any) => {
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
