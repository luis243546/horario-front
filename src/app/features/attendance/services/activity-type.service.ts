// src/app/features/attendance/services/activity-type.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService, ApiResponse } from '../../../shared/services/base-api.service';
import {
  AttendanceActivityTypeResponse,
  AttendanceActivityTypeRequest
} from '../models/activity-type.model';

/**
 * Servicio para gestionar los tipos de actividad de asistencia
 * Maneja operaciones CRUD y configuración inicial del sistema
 */
@Injectable({
  providedIn: 'root'
})
export class ActivityTypeService extends BaseApiService {

  private readonly endpoint = '/protected/attendance-activity-types';

  // ==================== CONSULTAS ====================

  /**
   * Obtiene todos los tipos de actividad disponibles
   */
  getAllActivityTypes(): Observable<ApiResponse<AttendanceActivityTypeResponse[]>> {
    return this.get<AttendanceActivityTypeResponse[]>(this.endpoint);
  }

  /**
   * Obtiene un tipo de actividad por su UUID
   */
  getActivityTypeById(uuid: string): Observable<ApiResponse<AttendanceActivityTypeResponse>> {
    return this.get<AttendanceActivityTypeResponse>(`${this.endpoint}/${uuid}`);
  }

  /**
   * Obtiene un tipo de actividad por su código
   * @param code Código del tipo de actividad (ej: REGULAR_CLASS, WORKSHOP)
   */
  getActivityTypeByCode(code: string): Observable<ApiResponse<AttendanceActivityTypeResponse>> {
    return this.get<AttendanceActivityTypeResponse>(`${this.endpoint}/code/${code}`);
  }

  // ==================== CRUD ====================

  /**
   * Crea un nuevo tipo de actividad
   */
  createActivityType(
    request: AttendanceActivityTypeRequest
  ): Observable<ApiResponse<AttendanceActivityTypeResponse>> {
    return this.post<AttendanceActivityTypeResponse>(this.endpoint, request);
  }

  /**
   * Actualiza un tipo de actividad existente
   */
  updateActivityType(
    uuid: string,
    request: AttendanceActivityTypeRequest
  ): Observable<ApiResponse<AttendanceActivityTypeResponse>> {
    return this.patch<AttendanceActivityTypeResponse>(
      `${this.endpoint}/${uuid}`,
      request
    );
  }

  /**
   * Elimina un tipo de actividad
   * IMPORTANTE: Solo se puede eliminar si no tiene asistencias o tarifas asociadas
   */
  deleteActivityType(uuid: string): Observable<ApiResponse<void>> {
    return this.delete<void>(`${this.endpoint}/${uuid}`);
  }

  // ==================== CONFIGURACIÓN INICIAL ====================

  /**
   * Inicializa los tipos de actividad por defecto del sistema
   * Esto crea automáticamente:
   * - REGULAR_CLASS: Clase Regular
   * - WORKSHOP: Taller
   * - SUBSTITUTE_EXAM: Examen Sustitutorio
   * - EXTRA_HOURS: Horas Extra
   *
   * Solo debe ejecutarse una vez durante la configuración inicial del sistema
   */
  initializeDefaultActivityTypes(): Observable<ApiResponse<void>> {
    return this.post<void>(`${this.endpoint}/initialize-defaults`, {});
  }

  // ==================== UTILIDADES ====================

  /**
   * Verifica si un código de tipo de actividad ya existe
   * Útil para validaciones en formularios
   */
  checkCodeExists(code: string): Observable<boolean> {
    return new Observable(observer => {
      this.getActivityTypeByCode(code).subscribe({
        next: () => {
          observer.next(true);
          observer.complete();
        },
        error: () => {
          observer.next(false);
          observer.complete();
        }
      });
    });
  }
}
