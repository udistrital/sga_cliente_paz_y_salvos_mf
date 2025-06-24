import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestManager } from '../managers/requestManager';

@Injectable({
    providedIn: 'root'
})
export class EventosService {
    constructor(private requestManager: RequestManager) {
        this.requestManager.setPath("EVENTOS_CRUD");
    }

    get(endpoint: string): Observable<any> {
        this.requestManager.setPath("EVENTOS_CRUD");
        return this.requestManager.get(endpoint);
    }

    post(endpoint: string, element: any): Observable<any> {
        this.requestManager.setPath("EVENTOS_CRUD");
        return this.requestManager.post(endpoint, element);
    }

    put(endpoint: string, id: any, element: any): Observable<any> {
        this.requestManager.setPath("EVENTOS_CRUD");
        return this.requestManager.put(`${endpoint}/${id}`, element);
    }

    delete(endpoint: string, id: any): Observable<any> {
        this.requestManager.setPath("EVENTOS_CRUD");
        return this.requestManager.delete(endpoint, id);
    }
}
