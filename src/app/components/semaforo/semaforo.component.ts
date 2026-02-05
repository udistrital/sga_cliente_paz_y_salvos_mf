import { Component, OnInit, OnDestroy } from '@angular/core';
import { ColDef, CellClickedEvent, GridReadyEvent, GridApi } from 'ag-grid-community';
import { SEMAFORO_ROW } from '../../constants/semaforo-row';
import { SemaforoRow, Semaforo } from '../../models/semaforo-row';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { UserService } from '../../services/user.service';
import { SemaforoService } from '../../services/semaforo.service';
import { OikosService } from '../../services/oikos.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-semaforo',
  templateUrl: './semaforo.component.html',
  styleUrl: './semaforo.component.scss'
})
export class SemaforoComponent implements OnInit, OnDestroy {
  private gridApi!: GridApi;
  private langChangeSubscription?: Subscription;
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
    private alertaService: AlertService,
    private translate: TranslateService
  ) {}

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
    await this.translateColumnHeaders();
    this.setupColumnDefs();
    
    // Suscribirse a cambios de idioma
    this.langChangeSubscription = this.translate.onLangChange.subscribe(() => {
      this.translateColumnHeaders();
    });
    
    if (this.userRoles.includes('CONTRATISTA')) {
      this.loadData();
    } else {
      await this.loadFacultades();
      this.loadData();
    }
  }

  ngOnDestroy() {
    // Limpiar suscripción al destruir el componente
    if (this.langChangeSubscription) {
      this.langChangeSubscription.unsubscribe();
    }
  }

  private async translateColumnHeaders() {
    const columnTranslationKeys = [
      'SEMAFORO.col_codigo',
      'SEMAFORO.col_nombre',
      'SEMAFORO.col_facultad',
      'SEMAFORO.col_proyecto_curricular',
      'SEMAFORO.col_anio_inscripcion',
      'SEMAFORO.col_periodo_inscripcion',
      'SEMAFORO.col_academico',
      'SEMAFORO.col_financiero',
      'SEMAFORO.col_biblioteca',
      'SEMAFORO.col_laboratorios',
      'SEMAFORO.col_bienestar',
      'SEMAFORO.col_urelinter',
      'SEMAFORO.col_orc',
      'SEMAFORO.col_obs_coordinacion',
      'SEMAFORO.col_obs_biblioteca',
      'SEMAFORO.col_obs_laboratorios',
      'SEMAFORO.col_obs_bienestar',
      'SEMAFORO.col_obs_urelinter',
      'SEMAFORO.col_obs_orc'
    ];

    this.translate.get(columnTranslationKeys).subscribe(translations => {
      this.columnDefs[0].headerName = translations['SEMAFORO.col_codigo'];
      this.columnDefs[1].headerName = translations['SEMAFORO.col_nombre'];
      this.columnDefs[2].headerName = translations['SEMAFORO.col_facultad'];
      this.columnDefs[3].headerName = translations['SEMAFORO.col_proyecto_curricular'];
      this.columnDefs[4].headerName = translations['SEMAFORO.col_anio_inscripcion'];
      this.columnDefs[5].headerName = translations['SEMAFORO.col_periodo_inscripcion'];
      this.columnDefs[6].headerName = translations['SEMAFORO.col_academico'];
      this.columnDefs[7].headerName = translations['SEMAFORO.col_financiero'];
      this.columnDefs[8].headerName = translations['SEMAFORO.col_biblioteca'];
      this.columnDefs[9].headerName = translations['SEMAFORO.col_laboratorios'];
      this.columnDefs[10].headerName = translations['SEMAFORO.col_bienestar'];
      this.columnDefs[11].headerName = translations['SEMAFORO.col_urelinter'];
      this.columnDefs[12].headerName = translations['SEMAFORO.col_orc'];
      this.columnDefs[13].headerName = translations['SEMAFORO.col_obs_coordinacion'];
      this.columnDefs[14].headerName = translations['SEMAFORO.col_obs_biblioteca'];
      this.columnDefs[15].headerName = translations['SEMAFORO.col_obs_laboratorios'];
      this.columnDefs[16].headerName = translations['SEMAFORO.col_obs_bienestar'];
      this.columnDefs[17].headerName = translations['SEMAFORO.col_obs_urelinter'];
      this.columnDefs[18].headerName = translations['SEMAFORO.col_obs_orc'];
      
      // Actualizar la grilla si ya está lista
      if (this.gridApi) {
        this.gridApi.refreshHeader();
      }
    });
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
          // Caso especial: ADMISIONES_REG puede hacer clic en ORC para cambiar entre los 3 estados
          if (
            col.field === 'Orc' &&
            this.userRoles.includes('ADMISIONES_REG')
          ) {
            const todasDependenciasTrue = this.allDependenciesCleared(params.data);
            const algunaDependenciaFalse = !todasDependenciasTrue;

            // Ciclo de estados con restricciones:
            // - Si todas las dependencias están en true: solo puede cambiar entre null y true
            // - Si alguna dependencia está en false: solo puede cambiar entre null y false
            if (params.data.Orc === null) {
              // Desde null: ir a true si todas están en true, o a false si alguna está en false
              if (todasDependenciasTrue) {
                params.node.setDataValue('Orc', true);
              } else {
                params.node.setDataValue('Orc', false);
              }
            } else if (params.data.Orc === true) {
              // Desde true: verificar si todas las dependencias siguen en true
              if (todasDependenciasTrue) {
                // Puede volver a null
                params.node.setDataValue('Orc', null);
              } else {
                // No puede mantener true si alguna dependencia cambió a false
                this.translate.get(['GLOBAL.atencion', 'SEMAFORO.orc_no_puede_true']).subscribe(translations => {
                  this.alertaService.showAlert(
                    translations['GLOBAL.atencion'],
                    translations['SEMAFORO.orc_no_puede_true']
                  );
                });
                return;
              }
            } else {
              // Desde false: volver a null
              params.node.setDataValue('Orc', null);
            }
            this.saveRow(params.data, params.node);
            return;
          }

          // Verificar primero si el campo le compete a la dependencia (ignorando el estado de ORC)
          const fieldBelongsToUser = this.canEditColumnIfOrcNull(col.field as string, params.data);
          
          // Si el campo NO le compete, mostrar mensaje genérico
          if (!fieldBelongsToUser) {
            this.translate.get(['SEMAFORO.sin_acceso', 'SEMAFORO.sin_acceso_texto']).subscribe(translations => {
              this.alertaService.showAlert(
                translations['SEMAFORO.sin_acceso'],
                translations['SEMAFORO.sin_acceso_texto']
              );
            });
            return;
          }

          // Si el campo SÍ le compete pero ORC está bloqueando (no es null), mostrar mensaje específico
          if (
            params.data.Orc !== null &&
            col.field !== 'Orc' &&
            col.field !== 'Observacion'
          ) {
            this.translate.get(['SEMAFORO.sin_acceso', 'SEMAFORO.orc_bloqueado']).subscribe(translations => {
              this.alertaService.showAlert(
                translations['SEMAFORO.sin_acceso'],
                translations['SEMAFORO.orc_bloqueado']
              );
            });
            return;
          }

          // Si pasó todas las validaciones, permitir la edición
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

  private canEditColumnIfOrcNull(colField: string, rowData: SemaforoRow): boolean {
    const tempRow = { ...rowData, Orc: null };
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
      Orc: item.Orc === null ? null : !!item.Orc,
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
    
    if (this.hasActiveFilters()) {
      this.translate.get(['SEMAFORO.sin_resultados', 'SEMAFORO.sin_resultados_filtros']).subscribe(translations => {
        this.alertaService.showAlert(
          translations['SEMAFORO.sin_resultados'],
          translations['SEMAFORO.sin_resultados_filtros']
        );
      });
    } else {
      const textKey = this.userRoles.includes('CONTRATISTA') 
        ? 'SEMAFORO.sin_estudiantes_proyectos'
        : 'SEMAFORO.sin_estudiantes_activos';
      
      this.translate.get(['SEMAFORO.sin_estudiantes', textKey]).subscribe(translations => {
        this.alertaService.showAlert(
          translations['SEMAFORO.sin_estudiantes'],
          translations[textKey]
        );
      });
    }
  }

  private async loadData() {
    let endpoint = 'semaforo';
    
    if (this.userRoles.includes('CONTRATISTA')) {
      try {
        const cedula = await this.userService.getUserDocument();
        endpoint = `semaforo/asistente_proyecto/${cedula}`;
      } catch (error) {
        this.translate.get(['GLOBAL.error', 'SEMAFORO.error_cedula']).subscribe(translations => {
          this.alertaService.showAlert(translations['GLOBAL.error'], translations['SEMAFORO.error_cedula']);
        });
        return;
      }

      this.loading = true;
      this.translate.get('SEMAFORO.cargando_estudiantes').subscribe(translation => {
        this.alertaService.showLoading(translation);
      });
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
            this.translate.get(['GLOBAL.error', 'SEMAFORO.error_cargar_datos']).subscribe(translations => {
              this.alertaService.showAlert(translations['GLOBAL.error'], translations['SEMAFORO.error_cargar_datos']);
            });
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
        this.translate.get(['GLOBAL.error', 'SEMAFORO.error_codigo']).subscribe(translations => {
          this.alertaService.showAlert(translations['GLOBAL.error'], translations['SEMAFORO.error_codigo']);
        });
        return;
      }
    } else if (this.userRoles.includes('COORDINADOR')) {
      try {
        const id = await this.userService.getUserDocument();
        endpoint = `semaforo/proyecto/${id}`;
      } catch (error) {
        this.translate.get(['GLOBAL.error', 'SEMAFORO.error_id_coordinador']).subscribe(translations => {
          this.alertaService.showAlert(translations['GLOBAL.error'], translations['SEMAFORO.error_id_coordinador']);
        });
        return;
      }
    } else if (this.userRoles.includes('SECRETARIA_ACADEMICA') || this.userRoles.includes('SECRETARIO_ACADEMICO')) {
      try {
        const id = await this.userService.getUserDocument();
        endpoint = `semaforo/facultad/${id}`;
      } catch (error) {
        this.translate.get(['GLOBAL.error', 'SEMAFORO.error_id_secretario']).subscribe(translations => {
          this.alertaService.showAlert(translations['GLOBAL.error'], translations['SEMAFORO.error_id_secretario']);
        });
        return;
      }
    } else if (this.userRoles.includes('LABORATORIOS') || this.userRoles.includes('JEFE_LABORATORIO')) {
      try {
        const id = await this.userService.getUserDocument();
        endpoint = `semaforo/laboratorios/${id}`;
      } catch (error) {
        this.translate.get(['GLOBAL.error', 'SEMAFORO.error_id_jefe']).subscribe(translations => {
          this.alertaService.showAlert(translations['GLOBAL.error'], translations['SEMAFORO.error_id_jefe']);
        });
        return;
      }
    }
    // Para ADMISIONES_REG, BIBLIOTECA, BIENESTAR, URELINTER se usa el endpoint por defecto 'semaforo'

    this.loading = true;
    this.translate.get('SEMAFORO.cargando_estudiantes').subscribe(translation => {
      this.alertaService.showLoading(translation);
    });
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
          this.translate.get(['GLOBAL.error', 'SEMAFORO.error_cargar_datos']).subscribe(translations => {
            this.alertaService.showAlert(translations['GLOBAL.error'], translations['SEMAFORO.error_cargar_datos']);
          });
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

    this.saveRow(row, node);
  }

  private allDependenciesCleared(row: SemaforoRow): boolean {
    return this.booleanFields
      .filter(f => f !== 'Orc')
      .every(f => !!(row as any)[f]);
  }

  private saveRow(row: SemaforoRow, node: any) {
    this.loading = true;
    this.translate.get('SEMAFORO.guardando_cambios').subscribe(translation => {
      this.alertaService.showLoading(translation);
    });
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
        this.translate.get(['GLOBAL.error', 'SEMAFORO.error_guardar']).subscribe(translations => {
          this.alertaService.showAlert(translations['GLOBAL.error'], translations['SEMAFORO.error_guardar']);
        });
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

    // Si Orc NO es null (es true o false), solo ADMISIONES_REG puede editar Orc y Observacion
    if (rowData.Orc !== null) {
      return (
        this.userRoles.includes('ADMISIONES_REG') &&
        (colField === 'Orc' || colField === 'Observacion')
      );
    }

    // Si Orc es null, ADMISIONES_REG puede editar Orc
    if (
      this.userRoles.includes('ADMISIONES_REG') &&
      colField === 'Orc'
    ) {
      return true;
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