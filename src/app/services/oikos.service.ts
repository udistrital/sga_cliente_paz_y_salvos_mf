import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestManager } from '../managers/requestManager';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class OikosService {
    constructor(private requestManager: RequestManager) {
        this.requestManager.setPath("OIKOS_SERVICE");
    }

    /**
     * Obtiene todas las facultades (TipoDependenciaId configurable en environment)
     * @returns Observable con la lista de facultades
     */
    getFacultades(): Observable<any> {
        this.requestManager.setPath("OIKOS_SERVICE");
        const tipoFacultad = environment.TIPO_DEPENDENCIA_FACULTAD;
        return this.requestManager.get(`dependencia?query=DependenciaTipoDependencia.TipoDependenciaId.Id:${tipoFacultad}&limit=-1`);
    }

    /**
     * Obtiene los proyectos curriculares de una facultad específica
     * @param idFacultad ID de la facultad
     * @returns Observable con la lista de proyectos curriculares
     */
    getProyectosByFacultad(idFacultad: number): Observable<any> {
        this.requestManager.setPath("OIKOS_SERVICE");
        return this.requestManager.get(`dependencia/proyectosPorFacultad/${idFacultad}`);
    }

    /**
     * Obtiene una dependencia por su ID
     * @param id ID de la dependencia
     * @returns Observable con la información de la dependencia
     */
    getDependenciaById(id: number): Observable<any> {
        this.requestManager.setPath("OIKOS_SERVICE");
        return this.requestManager.get(`dependencia/${id}`);
    }

    /**
     * Obtiene dependencias por tipo
     * @param tipoDependenciaId Tipo de dependencia (2=Facultad, 3=Proyecto Curricular, etc.)
     * @returns Observable con la lista de dependencias
     */
    getDependenciasByTipo(tipoDependenciaId: number): Observable<any> {
        this.requestManager.setPath("OIKOS_SERVICE");
        return this.requestManager.get(`dependencia?query=DependenciaTipoDependencia.TipoDependenciaId.Id:${tipoDependenciaId}&limit=-1`);
    }

    /**
     * Método genérico para consultar cualquier endpoint de OIKOS
     * @param endpoint Endpoint a consultar
     * @returns Observable con la respuesta
     */
    get(endpoint: string): Observable<any> {
        this.requestManager.setPath("OIKOS_SERVICE");
        return this.requestManager.get(endpoint);
    }
}
