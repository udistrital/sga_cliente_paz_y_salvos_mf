import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class HttpErrorManager {
  constructor() {}

  public handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // Registra el error originado en el cliente o en la red.
      console.error('An error occurred:', error.error.message);
    } else {
      // Registra el código HTTP y la respuesta devuelta por el backend.

      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: `, error.error);
    }
    // Conserva el código HTTP para que las consultas puedan distinguir fallos
    // transitorios de errores funcionales.
    if(error.status === 200){
      return []
    }else {
      return throwError(() => error);
    }
  };
}
