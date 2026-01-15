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
    width: 140
  },
  {
    headerName: 'NOMBRE',
    field: 'NombreEstudiante',
    editable: false,
    cellEditor: 'agTextCellEditor',
    cellEditorParams: {
      maxLength: 100
    },
  },
  {
    headerName: 'FACULTAD',
    field: 'NombreFacultad',
    editable: false,
    cellEditor: 'agTextCellEditor',
    cellEditorParams: {
      maxLength: 100
    },
  },
  {
    headerName: 'PROYECTO CURRICULAR',
    field: 'NombreProyecto',
    editable: false,
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
  },
  {
    headerName: 'PERIODO INSCRIPCIÓN',
    field: 'PerInsGrado',
    editable: false,
    width: 180,
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
    headerName: 'OBSERVACIÓN COORDINACIÓN',
    field: 'ObservacionCoordinacion',
    editable: false,
    cellEditor: 'agLargeTextCellEditor',
    cellEditorParams: {
      maxLength: 250,
      rows: 3,
      cols: 40,
    },
    width: 220
  },
  {
    headerName: 'OBSERVACIÓN BIBLIOTECA',
    field: 'ObservacionBiblioteca',
    editable: false,
    cellEditor: 'agLargeTextCellEditor',
    cellEditorParams: {
      maxLength: 250,
      rows: 3,
      cols: 40,
    },
    width: 220
  },
  {
    headerName: 'OBSERVACIÓN LABORATORIOS',
    field: 'ObservacionLaboratorios',
    editable: false,
    cellEditor: 'agLargeTextCellEditor',
    cellEditorParams: {
      maxLength: 250,
      rows: 3,
      cols: 40,
    },
    width: 220
  },
  {
    headerName: 'OBSERVACIÓN BIENESTAR',
    field: 'ObservacionBienestar',
    editable: false,
    cellEditor: 'agLargeTextCellEditor',
    cellEditorParams: {
      maxLength: 250,
      rows: 3,
      cols: 40,
    },
    width: 220
  },
  {
    headerName: 'OBSERVACIÓN URELINTER',
    field: 'ObservacionUrelinter',
    editable: false,
    cellEditor: 'agLargeTextCellEditor',
    cellEditorParams: {
      maxLength: 250,
      rows: 3,
      cols: 40,
    },
    width: 220
  },
  {
    headerName: 'OBSERVACIÓN REGISTRO Y CONTROL',
    field: 'ObservacionOrc',
    editable: false,
    cellEditor: 'agLargeTextCellEditor',
    cellEditorParams: {
      maxLength: 250,
      rows: 3,
      cols: 40,
    },
    width: 220
  }
];
