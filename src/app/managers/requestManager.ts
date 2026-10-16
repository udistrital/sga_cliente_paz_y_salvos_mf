import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { HttpErrorManager } from './errorManager';

/** Gestiona las peticiones HTTP a los servicios configurados en environment. */
@Injectable({
  providedIn: 'root',
})
export class RequestManager {
  private path!: any;
  constructor(private http: HttpClient, private errManager: HttpErrorManager) {}

  // Obtiene el token vigente en cada petición para acompañar la sesión actual.
  public get httpOptions(): { headers: HttpHeaders } {
    const token = window.localStorage.getItem('access_token');
    return { headers: token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders() };
  }

  public get httpOptionsOnlyAuth(): { headers: HttpHeaders } {
    return this.httpOptions;
  }


  /** Selecciona la URL base de un servicio definido en environment. */
  public setPath(service: string) {
    const value = environment[service as keyof typeof environment];
    if (typeof value === 'string') {
      this.path = value;
    } else {
      throw new Error(`Environment variable for service "${service}" is not a string.`);
    }
  }


  /** Consulta un endpoint GET y entrega el cuerpo de su respuesta. */
  get(endpoint: string) {
    return this.http.get<any>(`${this.path}${endpoint}`, this.httpOptions).pipe(
      map(
        (res) => {
          if (res instanceof HttpResponse) {
            return res.body;
          } else {
            return res;
          }
        },
      ),
      catchError(this.errManager.handleError.bind(this)),
    );
  }

  getp(endpoint: string) {
    return this.http.get<any>(`${this.path}${endpoint}`, { ...this.httpOptions, reportProgress: true, observe: 'events' }).pipe(
      catchError(this.errManager.handleError.bind(this)),
    );
  }

  getOnlyAuth(endpoint: string) {
    return this.http.get<any>(`${this.path}${endpoint}`, this.httpOptionsOnlyAuth).pipe(
      map(
        (res) => {
          if (res instanceof HttpResponse) {
            return res.body;
          } else {
            return res;
          }
        },
      ),
      catchError(this.errManager.handleError.bind(this)),
    );
  }

  /** Envía el contenido por POST al endpoint seleccionado. */
  post(endpoint: string, element: any) {
    return this.http.post<any>(`${this.path}${endpoint}`, element, this.httpOptions).pipe(
      map(
        (res) => {
          if (res instanceof HttpResponse) {
            return res.body;
          } else {
            return res;
          }
        },
      ),
      catchError(this.errManager.handleError),
    );
  }


  /** Envía por POST una carga con cabecera multipart/form-data. */
  post_file(endpoint: string, element: any) {
    return this.http.post<any>(`${this.path}${endpoint}`, element, {
      headers: new HttpHeaders({
        'Content-Type': 'multipart/form-data',
      })
    }).pipe(
      map(
        (res) => {
          if (res instanceof HttpResponse) {
            return res.body;
          } else {
            return res;
          }
        },
      ),
      catchError(this.errManager.handleError),
    );
  }

  /** Actualiza por PUT el recurso indicado por el endpoint. */
  put(endpoint: string, element: any): Observable<any> {
    const path = `${this.path}${endpoint}`;
    return this.http.put<any>(path, element, this.httpOptions).pipe(
      map((res) => {
        if (res instanceof HttpResponse) {
          return res.body;
        } else {
          return res;
        }
      }),
      catchError(this.errManager.handleError.bind(this)),
    );
  }

  /** Elimina el recurso del endpoint y agrega el ID cuando se proporciona. */
  delete(endpoint: string, id?: number | string) {
	const suffix = id === undefined ? '' : `/${id}`;
	return this.http.delete<any>(`${this.path}${endpoint}${suffix}`, this.httpOptions).pipe(
      map(
        (res) => {
          if (res instanceof HttpResponse) {
            return res.body;
          } else {
            return res;
          }
        },
      ),
      catchError(this.errManager.handleError),
    );
  }

  /** Aplica una actualización parcial al recurso indicado. */
  public patch(endpoint: string, body: any): Observable<any> {
    return this.http
      .patch<any>(`${this.path}${endpoint}`, body, this.httpOptions)
      .pipe(
        map(res => (res instanceof HttpResponse ? res.body : res)),
        catchError(this.errManager.handleError.bind(this))
      );
  }
};
