import { ColDef, ICellRendererParams } from 'ag-grid-community';

// Renderer para iconos de semáforo
const semaforoCellRenderer = (params: ICellRendererParams) => {
  if (params.value === null || params.value === undefined) {
    return `<span class="semaforo-icon neutral">
      <mat-icon class="material-icons">remove</mat-icon>
    </span>`;
  }
  const iconName = params.value ? 'check_circle' : 'cancel';
  const cssClass = params.value ? 'ok' : 'fail';
  return `<span class="semaforo-icon ${cssClass}">
    <mat-icon class="material-icons">${iconName}</mat-icon>
  </span>`;
};

// Configuraciones reutilizables
const TEXT_EDITOR_CONFIG = {
  cellEditor: 'agTextCellEditor',
  cellEditorParams: { maxLength: 100 }
};

const LARGE_TEXT_EDITOR_CONFIG = {
  cellEditor: 'agLargeTextCellEditor',
  cellEditorParams: {
    maxLength: 250,
    rows: 3,
    cols: 40,
  },
  width: 220
};

const SEMAFORO_COLUMN_CONFIG = {
  cellRenderer: semaforoCellRenderer,
  editable: false
};

// Funciones helper para crear columnas
const createBasicColumn = (headerName: string, field: string, width?: number): ColDef => ({
  headerName,
  field,
  editable: false,
  ...(width && { width })
});

const createEditableTextColumn = (headerName: string, field: string): ColDef => ({
  headerName,
  field,
  editable: false,
  ...TEXT_EDITOR_CONFIG
});

const createSemaforoColumn = (headerName: string, field: string): ColDef => ({
  headerName,
  field,
  ...SEMAFORO_COLUMN_CONFIG
});

const createObservationColumn = (headerName: string, field: string): ColDef => ({
  headerName,
  field,
  editable: false,
  ...LARGE_TEXT_EDITOR_CONFIG
});

// Definición de columnas usando las funciones helper
export const SEMAFORO_ROW: ColDef[] = [
  createBasicColumn('CÓDIGO', 'CodigoEstudiante', 140),
  createEditableTextColumn('NOMBRE', 'NombreEstudiante'),
  createEditableTextColumn('FACULTAD', 'NombreFacultad'),
  createEditableTextColumn('PROYECTO CURRICULAR', 'NombreProyecto'),
  createBasicColumn('AÑO INSCRIPCIÓN', 'AnioInsGrado', 180),
  createBasicColumn('PERIODO INSCRIPCIÓN', 'PerInsGrado', 180),
  createSemaforoColumn('ACADÉMICO', 'Academico'),
  createSemaforoColumn('FINANCIERO', 'Financiero'),
  createSemaforoColumn('BIBLIOTECA', 'Biblioteca'),
  createSemaforoColumn('LABORATORIOS', 'Laboratorios'),
  createSemaforoColumn('BIENESTAR', 'Bienestar'),
  createSemaforoColumn('URELINTER', 'Urelinter'),
  createSemaforoColumn('REGISTRO Y CONTROL', 'Orc'),
  createObservationColumn('OBSERVACIÓN COORDINACIÓN', 'ObservacionCoordinacion'),
  createObservationColumn('OBSERVACIÓN FINANCIERA', 'ObservacionFinanciera'),
  createObservationColumn('OBSERVACIÓN BIBLIOTECA', 'ObservacionBiblioteca'),
  createObservationColumn('OBSERVACIÓN LABORATORIOS', 'ObservacionLaboratorios'),
  createObservationColumn('OBSERVACIÓN BIENESTAR', 'ObservacionBienestar'),
  createObservationColumn('OBSERVACIÓN URELINTER', 'ObservacionUrelinter'),
  createObservationColumn('OBSERVACIÓN REGISTRO Y CONTROL', 'ObservacionOrc')
];
