export interface SemaforoRow {
  Id: number;
  CodigoEstudiante: number;
  NombreEstudiante: string;
  NombreFacultad: string;
  NombreProyecto: string;
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

  Activo: boolean;
  ObservacionCoordinacion: string;
  ObservacionBiblioteca: string;
  ObservacionLaboratorios: string;
  ObservacionBienestar: string;
  ObservacionUrelinter: string;
  ObservacionOrc: string;
  ObservacionFinanciera: string;
  FechaCreacion: string;
  FechaModificacion: string;
}
