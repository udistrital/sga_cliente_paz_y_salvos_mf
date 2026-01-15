export interface Semaforo {
  Id: number; // int64
  CodigoEstudiante: number; // double
  IdFacultadOikos: number; // int32
  IdProyectoOikos: number; // int32
  IdFacultadGedep: number; // int32
  IdProyectoAccra: number; // int32

  AnioInsGrado: number; // double
  PerInsGrado: number; // double

  Academico: boolean;
  Financiero: boolean;
  Biblioteca: boolean;
  Laboratorios: boolean;
  Bienestar: boolean;
  Urelinter: boolean;
  Orc: boolean;

  Activo: boolean;
  Observacion: string;
  ObservacionCoordinacion: string;
  ObservacionBiblioteca: string;
  ObservacionLaboratorios: string;
  ObservacionBienestar: string;
  ObservacionUrelinter: string;
  ObservacionOrc: string;
  FechaCreacion: string; // datetime
  FechaModificacion: string; // datetime
}
export interface SemaforoRow extends Semaforo {
  NombreEstudiante: string;
  NombreFacultad: string;
  NombreProyecto: string;
}
