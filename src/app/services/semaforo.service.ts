import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestManager } from '../managers/requestManager';

@Injectable({
    providedIn: 'root'
})
export class SemaforoService {
    constructor(private requestManager: RequestManager) {
        this.requestManager.setPath("SGA_PAZ_Y_SALVOS_CRUD_SERVICE");
    }

    get(endpoint: string, params?: any): Observable<any> {
        // Si el endpoint contiene un ID numérico (ej: semaforo/123), usar CRUD
        // De lo contrario, usar MID para queries complejos
        if (/^semaforo\/\d+$/.test(endpoint)) {
            this.requestManager.setPath("SGA_PAZ_Y_SALVOS_CRUD_SERVICE");
        } else {
            this.requestManager.setPath("SGA_PAZ_Y_SALVOS_MID_SERVICE");
        }
        
        if (params) {
            const queryString = Object.keys(params)
                .map(key => `${key}=${params[key]}`)
                .join('&');
            return this.requestManager.get(`${endpoint}?${queryString}`);
        }
        return this.requestManager.get(endpoint);
    }

    post(endpoint: string, element: any): Observable<any> {
        this.requestManager.setPath("SGA_PAZ_Y_SALVOS_CRUD_SERVICE");
        return this.requestManager.post(endpoint, element);
    }

    put(endpoint: string, id: any, element: any): Observable<any> {
        this.requestManager.setPath("SGA_PAZ_Y_SALVOS_CRUD_SERVICE");
        return this.requestManager.put(`${endpoint}/${id}`, element);
    }

    delete(endpoint: string, id: any): Observable<any> {
        this.requestManager.setPath("SGA_PAZ_Y_SALVOS_CRUD_SERVICE");
        return this.requestManager.delete(endpoint, id);
    }

    patch(endpoint: string, id: any, changes: Partial<any>): Observable<any> {
        this.requestManager.setPath("SGA_PAZ_Y_SALVOS_CRUD_SERVICE");
        return this.requestManager.patch(`${endpoint}/${id}`, changes);
    }
}
