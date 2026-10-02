import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestManager } from '../managers/requestManager';
import { ApiResponse } from '../models/api-response';
import { SemaforoPatch, SemaforoRecord } from '../models/semaforo-api';

@Injectable({
    providedIn: 'root'
})
export class SemaforoService {
    constructor(private requestManager: RequestManager) {
        this.requestManager.setPath("SGA_PAZ_Y_SALVOS_CRUD_SERVICE");
    }

    get<T>(endpoint: string, params?: object): Observable<ApiResponse<T>> {
        // Si el endpoint contiene un ID numérico (ej: semaforo/123), usar CRUD
        // De lo contrario, usar MID para queries complejos
        if (/^semaforo\/\d+$/.test(endpoint)) {
            this.requestManager.setPath("SGA_PAZ_Y_SALVOS_CRUD_SERVICE");
        } else {
            this.requestManager.setPath("SGA_PAZ_Y_SALVOS_MID_SERVICE");
        }
        
        if (params) {
            const queryString = Object.entries(params)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                .join('&');
            return this.requestManager.get(`${endpoint}?${queryString}`);
        }
        return this.requestManager.get(endpoint);
    }

    post(endpoint: string, element: SemaforoRecord): Observable<ApiResponse<SemaforoRecord>> {
        this.requestManager.setPath("SGA_PAZ_Y_SALVOS_CRUD_SERVICE");
        return this.requestManager.post(endpoint, element);
    }

    put(endpoint: string, id: number, element: SemaforoRecord): Observable<ApiResponse<SemaforoRecord>> {
        this.requestManager.setPath("SGA_PAZ_Y_SALVOS_CRUD_SERVICE");
        return this.requestManager.put(`${endpoint}/${id}`, element);
    }

    delete(endpoint: string, id: number): Observable<ApiResponse<{ Id: number }>> {
        this.requestManager.setPath("SGA_PAZ_Y_SALVOS_CRUD_SERVICE");
        return this.requestManager.delete(endpoint, id);
    }

    patch(endpoint: string, id: number, changes: SemaforoPatch): Observable<ApiResponse<SemaforoRecord>> {
        this.requestManager.setPath("SGA_PAZ_Y_SALVOS_CRUD_SERVICE");
        return this.requestManager.patch(`${endpoint}/${id}`, changes);
    }
}
