import { Component } from '@angular/core';
import { ColDef, ICellRendererParams, CellClickedEvent, GridReadyEvent, GridApi } from 'ag-grid-community';
import { SEMAFORO_ROW } from '../../constants/semaforo-row';
import { SemaforoRow, Semaforo } from '../../models/semaforo-row';

import { UserService } from '../../services/user.service';
import { SemaforoService } from '../../services/semaforo.service';
import { AlertService } from '../../services/alert.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-semaforo',
  standalone: false,
  templateUrl: './semaforo.component.html',
  styleUrl: './semaforo.component.scss'
})
export class SemaforoComponent {

  constructor(
    private userService: UserService,
    private semaforoService: SemaforoService,
    private alertaService: AlertService,
    private http: HttpClient
  ) {}

  private gridApi!: GridApi;

  loading = false;
  userRoles: string[] = [];
  columnDefs: ColDef[] = SEMAFORO_ROW;
  rowData: SemaforoRow[] = [];

  ngOnInit() {
    console.log('Componente Semáforo inicializado');
    this.printUserInfo();
    this.loadData();

    const editableFields: string[] = [
      'Academico', 'Financiero', 'Biblioteca', 'Laboratorios', 'Bienestar', 'Urelinter'
    ];

    this.columnDefs.forEach(col => {
      if (col.field && editableFields.includes(col.field)) {
        col.onCellClicked = (params: CellClickedEvent) => {
          params.node.setDataValue(col.field as string, !params.value);
        };
      }
    });
  }

  onRefreshClick(): void {
    this.loadData();
  }

  loadData() {
    console.log('Cargando datos del semáforo...');
    this.semaforoService.get('semaforo').subscribe({
      next: response => {
        const data = response.Data;
        this.rowData = data.map((item: any) => ({
          Id: item.Id,
          CodigoEstudiante: item.CodigoEstudiante,
          NombreEstudiante: item.NombreEstudiante,
          NombreFacultad: item.NombreFacultad,
          NombreProyecto: item.NombreProyecto,
          IdFacultadOikos: item.IdFacultadOikos || 0,
          IdProyectoOikos: item.IdProyectoOikos || 0,
          IdFacultadGedep: item.IdFacultadGedep || 0,
          IdProyectoAccra: item.IdProyectoAccra || 0,
          EstadoEstudiante: item.EstadoEstudiante || '',
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
          Activo: !!item.Activo,
          FechaCreacion: item.FechaCreacion || '',
          FechaModificacion: item.FechaModificacion || ''
        }));
      },
      error: error => {
        console.error('Error al obtener los datos del servidor:', error);
        this.alertaService.showAlert('Error','No se pudieron cargar los datos');
      }
    });
  }

  onCellValueChanged(event: any) {
    console.log('Datos actualizados:', event.data);
  }

  isItemEditable(userRoles: string[]) {
    return userRoles.includes('ADMIN_SGA') && !this.loading;
  }

  updateRow(event: any) {
    this.loading = true;
    const row: SemaforoRow = event.data;
    const putStruct: Partial<Semaforo> = {
      Observacion: row.Observacion,
      Academico: row.Academico,
      Financiero: row.Financiero,
      Biblioteca: row.Biblioteca,
      Laboratorios: row.Laboratorios,
      Bienestar: row.Bienestar,
      Urelinter: row.Urelinter,
      Orc: this.toggleORC(row)
    };

    console.log('Actualizando fila:', row.Id, putStruct);

    this.semaforoService.patch('semaforo', row.Id, putStruct).subscribe({
      next: () => {
        // Refrescar solo las celdas modificadas
        event.api.refreshCells({
          rowNodes: [event.node],
          columns: ['Observacion', 'Academico', 'Financiero', 'Biblioteca', 'Laboratorios', 'Bienestar', 'Urelinter', 'Orc']
        });
        this.loading = false;
      },
      error: err => {
        console.error('Error al actualizar semáforo:', err);
        this.alertaService.showAlert('Error','Error al actualizar datos');
        this.loading = false;
      }
    });
  }

  toggleORC(item: SemaforoRow): boolean {
    return (
      item.Academico &&
      item.Financiero &&
      item.Biblioteca &&
      item.Laboratorios &&
      item.Bienestar &&
      item.Urelinter
    );
  }

  printUserInfo() {
    this.userService.getUserRoles().then(roles => {
      this.userRoles = roles;

      const booleanFields = [
        'Academico', 'Financiero', 'Biblioteca', 'Laboratorios', 'Bienestar', 'Urelinter', 'Orc'
      ];

      this.columnDefs.forEach(col => {
        if (col.field && booleanFields.includes(col.field) && !this.isItemEditable(roles)) {
          col.editable = false;
          col.cellRenderer = (params: ICellRendererParams) => {
            return `<input type=\"checkbox\" ${params.value ? 'checked' : ''} disabled />`;
          };
        }
      });
    }).catch(error => {
      console.error('Error al obtener los roles del usuario:', error);
    });

    this.userService.getPersonaId().then(personaId => {
      console.log('ID de la persona:', personaId);
    }).catch(error => {
      console.error('Error al obtener el ID de la persona:', error);
    });
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
  }
}
