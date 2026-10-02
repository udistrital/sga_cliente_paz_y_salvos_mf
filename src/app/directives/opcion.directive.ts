import { Directive, Input, OnDestroy, TemplateRef, ViewContainerRef } from '@angular/core';
import { PermisosService } from '../services/permisos.service';

@Directive({ selector: '[appOpcion]', standalone: true })
export class OpcionDirective implements OnDestroy {
  private nombre = '';
  private tipo = 'Botón';
  private perfil?: string;
  private visible = false;
  private cambios = this.permisos.cambios$.subscribe(() => this.actualizar());

  constructor(private template: TemplateRef<unknown>, private container: ViewContainerRef, private permisos: PermisosService) {}
  @Input() set appOpcion(valor: string) { this.nombre = valor; this.actualizar(); }
  @Input() set appOpcionTipo(valor: string) { this.tipo = valor; this.actualizar(); }
  @Input() set appOpcionPerfil(valor: string | undefined) { this.perfil = valor; this.actualizar(); }

  private actualizar(): void {
    const permitido = this.permisos.permite(this.nombre, this.tipo, this.perfil);
    if (permitido && !this.visible) { this.visible = true; this.container.createEmbeddedView(this.template); }
    else if (!permitido && this.visible) { this.visible = false; this.container.clear(); }
  }
  ngOnDestroy(): void { this.cambios.unsubscribe(); }
}
