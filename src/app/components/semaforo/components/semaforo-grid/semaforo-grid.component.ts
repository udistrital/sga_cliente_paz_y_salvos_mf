import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { ColDef, CellClickedEvent, GridReadyEvent, GridApi, ICellRendererParams } from 'ag-grid-community';
import { SemaforoRow } from '../../../../models/semaforo-row';
import { SEMAFORO_ROW } from '../../../../constants/semaforo-row';
import { SemaforoPermissionsService } from '../../../../services/semaforo-permissions.service';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AlertService } from '../../../../services/alert.service';

/**
 * Componente de la grilla AG Grid del semáforo
 * Maneja la visualización y edición de los registros según permisos
 */
@Component({
  selector: 'app-semaforo-grid',
  templateUrl: './semaforo-grid.component.html',
  styleUrls: ['./semaforo-grid.component.scss']
})
export class SemaforoGridComponent implements OnInit, OnDestroy {
  @Input() rowData: SemaforoRow[] = [];
  @Input() userRoles: string[] = [];
  
  @Output() cellValueChanged = new EventEmitter<any>();
  @Output() cellClicked = new EventEmitter<{data: SemaforoRow, field: string}>();
  @Output() gridReady = new EventEmitter<GridApi>();

  private gridApi!: GridApi;
  private langChangeSubscription?: Subscription;
  columnDefs: ColDef[] = [];
  
  readonly booleanFields = [
    'Academico', 'Financiero', 'Biblioteca', 'Laboratorios', 'Bienestar', 'Urelinter', 'Orc'
  ];

  constructor(
    private permissionsService: SemaforoPermissionsService,
    private translate: TranslateService,
    private alertService: AlertService
  ) {}

  async ngOnInit() {
    this.columnDefs = SEMAFORO_ROW.map(col => ({ ...col }));
    await this.translateColumnHeaders();
    this.setupColumnDefs();
    
    // Suscribirse a cambios de idioma
    this.langChangeSubscription = this.translate.onLangChange.subscribe(() => {
      this.translateColumnHeaders();
    });
  }

  ngOnDestroy() {
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
      'SEMAFORO.col_obs_financiera',
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
      this.columnDefs[14].headerName = translations['SEMAFORO.col_obs_financiera'];
      this.columnDefs[15].headerName = translations['SEMAFORO.col_obs_biblioteca'];
      this.columnDefs[16].headerName = translations['SEMAFORO.col_obs_laboratorios'];
      this.columnDefs[17].headerName = translations['SEMAFORO.col_obs_bienestar'];
      this.columnDefs[18].headerName = translations['SEMAFORO.col_obs_urelinter'];
      this.columnDefs[19].headerName = translations['SEMAFORO.col_obs_orc'];
      
      if (this.gridApi) {
        this.gridApi.refreshHeader();
      }
    });
  }

  private setupColumnDefs() {
    this.columnDefs.forEach(col => {
      // Configurar campos booleanos (semáforos)
      if (col.field && this.booleanFields.includes(col.field)) {
        col.onCellClicked = (params: CellClickedEvent) => {
          this.handleBooleanFieldClick(params, col.field as string);
        };
      }
      
      // Configurar editabilidad de observaciones
      if (col.field === 'Observacion') {
        col.editable = (params: any) => this.canEditColumn('Observacion', params.data);
      }
      if (col.field === 'ObservacionCoordinacion') {
        col.editable = (params: any) => this.canEditColumn('ObservacionCoordinacion', params.data);
      }
      if (col.field === 'ObservacionFinanciera') {
        col.editable = (params: any) => this.canEditColumn('ObservacionFinanciera', params.data);
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

  private handleBooleanFieldClick(params: CellClickedEvent, field: string) {
    // Caso especial: ADMISIONES_REG puede hacer clic en ORC para cambiar entre los 3 estados
    if (field === 'Orc' && this.userRoles.includes('ADMISIONES_REG')) {
      const todasDependenciasTrue = this.permissionsService.allDependenciesCleared(params.data, this.booleanFields);

      if (params.data.Orc === null) {
        // Desde null: ir a true si todas están en true, o a false si alguna está en false
        params.node.setDataValue('Orc', todasDependenciasTrue ? true : false);
      } else if (params.data.Orc === true) {
        // Desde true: verificar si todas las dependencias siguen en true
        if (todasDependenciasTrue) {
          params.node.setDataValue('Orc', null);
        } else {
          this.translate.get(['GLOBAL.atencion', 'SEMAFORO.orc_no_puede_true']).subscribe(translations => {
            this.alertService.showAlert(
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
      this.cellClicked.emit({ data: params.data, field });
      return;
    }

    // Verificar si el campo le compete al usuario
    const fieldBelongsToUser = this.permissionsService.canEditColumnIfOrcNull(field, params.data, this.userRoles);
    
    if (!fieldBelongsToUser) {
      this.translate.get(['SEMAFORO.sin_acceso', 'SEMAFORO.sin_acceso_texto']).subscribe(translations => {
        this.alertService.showAlert(
          translations['SEMAFORO.sin_acceso'],
          translations['SEMAFORO.sin_acceso_texto']
        );
      });
      return;
    }

    // Verificar si ORC ya emitió concepto
    if (params.data.Orc !== null && field !== 'Orc' && field !== 'Observacion') {
      this.translate.get(['SEMAFORO.sin_acceso', 'SEMAFORO.orc_bloqueado']).subscribe(translations => {
        this.alertService.showAlert(
          translations['SEMAFORO.sin_acceso'],
          translations['SEMAFORO.orc_bloqueado']
        );
      });
      return;
    }

    // Cambiar valor booleano
    params.node.setDataValue(field, !params.value);
    this.cellClicked.emit({ data: params.data, field });
  }

  private canEditColumn(colField: string, rowData: SemaforoRow): boolean {
    return this.permissionsService.canEditColumn(colField, rowData, this.userRoles);
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.gridReady.emit(this.gridApi);
  }

  onCellValueChanged(event: any) {
    this.cellValueChanged.emit(event);
  }

  /**
   * Actualiza una fila específica con nuevos datos (para refrescar desde el servidor)
   */
  updateRowData(rowId: number, updatedData: SemaforoRow) {
    if (!this.gridApi) return;
    
    const rowNode = this.gridApi.getRowNode(rowId.toString());
    if (rowNode) {
      rowNode.setData(updatedData);
    }
  }

  /**
   * Actualiza un campo específico de una fila
   */
  updateCellValue(rowId: number, field: string, value: any) {
    if (!this.gridApi) return;
    
    const rowNode = this.gridApi.getRowNode(rowId.toString());
    if (rowNode) {
      rowNode.setDataValue(field, value);
    }
  }
}
