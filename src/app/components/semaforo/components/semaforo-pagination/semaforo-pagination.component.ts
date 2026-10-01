import { Component, Input, Output, EventEmitter } from '@angular/core';
import { PermisosService } from '../../../../services/permisos.service';

/**
 * Componente de paginación para la tabla del semáforo
 * Maneja la navegación entre páginas y el cambio de tamaño de página
 */
@Component({
  selector: 'app-semaforo-pagination',
  templateUrl: './semaforo-pagination.component.html',
  styleUrls: ['./semaforo-pagination.component.scss']
})
export class SemaforoPaginationComponent {
  @Input() perfil = '';
  constructor(public permisos: PermisosService) {}
  @Input() currentPage: number = 0;
  @Input() pageSize: number = 20;
  @Input() totalRecords: number = 0;
  @Input() loading: boolean = false;

  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() firstPage = new EventEmitter<void>();
  @Output() previousPage = new EventEmitter<void>();
  @Output() nextPage = new EventEmitter<void>();
  @Output() lastPage = new EventEmitter<void>();

  Math = Math; // Para usar Math.min en el template

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.pageSize);
  }

  get startRecord(): number {
    return this.currentPage * this.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min((this.currentPage + 1) * this.pageSize, this.totalRecords);
  }

  get canGoPrevious(): boolean {
    return this.permisos.permite('paz_salvos_paginar', 'Botón', this.perfil) && this.currentPage > 0 && !this.loading;
  }

  get canGoNext(): boolean {
    return this.permisos.permite('paz_salvos_paginar', 'Botón', this.perfil) && this.currentPage < this.totalPages - 1 && !this.loading;
  }

  onPageSizeChange(newSize: number): void {
    if (!this.permisos.permite('paz_salvos_paginar', 'Botón', this.perfil) || this.loading) return;
    this.pageSizeChange.emit(newSize);
  }

  onFirstPage(): void {
    if (this.canGoPrevious) {
      this.firstPage.emit();
    }
  }

  onPreviousPage(): void {
    if (this.canGoPrevious) {
      this.previousPage.emit();
    }
  }

  onNextPage(): void {
    if (this.canGoNext) {
      this.nextPage.emit();
    }
  }

  onLastPage(): void {
    if (this.canGoNext) {
      this.lastPage.emit();
    }
  }
}
