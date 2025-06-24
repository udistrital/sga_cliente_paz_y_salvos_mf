import { ColDef, ICellRendererParams, CellClickedEvent } from 'ag-grid-community';

export const SEMAFORO_ROW: ColDef[] = [
  {
    headerName: 'CODIGO',
    field: 'CodigoEstudiante',
    editable: false,
    filter: 'agTextColumnFilter',
    floatingFilter: false,
    width: 100
  },
  {
    headerName: 'NOMBRE',
    field: 'NombreEstudiante',
    editable: false,
    filter: 'agTextColumnFilter',
    floatingFilter: true,
    cellEditor: 'agTextCellEditor',
    cellEditorParams: {
      maxLength: 50
    },
  },
  {
    headerName: 'PROGRAMA',
    field: 'Programa',
    editable: true,
    cellEditor: 'agTextCellEditor',
    cellEditorParams: {
      maxLength: 50
    },
  },
  {
    headerName: 'ACADÉMICO',
    field: 'Academico',
    cellRenderer: (params: ICellRendererParams) => {
      return `<input type="checkbox" ${params.value ? 'checked' : ''} />`;
      // return `<input type="checkbox" ${params.value ? 'checked' : ''} onchange = "window.dispatchEvent(new CustomEvent('checkbox-toggled', { detail: ${JSON.stringify(params.data)} }))" />`;
    },
    editable: true,
  },
  {
    headerName: 'FINANCIERO ',
    field: 'Financiero',
    cellRenderer: (params: ICellRendererParams) => {
      return `<input type="checkbox" ${params.value ? 'checked' : ''} />`;
    },
    editable: true,
    // onCellClicked: (params: CellClickedEvent) => {
    //   params.node.setDataValue('Financiero', !params.value);
    // }
  },
  {
    headerName: 'BIBLIOTECA',
    field: 'Biblioteca',
    cellRenderer: (params: ICellRendererParams) => {
      return `<input type="checkbox" ${params.value ? 'checked' : ''} />`;
    },
    editable: true,
    // onCellClicked: (params: CellClickedEvent) => {
    //   params.node.setDataValue('Biblioteca', !params.value);
    // }
  },
  {
    headerName: 'LABORATORIOS',
    field: 'Laboratorios',
    cellRenderer: (params: ICellRendererParams) => {
      return `<input type="checkbox" ${params.value ? 'checked' : ''} />`;
    },
    editable: true,
    // onCellClicked: (params: CellClickedEvent) => {
    //   params.node.setDataValue('Laboratorios', !params.value);
    // }
  },
  {
    headerName: 'BIENESTAR',
    field: 'Bienestar',
    cellRenderer: (params: ICellRendererParams) => {
      return `<input type="checkbox" ${params.value ? 'checked' : ''} />`;
    },
    editable: true,
    // onCellClicked: (params: CellClickedEvent) => {
    //   params.node.setDataValue('checkBienestar', !params.value);
    // }
  },
  {
    headerName: 'URELINTER',
    field: 'Urelinter',
    cellRenderer: (params: ICellRendererParams) => {
      return `<input type="checkbox" ${params.value ? 'checked' : ''} />`;
    },
    editable: true,
    // onCellClicked: (params: CellClickedEvent) => {
    //   params.node.setDataValue('Urelinter', !params.value);
    // }
  },
  {
    headerName: 'REGISTRO Y CONTROL',
    field: 'Orc',
    cellRenderer: (params: ICellRendererParams) => {
      return `<input type="checkbox" ${params.value ? 'checked' : ''} />`;
    },
    editable: false,
    // onCellClicked: (params: CellClickedEvent) => {
    //   params.node.setDataValue('Orc', !params.value);
    // }
    cellClass: (params) => {
      return params.value ? 'cell-checked' : 'cell-unchecked';
    }
  }
];
