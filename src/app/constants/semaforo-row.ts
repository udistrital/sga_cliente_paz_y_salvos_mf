import { ColDef, ICellRendererParams } from 'ag-grid-community';

const semaforoCellRenderer = (params: ICellRendererParams) => {
  return `<span class="semaforo-icon ${params.value ? 'ok' : 'fail'}">
    ${params.value ? '✔️' : '❌'}
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
    editable: true,
  },
  {
    headerName: 'FINANCIERO',
    field: 'Financiero',
    cellRenderer: semaforoCellRenderer,
    editable: true,
  },
  {
    headerName: 'BIBLIOTECA',
    field: 'Biblioteca',
    cellRenderer: semaforoCellRenderer,
    editable: true,
  },
  {
    headerName: 'LABORATORIOS',
    field: 'Laboratorios',
    cellRenderer: semaforoCellRenderer,
    editable: true,
  },
  {
    headerName: 'BIENESTAR',
    field: 'Bienestar',
    cellRenderer: semaforoCellRenderer,
    editable: true,
  },
  {
    headerName: 'URELINTER',
    field: 'Urelinter',
    cellRenderer: semaforoCellRenderer,
    editable: true,
  },
  {
    headerName: 'REGISTRO Y CONTROL',
    field: 'Orc',
    cellRenderer: semaforoCellRenderer,
    editable: true
  },
  {
    headerName: 'OBSERVACIÓN',
    field: 'Observacion',
    editable: true,
    cellEditor: 'agLargeTextCellEditor',
    cellEditorParams: {
      maxLength: 250,
      rows: 3,
      cols: 40,
    },
    width: 160

  }
];
