import { Component } from '@angular/core';
import { ColDef, CellClickedEvent, GridReadyEvent, GridApi } from 'ag-grid-community';
import { SEMAFORO_ROW } from '../../constants/semaforo-row';
import { SemaforoRow, Semaforo } from '../../models/semaforo-row';

import { UserService } from '../../services/user.service';
import { SemaforoService } from '../../services/semaforo.service';
import { OikosService } from '../../services/oikos.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-semaforo',
  templateUrl: './semaforo.component.html',
  styleUrl: './semaforo.component.scss'
})
export class SemaforoComponent {
  private gridApi!: GridApi;
  loading = false;
  userRoles: string[] = [];
  rowData: SemaforoRow[] = [];
  filteredRowData: SemaforoRow[] = [];
  
  // Paginación
  currentPage = 0;
  pageSize = 20;
  totalRecords = 0;
  Math = Math; // Para usar Math.min en el template

  // Boolean fields for special handling
  readonly booleanFields = [
    'Academico', 'Financiero', 'Biblioteca', 'Laboratorios', 'Bienestar', 'Urelinter', 'Orc'
  ];

  // Filtros
  filtersExpanded = false;
  filters = {
    codigoEstudiante: '',
    idFacultad: null as number | null,
    idProyecto: null as number | null,
    anioInsGrado: null as number | null,
    perInsGrado: null as number | null
  };

  facultades: Array<{id: number | null, nombre: string}> = [];
  proyectos: Array<{id: number | null, nombre: string}> = [];
  loadingFacultades = false;
  loadingProyectos = false;

  esAsistente = false;
  proyectosAsignados: Array<{idOikos: number, codigo: string, nombre: string}> = [];

  // Clone columnDefs to allow runtime changes
  columnDefs: ColDef[] = SEMAFORO_ROW.map(col => ({ ...col }));

  constructor(
    private userService: UserService,
    private semaforoService: SemaforoService,
    private oikosService: OikosService,
    private alertaService: AlertService
  ) { }

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.pageSize);
  }

  // Validación de filtros por rol
  canUseCodigoFilter(): boolean {
    // Todos excepto ESTUDIANTE
    return !this.userRoles.includes('ESTUDIANTE');
  }

  canUseFacultadFilter(): boolean {
    // Solo roles globales: BIBLIOTECA, ADMIN_BIENESTAR, URELINTER, ADMISIONES_REG
    return this.userRoles.includes('BIBLIOTECA') ||
           this.userRoles.includes('ADMIN_BIENESTAR') ||
           this.userRoles.includes('URELINTER') ||
           this.userRoles.includes('ADMISIONES_REG');
  }

  canUseProyectoFilter(): boolean {
    if (this.userRoles.includes('CONTRATISTA')) return true;
    // Todos excepto ESTUDIANTE y COORDINADOR
    return !this.userRoles.includes('ESTUDIANTE') && 
           !this.userRoles.includes('COORDINADOR');
  }

  canUseAnioFilter(): boolean {
    // Todos excepto ESTUDIANTE
    return !this.userRoles.includes('ESTUDIANTE');
  }

  canUsePeriodoFilter(): boolean {
    // Todos excepto ESTUDIANTE
    return !this.userRoles.includes('ESTUDIANTE');
  }

  async ngOnInit() {
    await this.loadUserInfo();
    this.setupColumnDefs();
    if (this.userRoles.includes('CONTRATISTA')) {
      this.loadData();
    } else {
      await this.loadFacultades();
      this.loadData();
    }
  }

  private async loadUserInfo() {
    try {
      this.userRoles = await this.userService.getUserRoles();
      await this.userService.getPersonaId(); // Only for logging
    } catch (error) {
      // Error loading user info
    }
  }

  private setupColumnDefs() {
    this.columnDefs.forEach(col => {
      if (col.field && this.booleanFields.includes(col.field)) {
        col.onCellClicked = (params: CellClickedEvent) => {
          if (
            params.data.Orc &&
            col.field !== 'Orc' &&
            col.field !== 'Observacion' &&
            this.canEditColumnIfOrcFalse(col.field as string, params.data)
          ) {
            this.alertaService.showAlert(
              'Edición no permitida',
              'No puede editar este campo, ORC ya ha dado su visto bueno.'
            );
            return;
          }
          if (
            col.field === 'Orc' &&
            this.userRoles.includes('ADMISIONES_REG') &&
            !params.data.Orc &&
            !this.allDependenciesCleared(params.data)
          ) {
            this.alertaService.showAlert(
              'Atención',
              'Todas las dependencias deben dar visto bueno.'
            );
            return;
          }
          if (!this.canEditColumn(col.field as string, params.data)) {
            this.alertaService.showAlert(
              'Edición no permitida',
              'No tiene permisos para editar este campo.'
            );
            return;
          }
          params.node.setDataValue(col.field as string, !params.value);
          this.saveRow(params.data, params.node);
        };
      }
      if (col.field === 'Observacion') {
        col.editable = (params: any) => this.canEditColumn('Observacion', params.data);
      }
      // Configurar editabilidad de campos de observaciones por dependencia
      if (col.field === 'ObservacionCoordinacion') {
        col.editable = (params: any) => this.canEditColumn('ObservacionCoordinacion', params.data);
      }
      if (col.field === 'ObservacionBiblioteca') {
        col.editable = (params: any) => this.canEditColumn('ObservacionBiblioteca', params.data);
      }
      if (col.field === 'ObservacionLaboratorios') {
        col.editable = (params: any) => this.canEditColumn('ObservacionLaboratorios', params.data);
      }
      if (col.field === 'ObservacionBienestar') {
        col.editable = (params: any) => this.canEditColumn('ObservacionBienestar', params.data);
      }
      if (col.field === 'ObservacionUrelinter') {
        col.editable = (params: any) => this.canEditColumn('ObservacionUrelinter', params.data);
      }
      if (col.field === 'ObservacionOrc') {
        col.editable = (params: any) => this.canEditColumn('ObservacionOrc', params.data);
      }
    });
  }

  private canEditColumnIfOrcFalse(colField: string, rowData: SemaforoRow): boolean {
    const tempRow = { ...rowData, Orc: false };
    return this.canEditColumn(colField, tempRow);
  }

  onRefreshClick(): void {
    this.currentPage = 0;
    this.loadData();
  }

  // Construir parámetros de query con filtros activos
  private buildQueryParams(): any {
    const params: any = {
      limit: this.pageSize,
      offset: this.currentPage * this.pageSize
    };

    if (this.filters.codigoEstudiante) params.codigo = this.filters.codigoEstudiante;
    if (this.filters.idProyecto !== null && this.filters.idProyecto !== undefined) {
      params.idProyecto = this.filters.idProyecto;
    }
    if (this.filters.anioInsGrado !== null && this.filters.anioInsGrado !== undefined) {
      params.anio = this.filters.anioInsGrado;
    }
    if (this.filters.perInsGrado !== null && this.filters.perInsGrado !== undefined) {
      params.periodo = this.filters.perInsGrado;
    }
    if (this.filters.idFacultad !== null && this.filters.idFacultad !== undefined) {
      params.idFacultad = this.filters.idFacultad;
    }

    return params;
  }

  // Mapear datos de respuesta a formato de tabla
  private mapResponseToRowData(data: any[]): SemaforoRow[] {
    return data.map((item: any) => ({
      Id: item.Id,
      CodigoEstudiante: item.CodigoEstudiante,
      NombreEstudiante: item.NombreEstudiante,
      NombreFacultad: item.NombreFacultad,
      NombreProyecto: item.NombreProyecto,
      IdFacultadOikos: item.IdFacultadOikos || 0,
      IdProyectoOikos: item.IdProyectoOikos || 0,
      IdFacultadGedep: item.IdFacultadGedep || 0,
      IdProyectoAccra: item.IdProyectoAccra || 0,
      AnioInsGrado: item.AnioInsGrado,
      PerInsGrado: item.PerInsGrado,
      Observacion: item.Observacion,
      Academico: !!item.Academico,
      Financiero: !!item.Financiero,
      Biblioteca: !!item.Biblioteca,
      Laboratorios: !!item.Laboratorios,
      Bienestar: !!item.Bienestar,
      Urelinter: !!item.Urelinter,
      Orc: !!item.Orc,
      ObservacionCoordinacion: item.ObservacionCoordinacion || '',
      ObservacionBiblioteca: item.ObservacionBiblioteca || '',
      ObservacionLaboratorios: item.ObservacionLaboratorios || '',
      ObservacionBienestar: item.ObservacionBienestar || '',
      ObservacionUrelinter: item.ObservacionUrelinter || '',
      ObservacionOrc: item.ObservacionOrc || '',
      Activo: item.Activo !== false,
      FechaCreacion: item.FechaCreacion || '',
      FechaModificacion: item.FechaModificacion || '',
    }));
  }

  // Procesar proyectos asignados para CONTRATISTA
  private procesarProyectosAsignados(responseData: any): void {
    this.esAsistente = !!responseData.EsAsistente;
    this.proyectosAsignados = Array.isArray(responseData.ProyectosAsignados)
      ? responseData.ProyectosAsignados.map((p: any) => ({
          idOikos: p.IdOikos,
          codigo: p.Codigo,
          nombre: p.Nombre
        }))
      : [];
    
    this.proyectos = this.proyectosAsignados.length > 0
      ? [{id: null, nombre: 'Todos'}, ...this.proyectosAsignados.map(p => ({id: p.idOikos, nombre: p.nombre}))]
      : [];
  }

  // Manejar respuesta sin datos
  private handleEmptyResponse(): void {
    this.rowData = [];
    this.filteredRowData = [];
    this.totalRecords = 0;
    this.loading = false;
    this.alertaService.closeLoading();
    
    const message = this.hasActiveFilters()
      ? { title: 'Sin resultados', text: 'No se encontraron estudiantes con los filtros aplicados.' }
      : { title: 'Sin estudiantes', text: this.userRoles.includes('CONTRATISTA') 
          ? 'No hay estudiantes activos en los proyectos asignados.'
          : 'No se encontraron estudiantes activos.' };
    
    this.alertaService.showAlert(message.title, message.text);
  }

  private async loadData() {
    let endpoint = 'semaforo';
    
    if (this.userRoles.includes('CONTRATISTA')) {
      try {
        const cedula = await this.userService.getUserDocument();
        endpoint = `semaforo/asistente_proyecto/${cedula}`;
      } catch (error) {
        this.alertaService.showAlert('Error', 'No se pudo obtener la cédula del asistente');
        return;
      }

      this.loading = true;
      this.alertaService.showLoading('Cargando estudiantes...');
      const params = this.buildQueryParams();

      this.semaforoService.get(endpoint, params).subscribe({
        next: response => {
          const responseData = response.Data || response;
          
          this.procesarProyectosAsignados(responseData);

          this.totalRecords = responseData.TotalCount || 0;
          const data = responseData.Semaforos || [];
          this.rowData = this.mapResponseToRowData(data);
          this.filteredRowData = this.rowData;
          
          this.loading = false;
          this.alertaService.closeLoading();
        },
        error: error => {
          if (error.Status === 404 && error?.Data) {
            this.procesarProyectosAsignados(error.Data);
            this.handleEmptyResponse();
          } else {
            this.rowData = [];
            this.filteredRowData = [];
            this.totalRecords = 0;
            this.proyectosAsignados = [];
            this.proyectos = [];
            this.alertaService.closeLoading();
            this.alertaService.showAlert('Error', 'No se pudieron cargar los datos');
            this.loading = false;
          }
        }
      });
      return;
    }
    
    // Determinar endpoint según rol del usuario
    if (this.userRoles.includes('ESTUDIANTE')) {
      try {
        const codigo = await this.userService.getCodigoEstudiante();
        endpoint = `semaforo/estudiante/${codigo}`;
      } catch (error) {
        this.alertaService.showAlert('Error', 'No se pudo obtener el código del estudiante');
        return;
      }
    } else if (this.userRoles.includes('COORDINADOR')) {
      try {
        const id = await this.userService.getUserDocument();
        endpoint = `semaforo/proyecto/${id}`;
      } catch (error) {
        this.alertaService.showAlert('Error', 'No se pudo obtener el ID del coordinador');
        return;
      }
    } else if (this.userRoles.includes('SECRETARIA_ACADEMICA') || this.userRoles.includes('SECRETARIO_ACADEMICO')) {
      try {
        const id = await this.userService.getUserDocument();
        endpoint = `semaforo/facultad/${id}`;
      } catch (error) {
        this.alertaService.showAlert('Error', 'No se pudo obtener el ID del secretario');
        return;
      }
    } else if (this.userRoles.includes('LABORATORIOS') || this.userRoles.includes('JEFE_LABORATORIO')) {
      try {
        const id = await this.userService.getUserDocument();
        endpoint = `semaforo/laboratorios/${id}`;
      } catch (error) {
        this.alertaService.showAlert('Error', 'No se pudo obtener el ID del jefe de laboratorios');
        return;
      }
    }
    // Para ADMISIONES_REG, BIBLIOTECA, BIENESTAR, URELINTER se usa el endpoint por defecto 'semaforo'

    this.loading = true;
    this.alertaService.showLoading('Cargando estudiantes...');
    const params = this.buildQueryParams();

    this.semaforoService.get(endpoint, params).subscribe({
      next: response => {
  
        // Extraer y procesar datos
        const responseData = response.Data || response;
        const data = responseData.Data || responseData;
        this.totalRecords = responseData.TotalCount || 0;
        
        // Validar que data sea un array y tenga elementos
        if (!Array.isArray(data) || data.length === 0) {
          this.handleEmptyResponse();
          return;
        }
        
        // Mapear datos y cargar proyectos de facultad
        this.rowData = this.mapResponseToRowData(data);
        this.filteredRowData = this.rowData;
        this.loadProyectosFromFacultad(responseData);
        
        this.loading = false;
        this.alertaService.closeLoading();
      },
      error: error => {
        if (error.Status === 404) {
          this.handleEmptyResponse();
        } else {
          this.rowData = [];
          this.filteredRowData = [];
          this.totalRecords = 0;
          this.alertaService.closeLoading();
          this.alertaService.showAlert('Error', 'No se pudieron cargar los datos');
          this.loading = false;
        }
      }
    });
  }

  // Métodos de navegación de paginación
  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadData();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadData();
    }
  }

  goToFirstPage(): void {
    this.currentPage = 0;
    this.loadData();
  }

  goToLastPage(): void {
    this.currentPage = this.totalPages - 1;
    this.loadData();
  }

  onPageSizeChange(): void {
    this.currentPage = 0; // Reset a la primera página al cambiar el tamaño
    this.loadData();
  }

  // Handles both boolean and text field updates
  updateRow(event: any) {
    const row: SemaforoRow = event.data;
    const node = event.node;

    // Only validate when Orc is set to true
    if (row.Orc && !this.allDependenciesCleared(row)) {
      this.alertaService.showAlert(
        'Atención',
        'El estudiante debe estar paz y salvo en todas las dependencias.'
      );
      node.setDataValue('Orc', false);
      return;
    }

    this.saveRow(row, node);
  }

  private allDependenciesCleared(row: SemaforoRow): boolean {
    return this.booleanFields
      .filter(f => f !== 'Orc')
      .every(f => !!(row as any)[f]);
  }

  private saveRow(row: SemaforoRow, node: any) {
    this.loading = true;
    this.alertaService.showLoading('Guardando cambios...');
    const putStruct: Partial<Semaforo> = {
      Observacion: row.Observacion,
      Academico: row.Academico,
      Financiero: row.Financiero,
      Biblioteca: row.Biblioteca,
      Laboratorios: row.Laboratorios,
      Bienestar: row.Bienestar,
      Urelinter: row.Urelinter,
      Orc: row.Orc,
      ObservacionCoordinacion: row.ObservacionCoordinacion,
      ObservacionBiblioteca: row.ObservacionBiblioteca,
      ObservacionLaboratorios: row.ObservacionLaboratorios,
      ObservacionBienestar: row.ObservacionBienestar,
      ObservacionUrelinter: row.ObservacionUrelinter,
      ObservacionOrc: row.ObservacionOrc
    };

    this.semaforoService.patch('semaforo', row.Id, putStruct).subscribe({
      next: () => { 
        this.loading = false;
        this.alertaService.closeLoading();
      },
      error: err => {
        this.alertaService.closeLoading();
        this.alertaService.showAlert('Error', 'Error al actualizar datos');
        this.loading = false;
      }
    });
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
  }

  private canEditColumn(colField: string, rowData: SemaforoRow): boolean {
    // ADMISIONES_REG siempre puede editar Observacion
    if (this.userRoles.includes('ADMISIONES_REG') && colField === 'Observacion') {
      return true;
    }

    // Si Orc está en true, solo ADMISIONES_REG puede editar Orc y Observacion
    if (rowData.Orc) {
      return (
        this.userRoles.includes('ADMISIONES_REG') &&
        (colField === 'Orc' || colField === 'Observacion')
      );
    }

    // Si Orc NO está en true, ADMISIONES_REG puede editar Orc solo si todas las dependencias están en true
    if (
      this.userRoles.includes('ADMISIONES_REG') &&
      colField === 'Orc'
    ) {
      return this.allDependenciesCleared(rowData);
    }

    // Permisos por rol
    if (this.userRoles.includes('CONTRATISTA')) {
      return colField === 'Academico' || colField === 'Financiero'|| colField === 'ObservacionCoordinacion';
    }
    if (this.userRoles.includes('COORDINADOR')) {
      return colField === 'Academico' || colField === 'Financiero' || colField === 'ObservacionCoordinacion';
    }
    if (this.userRoles.includes('SECRETARIA_ACADEMICA') || this.userRoles.includes('SECRETARIO_ACADEMICO')) {
      return colField === 'Academico' || colField === 'ObservacionCoordinacion';
    }
    if (this.userRoles.includes('BIBLIOTECA')) {
      return colField === 'Biblioteca' || colField === 'ObservacionBiblioteca';
    }
    if (this.userRoles.includes('LABORATORIOS') || this.userRoles.includes('JEFE_LABORATORIO')) {
      return colField === 'Laboratorios' || colField === 'ObservacionLaboratorios';
    }
    if (this.userRoles.includes('ADMIN_BIENESTAR')) {
      return colField === 'Bienestar' || colField === 'ObservacionBienestar';
    }
    if (this.userRoles.includes('URELINTER')) {
      return colField === 'Urelinter' || colField === 'ObservacionUrelinter';
    }
    if (this.userRoles.includes('ADMISIONES_REG')) {
      return colField === 'Orc' || colField === 'Observacion' || colField === 'ObservacionOrc';
    }
    // ESTUDIANTE solo consulta
    return false;
  }

  // Métodos de carga de catálogos
  private async loadFacultades() {
    this.loadingFacultades = true;
    try {
      this.oikosService.getFacultades().subscribe({
        next: (response: any) => {
          const data = response.Data || response;
          if (Array.isArray(data)) {
            const facultadesData = data.map((item: any) => ({
              id: item.DependenciaId?.Id || item.Id,
              nombre: item.DependenciaId?.Nombre || item.Nombre
            })).filter(f => f.id && f.nombre);
            
            this.facultades = [{id: null, nombre: 'Todas'}, ...facultadesData];
          }
          this.loadingFacultades = false;
        },
        error: (error: any) => {
          this.loadingFacultades = false;
        }
      });
    } catch (error) {
      this.loadingFacultades = false;
    }
  }

  onFacultadChange(): void {
    // Limpiar proyecto seleccionado
    this.filters.idProyecto = null;
    this.proyectos = [];
    
    // Cargar proyectos de la facultad seleccionada
    if (this.filters.idFacultad) {
      this.loadProyectosByFacultad(this.filters.idFacultad);
    }
  }

  private loadProyectosByFacultad(idFacultad: number) {
    this.loadingProyectos = true;
    try {
      this.oikosService.getProyectosByFacultad(idFacultad).subscribe({
        next: (response: any) => {
          const data = response.Data || response;
          if (Array.isArray(data)) {
            const proyectosData = data.map((item: any) => ({
              id: item.DependenciaId?.Id || item.Id,
              nombre: item.DependenciaId?.Nombre || item.Nombre
            })).filter(p => p.id && p.nombre);
            
            this.proyectos = [{id: null, nombre: 'Todos'}, ...proyectosData];
          }
          this.loadingProyectos = false;
        },
        error: (error: any) => {
          this.loadingProyectos = false;
        }
      });
    } catch (error) {
      this.loadingProyectos = false;
    }
  }

  onFilterChange(): void {

  }

  private hasActiveFilters(): boolean {
    return !!(
      this.filters.codigoEstudiante ||
      this.filters.idFacultad ||
      this.filters.idProyecto ||
      this.filters.anioInsGrado ||
      this.filters.perInsGrado
    );
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.loadData();
  }



  clearFilters(): void {
    this.filters = {
      codigoEstudiante: '',
      idFacultad: null,
      idProyecto: null,
      anioInsGrado: null,
      perInsGrado: null
    };
    this.proyectos = [];
    this.currentPage = 0;
    this.loadData();
  }

  private loadProyectosFromFacultad(responseData: any) {
    if (this.userRoles.includes('SECRETARIA_ACADEMICA') || 
        this.userRoles.includes('SECRETARIO_ACADEMICO') ||
        this.userRoles.includes('LABORATORIOS') || 
        this.userRoles.includes('JEFE_LABORATORIO')) {
      
      // Intentar extraer el ID de facultad de diferentes campos posibles en la respuesta
      const facultadId = responseData.IdFacultad || 
                         responseData.FacultadId || 
                         responseData.IdFacultadOikos ||
                         (this.rowData.length > 0 ? this.rowData[0].IdFacultadOikos : null);
      
      if (facultadId) {
        this.loadProyectosByFacultad(facultadId);
      } else {
        // Fallback: extraer proyectos únicos de los datos
        this.loadProyectosFromData();
      }
    }
  }

  private loadProyectosFromData() {
    // Fallback: Extraer proyectos únicos de los datos cargados
    const proyectosUnicos = new Map<number, string>();
    this.rowData.forEach(row => {
      if (row.IdProyectoOikos && row.NombreProyecto) {
        proyectosUnicos.set(row.IdProyectoOikos, row.NombreProyecto);
      }
    });
    
    // Convertir a array de objetos para el dropdown
    const proyectosData = Array.from(proyectosUnicos.entries()).map(([id, nombre]) => ({
      id,
      nombre
    })).sort((a, b) => a.nombre.localeCompare(b.nombre));
    
    // Agregar opción "Todos" al inicio
    this.proyectos = [{id: null, nombre: 'Todos'}, ...proyectosData];
  }
}