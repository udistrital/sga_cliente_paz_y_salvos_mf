export interface SemaforoRecord {
  Id: number;
  CodigoEstudiante: number;
  IdFacultadOikos: number;
  IdProyectoOikos: number;
  IdFacultadGedep: number;
  IdProyectoAccra: number;
  AnioInsGrado: number;
  PerInsGrado: number;
  Academico: boolean;
  Financiero: boolean;
  Biblioteca: boolean;
  Laboratorios: boolean;
  Bienestar: boolean;
  Urelinter: boolean;
  Orc: boolean | null;
  ObservacionCoordinacion: string;
  ObservacionBiblioteca: string;
  ObservacionLaboratorios: string;
  ObservacionBienestar: string;
  ObservacionUrelinter: string;
  ObservacionOrc: string;
  ObservacionFinanciera: string;
  Activo: boolean;
  FechaCreacion: string;
  FechaModificacion: string;
}

export interface SemaforoTable {
  Id: number;
  CodigoEstudiante: number;
  NombreEstudiante: string;
  NombreFacultad: string;
  NombreProyecto: string;
  AnioInsGrado: number;
  PerInsGrado: number;
  Academico: boolean;
  Financiero: boolean;
  Biblioteca: boolean;
  Laboratorios: boolean;
  Bienestar: boolean;
  Urelinter: boolean;
  Orc: boolean | null;
  ObservacionCoordinacion: string;
  ObservacionBiblioteca: string;
  ObservacionLaboratorios: string;
  ObservacionBienestar: string;
  ObservacionUrelinter: string;
  ObservacionOrc: string;
  ObservacionFinanciera: string;
}

export interface ProyectoAsignadoApi {
  IdOikos: number;
  Codigo: string;
  Nombre: string;
}

export interface SemaforosData {
  Semaforos: SemaforoTable[];
  Limit: number;
  TotalCount: number;
  EsAsistente?: boolean;
  ProyectosAsignados?: ProyectoAsignadoApi[];
  IdFacultadOikos?: number;
}

export type SemaforoPatch = Partial<Pick<SemaforoRecord,
  | 'Academico'
  | 'Financiero'
  | 'Biblioteca'
  | 'Laboratorios'
  | 'Bienestar'
  | 'Urelinter'
  | 'Orc'
  | 'ObservacionCoordinacion'
  | 'ObservacionBiblioteca'
  | 'ObservacionLaboratorios'
  | 'ObservacionBienestar'
  | 'ObservacionUrelinter'
  | 'ObservacionOrc'
  | 'ObservacionFinanciera'
>>;

export type SemaforoPatchField = keyof SemaforoPatch;
