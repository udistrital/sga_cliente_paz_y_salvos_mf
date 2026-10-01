import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { SemaforoFilters, CatalogoOption } from '../../../../models/semaforo-filters.model';
import { SemaforoPermissionsService } from '../../../../services/semaforo-permissions.service';
import { PermisosService } from '../../../../services/permisos.service';

/**
 * Componente de filtros para la tabla del semáforo
 * Maneja la selección de criterios de búsqueda según los permisos del usuario
 */
@Component({
  selector: 'app-semaforo-filters',
  templateUrl: './semaforo-filters.component.html',
  styleUrls: ['./semaforo-filters.component.scss']
})
export class SemaforoFiltersComponent implements OnInit {
  @Input() userRoles: string[] = [];
  @Input() filters!: SemaforoFilters;
  @Input() facultades: CatalogoOption[] = [];
  @Input() proyectos: CatalogoOption[] = [];
  @Input() loadingFacultades: boolean = false;
  @Input() loadingProyectos: boolean = false;
  @Input() expanded: boolean = false;

  @Output() filtersChange = new EventEmitter<SemaforoFilters>();
  @Output() facultadChange = new EventEmitter<number | null>();
  @Output() search = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();

  constructor(private permissionsService: SemaforoPermissionsService, public permisos: PermisosService) {}
  get perfil(): string { return this.userRoles.length === 1 ? this.userRoles[0] : ''; }

  ngOnInit(): void {
    if (!this.filters) {
      this.filters = {
        codigoEstudiante: '',
        idFacultad: null,
        idProyecto: null,
        anioInsGrado: null,
        perInsGrado: null
      };
    }
  }

  get canUseCodigoFilter(): boolean {
    return this.permissionsService.canUseCodigoFilter(this.userRoles);
  }

  get canUseFacultadFilter(): boolean {
    return this.permissionsService.canUseFacultadFilter(this.userRoles);
  }

  get canUseProyectoFilter(): boolean {
    return this.permissionsService.canUseProyectoFilter(this.userRoles);
  }

  get canUseAnioFilter(): boolean {
    return this.permissionsService.canUseAnioFilter(this.userRoles);
  }

  get canUsePeriodoFilter(): boolean {
    return this.permissionsService.canUsePeriodoFilter(this.userRoles);
  }

  onFacultadChange(facultadId: number | null): void {
    if (!this.canUseFacultadFilter) return;
    this.filters.idFacultad = facultadId;
    this.filters.idProyecto = null; // Limpiar proyecto al cambiar facultad
    this.facultadChange.emit(facultadId);
  }

  onFilterChange(): void {
    this.filtersChange.emit(this.filters);
  }

  onSearch(): void {
    if (!this.permisos.permite('paz_salvos_buscar', 'Botón', this.perfil)) return;
    this.search.emit();
  }

  onClear(): void {
    if (!this.permisos.permite('paz_salvos_limpiar_filtros', 'Botón', this.perfil)) return;
    this.clear.emit();
  }
}
