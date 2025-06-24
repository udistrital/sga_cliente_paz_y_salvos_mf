export interface SemaforoRow {
  Id: number;
  CodigoEstudiante: number;
  NombreEstudiante: string;
  Programa: string;
  IdFacultadOikos: number;
  IdProyectoOikos: number;
  IdFacultadGedep: number;
  IdProyectoAccra: number;
  EstadoEstudiante: string;
  AnioInsGrado: number;
  PerInsGrado: number;
  Academico: boolean;
  Financiero: boolean;
  Biblioteca: boolean;
  Laboratorios: boolean;
  Bienestar: boolean;
  Urelinter: boolean;
  Orc: boolean;
  Activo: boolean;
  FechaCreacion: string;
  FechaModificacion: string;
}