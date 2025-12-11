import { ColDef, ICellRendererParams } from 'ag-grid-community';

const semaforoCellRenderer = (params: ICellRendererParams) => {
  const iconName = params.value ? 'check_circle' : 'cancel';
  const cssClass = params.value ? 'ok' : 'fail';
  return `<span class="semaforo-icon ${cssClass}">
    <mat-icon class="material-icons">${iconName}</mat-icon>
  </span>`;
};


export const SEMAFORO_ROW: ColDef[] = [
  {
    headerName: 'CÓDIGO',
    field: 'CodigoEstudiante',
    editable: false,
    filter: 'agTextColumnFilter',
    floatingFilter: true,
    width: 140
  },
  {
    headerName: 'NOMBRE',
    field: 'NombreEstudiante',
    editable: false,
    filter: 'agTextColumnFilter',
    floatingFilter: true,
    cellEditor: 'agTextCellEditor',
    cellEditorParams: {
      maxLength: 100
    },
  },
  {
    headerName: 'FACULTAD',
    field: 'NombreFacultad',
    editable: false,
    filter: 'agTextColumnFilter',
    floatingFilter: true,
    cellEditor: 'agTextCellEditor',
    cellEditorParams: {
      maxLength: 100
    },
  },
  {
    headerName: 'PROYECTO CURRICULAR',
    field: 'NombreProyecto',
    editable: false,
    filter: 'agTextColumnFilter',
    floatingFilter: true,
    cellEditor: 'agTextCellEditor',
    cellEditorParams: {
      maxLength: 100
    },
  },
  {
    headerName: 'AÑO INSCRIPCIÓN',
    field: 'AnioInsGrado',
    editable: false,
    width: 180,
    filter: 'agNumberColumnFilter',
    floatingFilter: true,
  },
  {
    headerName: 'PERIODO INSCRIPCIÓN',
    field: 'PerInsGrado',
    editable: false,
    width: 180,
    filter: 'agNumberColumnFilter',
    floatingFilter: true,
  },
  {
    headerName: 'ACADÉMICO',
    field: 'Academico',
    cellRenderer: semaforoCellRenderer,
    editable: false,
  },
  {
    headerName: 'FINANCIERO',
    field: 'Financiero',
    cellRenderer: semaforoCellRenderer,
    editable: false,
  },
  {
    headerName: 'BIBLIOTECA',
    field: 'Biblioteca',
    cellRenderer: semaforoCellRenderer,
    editable: false,
  },
  {
    headerName: 'LABORATORIOS',
    field: 'Laboratorios',
    cellRenderer: semaforoCellRenderer,
    editable: false,
  },
  {
    headerName: 'BIENESTAR',
    field: 'Bienestar',
    cellRenderer: semaforoCellRenderer,
    editable: false,
  },
  {
    headerName: 'URELINTER',
    field: 'Urelinter',
    cellRenderer: semaforoCellRenderer,
    editable: false,
  },
  {
    headerName: 'REGISTRO Y CONTROL',
    field: 'Orc',
    cellRenderer: semaforoCellRenderer,
    editable: false,
  },
  {
    headerName: 'OBSERVACIÓN',
    field: 'Observacion',
    editable: false,
    cellEditor: 'agLargeTextCellEditor',
    cellEditorParams: {
      maxLength: 250,
      rows: 3,
      cols: 40,
    },
    width: 160

  }
];
