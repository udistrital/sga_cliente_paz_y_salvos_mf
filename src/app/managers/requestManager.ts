import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { HttpErrorManager } from './errorManager';

/**
 * This class manage the http connections with internal REST services. Use the response format {
 *  Code: 'xxxxx',
 *  Body: 'Some Data' (this element is returned if the request is success)
 *  ...
 * }
 */
@Injectable({
  providedIn: 'root',
})
export class RequestManager {
  private path!: any;
  public httpOptions: any;
  public httpOptionsOnlyAuth: any;
  constructor(private http: HttpClient, private errManager: HttpErrorManager) {
    const acces_token = window.localStorage.getItem('access_token');
    if (acces_token !== null) {
      this.httpOptions = {
        headers: new HttpHeaders({
          // 'Content-Type': 'application/json',
          'Authorization': `Bearer ${acces_token}`,
        }),
      };
      this.httpOptionsOnlyAuth = {
        headers: new HttpHeaders({
          'Authorization': `Bearer ${acces_token}`,
        }),
      };
    }
  }


  /**
   * Use for set the source path of the service (service's name must be present at src/environment/environment.ts)
   * @param service: string
   */
  public setPath(service: string) {
    const value = environment[service as keyof typeof environment];
    console.log("Setting path for service:", service, "to", value);
    if (typeof value === 'string') {
      this.path = value;
    } else {
      throw new Error(`Environment variable for service "${service}" is not a string.`);
    }
  }


  /**
   * Perform a GET http request
   * @param endpoint service's end-point
   * @param params (an Key, Value object with que query params for the request)
   * @returns Observable<any>
   */
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

  /**
   * Perform a POST http request
   * @param endpoint service's end-point
   * @param element data to send as JSON
   * @returns Observable<any>
   */
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


  /**
   * Perform a POST http request
   * @param endpoint service's end-point
   * @param element data to send as JSON
   * @returns Observable<any>
   */
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

  /**
   * Perform a PUT http request
   * @param endpoint service's end-point
   * @param element data to send as JSON, With the id to UPDATE
   * @returns Observable<any>
   */
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

  /**
   * Perform a DELETE http request
   * @param endpoint service's end-point
   * @param id element's id for remove
   * @returns Observable<any>
   */
  delete(endpoint: string, id: number | string) {
    return this.http.delete<any>(`${this.path}${endpoint}/${id}`, this.httpOptions).pipe(
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

  /**
 * Perform a PATCH http request
 */
  public patch(endpoint: string, body: any): Observable<any> {
    return this.http
      .patch<any>(`${this.path}${endpoint}`, body, this.httpOptions)
      .pipe(
        map(res => (res instanceof HttpResponse ? res.body : res)),
        catchError(this.errManager.handleError.bind(this))
      );
  }
};
