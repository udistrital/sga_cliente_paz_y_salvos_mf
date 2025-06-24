import { Component } from '@angular/core';
import { ColDef, ICellRendererParams, CellClickedEvent, GridReadyEvent, GridApi } from 'ag-grid-community';
import { SEMAFORO_ROW } from '../../constants/semaforo-row';
import { SemaforoRow } from '../../models/semaforo-row';
import { PROGRAMAS_OIKOS } from '../../constants/programas-oikos';

import { UserService } from '../../services/user.service';
import { EventosService } from '../../services/eventos.service';
import { map, catchError } from "rxjs/operators";
import { AlertService } from '../../services/alert.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-semaforo',
  standalone: false,
  templateUrl: './semaforo.component.html',
  styleUrl: './semaforo.component.scss'
})
export class SemaforoComponent {

  constructor(private userService: UserService, private eventosService: EventosService, private alertaService: AlertService, private http: HttpClient) {
  }

  private gridApi!: GridApi;

  loading = false;

  userRoles: string[] = [];

  columnDefs: ColDef[] = SEMAFORO_ROW;

  rowData: SemaforoRow[] = [];

  programas: { id: number, nombre: string }[] = PROGRAMAS_OIKOS;


  getProgramaName(id: number): string | undefined {
    const found = this.programas.find(item => item.id === id);
    console.log('Programa encontrado:', found?.nombre);
    return found ? found.nombre : undefined;
  }

  ngOnInit() {
    console.log('Componente Semáforo inicializado');
    this.printUserInfo();
    console.log('Programas disponibles:', this.programas);
    this.loadData();
    // this.useFakeInfo();

    this.columnDefs.forEach(col => {
      const checkFields: string[] = ['Academico', 'Financiero', 'Biblioteca', 'Laboratorios', 'Bienestar', 'Urelinter'];
      if (col.field && checkFields.includes(col.field)) {
        col.onCellClicked = (params: CellClickedEvent) => {
          params.node.setDataValue(col.field as string, !params.value);
        };
      }
    });
  }

  loadData() {
    console.log('Cargando datos del semáforo...');

    this.eventosService.get('semaforo?limit=0&sortby=NombreEstudiante&order=asc').subscribe({
      next: (data) => {
        console.log('Datos obtenidos del servidor:', data);
        console.log("Programa: ", this.getProgramaName(74));
        this.rowData = data.map((item: any) => ({
          Id: item.Id,
          CodigoEstudiante: item.CodigoEstudiante,
          NombreEstudiante: item.NombreEstudiante,
          Programa: this.getProgramaName(item.IdProyectoOikos),
          IdFacultadOikos: item.IdFacultadOikos,
          IdProyectoOikos: item.IdProyectoOikos,
          IdFacultadGedep: item.IdFacultadGedep,
          IdProyectoAccra: item.IdProyectoAccra,
          EstadoEstudiante: item.EstadoEstudiante,
          AnioInsGrado: item.AnioInsGrado,
          PerInsGrado: item.PerInsGrado,
          Academico: !!item.Academico,
          Financiero: !!item.Financiero,
          Biblioteca: !!item.Biblioteca,
          Laboratorios: !!item.Laboratorios,
          Bienestar: !!item.Bienestar,
          Urelinter: !!item.Urelinter,
          Orc: !!item.Orc,
          Activo: !!item.Activo,
          FechaCreacion: item.FechaCreacion,
          FechaModificacion: item.FechaModificacion
        }));
      },
      error: (error) => {
        console.error('Error al obtener los datos del servidor:', error);
      }
    });
  }

  onCellValueChanged(event: any) {
    console.log('Datos actualizados:', event.data);
  }

  isItemEditable(userRoles: string[]) {
    return userRoles.includes("ADMIN_SGA") && this.loading === false;
  }

  updateRow(event: any) {
    this.loading = true;
    console.log('Actualizando datos del semáforo...');
    const putStruct = event.data as SemaforoRow;
    if (putStruct.Academico === true &&
      putStruct.Financiero === true &&
      putStruct.Biblioteca === true &&
      putStruct.Laboratorios === true &&
      putStruct.Bienestar === true &&
      putStruct.Urelinter === true
    ) {
      putStruct.Orc = true;
    } else {
      putStruct.Orc = false;
    }
    console.log('Datos a enviar:', putStruct);
    this.eventosService
      .put('semaforo', putStruct.Id, putStruct)
      .subscribe((res) => {
        const index = this.rowData.findIndex(row => row.Id === putStruct.Id);
        if (index !== -1) {
          this.rowData[index].Orc = putStruct.Orc;
        }
        // this.alertaService.showSuccessAlert(
        //   "Información editados correctamente"
        // );
        event.api.refreshCells({
          rowNodes: [event.node], columns: ['Orc']
        });
        this.loading = false;
      });
  }

  toogleORC(item: any): boolean {
    return (item.Academico && item.Financiero && item.Biblioteca && item.Laboratorios && item.Bienestar && item.Urelinter);
  }

  printUserInfo() {
    this.userService.getUserRoles().then(roles => {
      console.log('Roles del usuario:', roles);
      this.userRoles = roles;
      // Deshabilitar edición de columnas booleanas si el usuario no puede editar
      this.columnDefs.forEach(col => {
        // Ajusta aquí los nombres de los campos booleanos si es necesario
        const booleanFields = [
          'Academico', 'Financiero', 'Biblioteca', 'Laboratorios',
          'Bienestar', 'Urelinter', 'Orc'
        ];
        if (col.field && booleanFields.includes(col.field) && !this.isItemEditable(roles)) {
          col.editable = false;
          col.cellRenderer = (params: ICellRendererParams) => {
            return `<input type="checkbox" ${params.value ? 'checked' : ''} disabled />`;
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

  useFakeInfo() {
    this.rowData = [
      {
        Id: 6,
        CodigoEstudiante: 16970326320,
        NombreEstudiante: "Fernando Pedro Pérez Rodríguez",
        Programa: "Arquitectura",
        IdFacultadOikos: 17,
        IdProyectoOikos: 233,
        IdFacultadGedep: 24,
        IdProyectoAccra: 23,
        EstadoEstudiante: "T",
        AnioInsGrado: 2018,
        PerInsGrado: 3,
        Academico: true,
        Financiero: true,
        Biblioteca: true,
        Laboratorios: true,
        Bienestar: true,
        Urelinter: true,
        Orc: true,
        Activo: true,
        FechaCreacion: "2025-05-29T17:16:36.778618Z",
        FechaModificacion: "2025-05-29T17:16:36.778618Z"
      },
      {
        Id: 9,
        CodigoEstudiante: 35345937672,
        NombreEstudiante: "Juan Fernando Torres García",
        Programa: "Ingeniería de Sistemas",
        IdFacultadOikos: 14,
        IdProyectoOikos: 74,
        IdFacultadGedep: 33,
        IdProyectoAccra: 94,
        EstadoEstudiante: "X",
        AnioInsGrado: 2010,
        PerInsGrado: 3,
        Academico: true,
        Financiero: true,
        Biblioteca: true,
        Laboratorios: true,
        Bienestar: true,
        Urelinter: true,
        Orc: true,
        Activo: true,
        FechaCreacion: "2025-05-29T17:16:36.778618Z",
        FechaModificacion: "2025-05-29T17:16:36.778618Z"
      },
      {
        Id: 52,
        CodigoEstudiante: 82772322392,
        NombreEstudiante: "Alejandro Carlos Torres Pérez",
        Programa: "Ingeniería Civil",
        IdFacultadOikos: 17,
        IdProyectoOikos: 229,
        IdFacultadGedep: 24,
        IdProyectoAccra: 267,
        EstadoEstudiante: "A",
        AnioInsGrado: 2025,
        PerInsGrado: 1,
        Academico: true,
        Financiero: false,
        Biblioteca: true,
        Laboratorios: true,
        Bienestar: true,
        Urelinter: false,
        Orc: true,
        Activo: true,
        FechaCreacion: "2025-05-29T17:16:36.778618Z",
        FechaModificacion: "2025-05-29T17:16:36.778618Z"
      },
      {
        Id: 49,
        CodigoEstudiante: 58749917731,
        NombreEstudiante: "Andrés Carlos Torres Ramírez",
        Programa: "Ingeniería Civil",
        IdFacultadOikos: 14,
        IdProyectoOikos: 233,
        IdFacultadGedep: 33,
        IdProyectoAccra: 25,
        EstadoEstudiante: "H",
        AnioInsGrado: 2025,
        PerInsGrado: 1,
        Academico: true,
        Financiero: true,
        Biblioteca: true,
        Laboratorios: true,
        Bienestar: true,
        Urelinter: true,
        Orc: true,
        Activo: true,
        FechaCreacion: "2025-05-29T17:16:36.778618Z",
        FechaModificacion: "2025-05-29T17:16:36.778618Z"
      },
      {
        Id: 2,
        CodigoEstudiante: 42011871137,
        NombreEstudiante: "Pedro Andrés Torres Martínez",
        Programa: "Arquitectura",
        IdFacultadOikos: 65,
        IdProyectoOikos: 37,
        IdFacultadGedep: 23,
        IdProyectoAccra: 1,
        EstadoEstudiante: "V",
        AnioInsGrado: 2024,
        PerInsGrado: 3,
        Academico: true,
        Financiero: true,
        Biblioteca: true,
        Laboratorios: true,
        Bienestar: true,
        Urelinter: true,
        Orc: true,
        Activo: true,
        FechaCreacion: "2025-05-29T17:16:36.778618Z",
        FechaModificacion: "2025-05-29T17:16:36.778618Z"
      },
      {
        Id: 3,
        CodigoEstudiante: 84540132957,
        NombreEstudiante: "Pedro Daniel García González",
        Programa: "Ingeniería Electrónica",
        IdFacultadOikos: 14,
        IdProyectoOikos: 74,
        IdFacultadGedep: 33,
        IdProyectoAccra: 5,
        EstadoEstudiante: "T",
        AnioInsGrado: 2011,
        PerInsGrado: 3,
        Academico: true,
        Financiero: true,
        Biblioteca: true,
        Laboratorios: true,
        Bienestar: true,
        Urelinter: true,
        Orc: true,
        Activo: true,
        FechaCreacion: "2025-05-29T17:16:36.778618Z",
        FechaModificacion: "2025-05-29T17:16:36.778618Z"
      },
      {
        Id: 4,
        CodigoEstudiante: 2494525239,
        NombreEstudiante: "Pedro Juan Torres López",
        Programa: "Ingeniería Electrónica",
        IdFacultadOikos: 14,
        IdProyectoOikos: 74,
        IdFacultadGedep: 33,
        IdProyectoAccra: 5,
        EstadoEstudiante: "T",
        AnioInsGrado: 2011,
        PerInsGrado: 1,
        Academico: true,
        Financiero: true,
        Biblioteca: true,
        Laboratorios: true,
        Bienestar: true,
        Urelinter: true,
        Orc: true,
        Activo: true,
        FechaCreacion: "2025-05-29T17:16:36.778618Z",
        FechaModificacion: "2025-05-29T17:16:36.778618Z"
      },
      {
        Id: 7,
        CodigoEstudiante: 48069498619,
        NombreEstudiante: "Juan Pedro Rodríguez Pérez",
        Programa: "Ingeniería Civil",
        IdFacultadOikos: 65,
        IdProyectoOikos: 23,
        IdFacultadGedep: 23,
        IdProyectoAccra: 32,
        EstadoEstudiante: "U",
        AnioInsGrado: 2024,
        PerInsGrado: 1,
        Academico: true,
        Financiero: true,
        Biblioteca: true,
        Laboratorios: true,
        Bienestar: true,
        Urelinter: true,
        Orc: true,
        Activo: true,
        FechaCreacion: "2025-05-29T17:16:36.778618Z",
        FechaModificacion: "2025-05-29T17:16:36.778618Z"
      },
      {
        Id: 12,
        CodigoEstudiante: 38763618386,
        NombreEstudiante: "Fernando Pedro Rodríguez Martínez",
        Programa: "Ingeniería Civil",
        IdFacultadOikos: 35,
        IdProyectoOikos: 147,
        IdFacultadGedep: 101,
        IdProyectoAccra: 102,
        EstadoEstudiante: "D",
        AnioInsGrado: 2024,
        PerInsGrado: 3,
        Academico: true,
        Financiero: true,
        Biblioteca: true,
        Laboratorios: true,
        Bienestar: true,
        Urelinter: true,
        Orc: true,
        Activo: true,
        FechaCreacion: "2025-05-29T17:16:36.778618Z",
        FechaModificacion: "2025-05-29T17:16:36.778618Z"
      },
      {
        Id: 13,
        CodigoEstudiante: 28585441559,
        NombreEstudiante: "Alejandro José Sánchez Hernández",
        Programa: "Ingeniería de Sistemas",
        IdFacultadOikos: 232,
        IdProyectoOikos: 236,
        IdFacultadGedep: 41,
        IdProyectoAccra: 167,
        EstadoEstudiante: "H",
        AnioInsGrado: 2025,
        PerInsGrado: 1,
        Academico: true,
        Financiero: true,
        Biblioteca: true,
        Laboratorios: true,
        Bienestar: true,
        Urelinter: true,
        Orc: true,
        Activo: true,
        FechaCreacion: "2025-05-29T17:16:36.778618Z",
        FechaModificacion: "2025-05-29T17:16:36.778618Z"
      }
    ];
  }

}
