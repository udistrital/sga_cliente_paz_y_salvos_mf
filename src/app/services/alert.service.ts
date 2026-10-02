import { Injectable } from "@angular/core";
// @ts-ignore
import Swal from "sweetalert2/dist/sweetalert2";
import type { SweetAlertResult } from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

export interface ConfirmAlertOptions {
  titleKey?: string;
  textParams?: Record<string, string | number>;
  confirmButtonKey?: string;
  cancelButtonKey?: string;
}

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

  async showConfirmAlert(textKey: string, options: ConfirmAlertOptions = {}): Promise<SweetAlertResult> {
    const titleKey = options.titleKey || 'GLOBAL.atencion';
    const confirmButtonKey = options.confirmButtonKey || 'GLOBAL.aceptar';
    const cancelButtonKey = options.cancelButtonKey || 'GLOBAL.cancelar';
    const translations = await firstValueFrom(this.translate.get(
      [titleKey, textKey, confirmButtonKey, cancelButtonKey], options.textParams
    ));
    return Swal.fire({
      title: translations[titleKey],
      text: translations[textKey],
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: translations[cancelButtonKey],
      confirmButtonText: translations[confirmButtonKey],
      focusCancel: true,
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
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        },
        customClass: {
          confirmButton: "alertaConfirmarBoton",
          cancelButton: "alertaCancelarBoton",
        },
      });
    });
  }

  closeLoading() {
    Swal.close();
  }
}
