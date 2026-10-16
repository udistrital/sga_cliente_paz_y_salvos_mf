import { Component, EventEmitter, Input, NgZone, OnChanges, OnDestroy, OnInit, Output } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { CodigoEstadoPazSalvo, CodigoTipoPazSalvo, SolicitudPazSalvosGrado } from '../../services/paz-salvos-grado.service';

const TIPOS: CodigoTipoPazSalvo[] = [
  'TPS_COORDINACION', 'TPS_FINANCIERO', 'TPS_BIBLIOTECA', 'TPS_LABORATORIOS',
  'TPS_BIENESTAR', 'TPS_URELINTER', 'TPS_EXTENSION', 'TPS_SECRETARIA'
];

@Component({
  selector: 'app-paz-salvos-grado-grid',
  standalone: true,
  imports: [AgGridAngular],
  templateUrl: './paz-salvos-grado-grid.component.html',
  styleUrls: ['./paz-salvos-grado-grid.component.scss']
})
export class PazSalvosGradoGridComponent implements OnInit, OnChanges, OnDestroy {
  @Input() rowData: SolicitudPazSalvosGrado[] = [];
  @Input() tipo?: CodigoTipoPazSalvo;
  @Output() decidir = new EventEmitter<SolicitudPazSalvosGrado>();
  @Output() abrirExpediente = new EventEmitter<SolicitudPazSalvosGrado>();

  columnDefs: ColDef<SolicitudPazSalvosGrado>[] = [];
  readonly defaultColDef: ColDef<SolicitudPazSalvosGrado> = { resizable: true, sortable: true };
  readonly getRowId = (params: { data: SolicitudPazSalvosGrado }) => String(params.data.Solicitud.Id);
  private cambioIdioma?: Subscription;

  constructor(private translate: TranslateService, private zona: NgZone) {}

  ngOnInit(): void {
    this.construirColumnas();
    this.cambioIdioma = this.translate.onLangChange.subscribe(() => this.construirColumnas());
  }

  ngOnChanges(): void { this.construirColumnas(); }

  ngOnDestroy(): void { this.cambioIdioma?.unsubscribe(); }

  private construirColumnas(): void {
    this.columnDefs = [
      {
        headerName: this.tr('columnas.codigo'), minWidth: 145, pinned: 'left',
        valueGetter: params => params.data?.Solicitud.CodigoEstudiante || '',
        cellRenderer: (params: ICellRendererParams<SolicitudPazSalvosGrado>) => this.renderCodigo(params)
      },
      { headerName: this.tr('columnas.periodo'), minWidth: 120, valueGetter: params => params.data?.Periodo || '' },
      { headerName: this.tr('columnas.programa'), minWidth: 220, valueGetter: params => params.data?.Programa || '' },
      ...TIPOS.map(tipo => this.columnaCheck(tipo))
    ];
  }

  private columnaCheck(tipo: CodigoTipoPazSalvo): ColDef<SolicitudPazSalvosGrado> {
    const gestionable = tipo === this.tipo;
    return {
      colId: tipo,
      headerName: this.tr(`tipos.${tipo}`),
      minWidth: 145,
      sortable: false,
      valueGetter: params => params.data?.Checks.find(check => check.PazSalvo.TipoCodigo === tipo)?.EstadoActual.EstadoCodigo || 'PS_PENDIENTE',
      tooltipValueGetter: params => {
        const estado = params.value as CodigoEstadoPazSalvo;
        const etiqueta = this.tr(`estados.${estado}`);
        return gestionable ? `${etiqueta}. ${this.tr('acciones.gestionar')}` : etiqueta;
      },
      cellClass: gestionable ? 'check-celda check-celda-gestionable' : 'check-celda',
      cellRenderer: (params: ICellRendererParams<SolicitudPazSalvosGrado>) => this.renderEstado(params, gestionable)
    };
  }

  private renderEstado(params: ICellRendererParams<SolicitudPazSalvosGrado>, gestionable: boolean): HTMLElement {
    const estado = params.value as CodigoEstadoPazSalvo;
    const elemento = document.createElement(gestionable ? 'button' : 'span');
    elemento.className = `check-estado check-estado--${estado.toLowerCase()}`;
    if (gestionable) {
      const boton = elemento as HTMLButtonElement;
      boton.type = 'button';
      boton.setAttribute('aria-label', `${this.tr('acciones.gestionar')}: ${this.tr(`tipos.${this.tipo}`)}, ${this.tr(`estados.${estado}`)}`);
      boton.addEventListener('click', evento => {
        evento.stopPropagation();
        if (params.data) this.zona.run(() => this.decidir.emit(params.data));
      });
    }
    const icono = document.createElement('span');
    icono.className = 'material-icons';
    icono.textContent = estado === 'PS_APROBADO' ? 'check_circle' : estado === 'PS_DESAPROBADO' ? 'cancel' : 'schedule';
    const texto = document.createElement('span');
    texto.textContent = this.tr(`estados.${estado}`);
    elemento.append(icono, texto);
    return elemento;
  }

  private renderCodigo(params: ICellRendererParams<SolicitudPazSalvosGrado>): HTMLElement {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'codigo-expediente';
    boton.textContent = String(params.value || '');
    boton.setAttribute('aria-label', `${this.tr('acciones.abrir_expediente')} ${boton.textContent}`);
    boton.addEventListener('click', evento => {
      evento.stopPropagation();
      if (params.data) this.zona.run(() => this.abrirExpediente.emit(params.data));
    });
    return boton;
  }

  private tr(clave: string): string { return this.translate.instant(`PAZ_SALVOS_GRADO.${clave}`); }
}
