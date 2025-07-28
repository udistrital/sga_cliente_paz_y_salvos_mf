import { Component } from '@angular/core';
import { ColDef, CellClickedEvent, GridReadyEvent, GridApi } from 'ag-grid-community';
import { SEMAFORO_ROW } from '../../constants/semaforo-row';
import { SemaforoRow, Semaforo } from '../../models/semaforo-row';

import { UserService } from '../../services/user.service';
import { SemaforoService } from '../../services/semaforo.service';
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

  // Boolean fields for special handling
  readonly booleanFields = [
    'Academico', 'Financiero', 'Biblioteca', 'Laboratorios', 'Bienestar', 'Urelinter', 'Orc'
  ];

  // Clone columnDefs to allow runtime changes
  columnDefs: ColDef[] = SEMAFORO_ROW.map(col => ({ ...col }));

  constructor(
    private userService: UserService,
    private semaforoService: SemaforoService,
    private alertaService: AlertService
  ) { }


  async ngOnInit() {
    await this.loadUserInfo();
    this.setupColumnDefs();
    this.loadData();
  }

  private async loadUserInfo() {
    try {
      this.userRoles = await this.userService.getUserRoles();
      await this.userService.getPersonaId(); // Only for logging
    } catch (error) {
      console.error('Error loading user info:', error);
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
    });
  }

  private canEditColumnIfOrcFalse(colField: string, rowData: SemaforoRow): boolean {
    const tempRow = { ...rowData, Orc: false };
    return this.canEditColumn(colField, tempRow);
  }

  onRefreshClick(): void {
    this.loadData();
  }

  private async loadData() {
    let endpoint = 'semaforo';
    if (this.userRoles.includes('ESTUDIANTE')) {
      try {
        const codigo = await this.userService.getCodigoEstudiante();
        endpoint = `semaforo/estudiante/${codigo}`;
      } catch (error) {
        this.alertaService.showAlert('Error', 'No se pudo obtener el código del estudiante');
        return;
      }
    } else if (this.userRoles.includes('SECRETARIA_ACADEMICA')) {
      const id = await this.userService.getUserDocument();
      endpoint = `semaforo/facultad/${id}`;
    } else if (this.userRoles.includes('COORDINADOR')) {
      const id = await this.userService.getUserDocument();
      endpoint = `semaforo/proyecto/${id}`;
    }
    this.semaforoService.get(endpoint).subscribe({
      next: response => {
        this.rowData = (response.Data || []).map((item: any) => ({
          Id: item.Id,
          CodigoEstudiante: item.CodigoEstudiante,
          NombreEstudiante: item.NombreEstudiante,
          NombreFacultad: item.NombreFacultad,
          NombreProyecto: item.NombreProyecto,
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
        }));
      },
      error: error => {
        console.error('Error loading data:', error);
        this.alertaService.showAlert('Error', 'No se pudieron cargar los datos');
      }
    });
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
    const putStruct: Partial<Semaforo> = {
      Observacion: row.Observacion,
      Academico: row.Academico,
      Financiero: row.Financiero,
      Biblioteca: row.Biblioteca,
      Laboratorios: row.Laboratorios,
      Bienestar: row.Bienestar,
      Urelinter: row.Urelinter,
      Orc: row.Orc
    };

    this.semaforoService.patch('semaforo', row.Id, putStruct).subscribe({
      next: () => { this.loading = false; },
      error: err => {
        console.error('Error updating row:', err);
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
    if (this.userRoles.includes('COORDINADOR')) {
      return colField === 'Academico' || colField === 'Financiero';
    }
    if (this.userRoles.includes('BIBLIOTECA')) {
      return colField === 'Biblioteca';
    }
    if (this.userRoles.includes('LABORATORIOS')) {
      return colField === 'Laboratorios';
    }
    if (this.userRoles.includes('ADMIN_BIENESTAR')) {
      return colField === 'Bienestar';
    }
    if (this.userRoles.includes('URELINTER')) {
      return colField === 'Urelinter';
    }
    // SECRETARIA_ACADEMICA y ESTUDIANTE solo consulta
    return false;
  }
}