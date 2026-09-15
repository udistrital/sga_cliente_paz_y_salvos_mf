import { Injectable } from "@angular/core";
// @ts-ignore
import Swal from "sweetalert2/dist/sweetalert2";
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: "root",
})
export class AlertService {
  constructor(private translate: TranslateService) { }

  async showAlert(title: string, text: string): Promise<any> {
    const translations = await firstValueFrom(this.translate.get(['GLOBAL.aceptar']));
    return Swal.fire({
      icon: "info",
      title: title,
      text: text,
      confirmButtonText: translations['GLOBAL.aceptar'],
      customClass: {
        confirmButton: "alertaConfirmarBoton",
        cancelButton: "alertaCancelarBoton",
        icon: "alertaIconoWarn",
      },
    });
  }

  showSuccessAlert(text: string, title?: string) {
    this.translate.get(['GLOBAL.operacion_exitosa', 'GLOBAL.aceptar']).subscribe(translations => {
      Swal.fire({
        icon: "success",
        title: title || translations['GLOBAL.operacion_exitosa'],
        text: text,
        confirmButtonText: translations['GLOBAL.aceptar'],
        customClass: {
          confirmButton: "alertaConfirmarBoton",
          cancelButton: "alertaCancelarBoton",
          icon: "alertaIconoSuccess",
        },
      });
    });
  }

  showErrorAlert(text: string) {
    this.translate.get(['GLOBAL.error', 'GLOBAL.aceptar']).subscribe(translations => {
      Swal.fire({
        icon: "error",
        title: translations['GLOBAL.error'],
        text: text,
        confirmButtonText: translations['GLOBAL.aceptar'],
        customClass: {
          confirmButton: "alertaConfirmarBoton",
          cancelButton: "alertaCancelarBoton",
        },
      });
    });
  }

  async showConfirmAlert(text: string, title?: string): Promise<any> {
    const translations = await firstValueFrom(this.translate.get(['GLOBAL.atencion', 'GLOBAL.aceptar', 'GLOBAL.cancelar']));
    return Swal.fire({
      title: title || translations['GLOBAL.atencion'],
      text: text,
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: translations['GLOBAL.cancelar'],
      confirmButtonText: translations['GLOBAL.aceptar'],
      customClass: {
        confirmButton: "alertaConfirmarBoton",
        cancelButton: "alertaCancelarBoton",
        icon: "alertaIconoConfirmacion",
      },
    });
  }

  showLoading(text?: string) {
    this.translate.get('GLOBAL.cargando').subscribe(translation => {
      Swal.fire({
        title: text || translation,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });
    });
  }

  closeLoading() {
    Swal.close();
  }
}
