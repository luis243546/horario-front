// src/app/features/payroll-management/services/rate-management.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseApiService, ApiResponse } from '../../../shared/services/base-api.service';
import {
  TeacherRate,
  TeacherRateRequest,
  ModalityRate,
  ModalityRateRequest,
  DefaultRate,
  DefaultRateRequest,
  AttendanceActivityType
} from '../models/payroll.models';

@Injectable({
  providedIn: 'root'
})
export class RateManagementService extends BaseApiService {
  private readonly teacherRatesEndpoint = '/protected/teacher-rates';
  private readonly modalityRatesEndpoint = '/protected/modality-rates';
  private readonly defaultRatesEndpoint = '/protected/default-rates';
  private readonly activityTypesEndpoint = '/protected/attendance-activity-types';

  constructor(protected override http: HttpClient) {
    super(http);
  }

  // ==================== TEACHER RATES ====================

  /**
   * Obtiene todas las tarifas de docentes
   */
  getAllTeacherRates(): Observable<TeacherRate[]> {
    return this.get<TeacherRate[]>(this.teacherRatesEndpoint)
      .pipe(map(response => response.data));
  }

  /**
   * Obtiene tarifas de un docente específico
   */
  getTeacherRatesByTeacher(teacherUuid: string): Observable<TeacherRate[]> {
    return this.get<TeacherRate[]>(`${this.teacherRatesEndpoint}/teacher/${teacherUuid}`)
      .pipe(map(response => response.data));
  }

  /**
   * Obtiene la tarifa activa de un docente para un tipo de actividad
   */
  getActiveTeacherRate(
    teacherUuid: string,
    activityTypeUuid: string,
    date?: string
  ): Observable<TeacherRate> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }

    return this.get<TeacherRate>(
      `${this.teacherRatesEndpoint}/teacher/${teacherUuid}/activity-type/${activityTypeUuid}/active`,
      params
    ).pipe(map(response => response.data));
  }

  /**
   * Crea una nueva tarifa para un docente
   */
  createTeacherRate(request: TeacherRateRequest): Observable<TeacherRate> {
    return this.post<TeacherRate>(this.teacherRatesEndpoint, request)
      .pipe(map(response => response.data));
  }

  /**
   * Actualiza una tarifa de docente
   */
  updateTeacherRate(uuid: string, request: Partial<TeacherRateRequest>): Observable<TeacherRate> {
    return this.patch<TeacherRate>(`${this.teacherRatesEndpoint}/${uuid}`, request)
      .pipe(map(response => response.data));
  }

  /**
   * Cierra una tarifa de docente (establece effectiveTo a hoy)
   */
  closeTeacherRate(uuid: string): Observable<TeacherRate> {
    return this.patch<TeacherRate>(`${this.teacherRatesEndpoint}/${uuid}/close`, {})
      .pipe(map(response => response.data));
  }

  /**
   * Elimina una tarifa de docente
   */
  deleteTeacherRate(uuid: string): Observable<void> {
    return this.delete<void>(`${this.teacherRatesEndpoint}/${uuid}`)
      .pipe(map(response => response.data));
  }

  /**
   * Crea una nueva versión de una tarifa de docente
   */
  createNewTeacherRateVersion(
    teacherUuid: string,
    activityTypeUuid: string,
    newRatePerHour: number,
    effectiveFrom: string
  ): Observable<TeacherRate> {
    const params = new HttpParams()
      .set('newRatePerHour', newRatePerHour.toString())
      .set('effectiveFrom', effectiveFrom);

    return this.post<TeacherRate>(
      `${this.teacherRatesEndpoint}/teacher/${teacherUuid}/activity-type/${activityTypeUuid}/new-version?${params.toString()}`,
      {}
    ).pipe(map(response => response.data));
  }

  // ==================== MODALITY RATES ====================

  /**
   * Obtiene todas las tarifas por modalidad
   */
  getAllModalityRates(): Observable<ModalityRate[]> {
    return this.get<ModalityRate[]>(this.modalityRatesEndpoint)
      .pipe(map(response => response.data));
  }

  /**
   * Obtiene tarifas de una modalidad específica
   */
  getModalityRatesByModality(modalityUuid: string): Observable<ModalityRate[]> {
    return this.get<ModalityRate[]>(`${this.modalityRatesEndpoint}/modality/${modalityUuid}`)
      .pipe(map(response => response.data));
  }

  /**
   * Obtiene la tarifa activa de una modalidad para un tipo de actividad
   */
  getActiveModalityRate(
    modalityUuid: string,
    activityTypeUuid: string,
    date?: string
  ): Observable<ModalityRate> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }

    return this.get<ModalityRate>(
      `${this.modalityRatesEndpoint}/modality/${modalityUuid}/activity-type/${activityTypeUuid}/active`,
      params
    ).pipe(map(response => response.data));
  }

  /**
   * Crea una nueva tarifa para una modalidad
   */
  createModalityRate(request: ModalityRateRequest): Observable<ModalityRate> {
    return this.post<ModalityRate>(this.modalityRatesEndpoint, request)
      .pipe(map(response => response.data));
  }

  /**
   * Actualiza una tarifa de modalidad
   */
  updateModalityRate(uuid: string, request: Partial<ModalityRateRequest>): Observable<ModalityRate> {
    return this.patch<ModalityRate>(`${this.modalityRatesEndpoint}/${uuid}`, request)
      .pipe(map(response => response.data));
  }

  /**
   * Cierra una tarifa de modalidad
   */
  closeModalityRate(uuid: string): Observable<ModalityRate> {
    return this.patch<ModalityRate>(`${this.modalityRatesEndpoint}/${uuid}/close`, {})
      .pipe(map(response => response.data));
  }

  /**
   * Elimina una tarifa de modalidad
   */
  deleteModalityRate(uuid: string): Observable<void> {
    return this.delete<void>(`${this.modalityRatesEndpoint}/${uuid}`)
      .pipe(map(response => response.data));
  }

  // ==================== DEFAULT RATES ====================

  /**
   * Obtiene todas las tarifas por defecto
   */
  getAllDefaultRates(): Observable<DefaultRate[]> {
    return this.get<DefaultRate[]>(this.defaultRatesEndpoint)
      .pipe(map(response => response.data));
  }

  /**
   * Obtiene la tarifa por defecto activa para un tipo de actividad
   */
  getActiveDefaultRate(activityTypeUuid: string, date?: string): Observable<DefaultRate> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }

    return this.get<DefaultRate>(
      `${this.defaultRatesEndpoint}/activity-type/${activityTypeUuid}/active`,
      params
    ).pipe(map(response => response.data));
  }

  /**
   * Crea una nueva tarifa por defecto
   */
  createDefaultRate(request: DefaultRateRequest): Observable<DefaultRate> {
    return this.post<DefaultRate>(this.defaultRatesEndpoint, request)
      .pipe(map(response => response.data));
  }

  /**
   * Actualiza una tarifa por defecto
   */
  updateDefaultRate(uuid: string, request: Partial<DefaultRateRequest>): Observable<DefaultRate> {
    return this.patch<DefaultRate>(`${this.defaultRatesEndpoint}/${uuid}`, request)
      .pipe(map(response => response.data));
  }

  /**
   * Cierra una tarifa por defecto
   */
  closeDefaultRate(uuid: string): Observable<DefaultRate> {
    return this.patch<DefaultRate>(`${this.defaultRatesEndpoint}/${uuid}/close`, {})
      .pipe(map(response => response.data));
  }

  /**
   * Elimina una tarifa por defecto
   */
  deleteDefaultRate(uuid: string): Observable<void> {
    return this.delete<void>(`${this.defaultRatesEndpoint}/${uuid}`)
      .pipe(map(response => response.data));
  }

  // ==================== ACTIVITY TYPES ====================

  /**
   * Obtiene todos los tipos de actividad
   */
  getAllActivityTypes(): Observable<AttendanceActivityType[]> {
    return this.get<AttendanceActivityType[]>(this.activityTypesEndpoint)
      .pipe(map(response => response.data));
  }

  /**
   * Obtiene un tipo de actividad por UUID
   */
  getActivityTypeById(uuid: string): Observable<AttendanceActivityType> {
    return this.get<AttendanceActivityType>(`${this.activityTypesEndpoint}/${uuid}`)
      .pipe(map(response => response.data));
  }

  // ==================== HELPER METHODS ====================

  /**
   * Obtiene todas las tarifas activas para un docente
   */
  getAllActiveRatesForTeacher(teacherUuid: string, date?: string): Observable<{
    teacherRates: TeacherRate[];
    hasTeacherRates: boolean;
  }> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }

    return this.get<TeacherRate[]>(
      `${this.teacherRatesEndpoint}/teacher/${teacherUuid}/active`,
      params
    ).pipe(
      map(response => ({
        teacherRates: response.data,
        hasTeacherRates: response.data.length > 0
      }))
    );
  }

  /**
   * Verifica si un docente tiene tarifa específica para un tipo de actividad
   */
  hasSpecificTeacherRate(
    teacherUuid: string,
    activityTypeUuid: string,
    date?: string
  ): Observable<boolean> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }

    return this.get<boolean>(
      `${this.teacherRatesEndpoint}/teacher/${teacherUuid}/activity-type/${activityTypeUuid}/has-specific-rate`,
      params
    ).pipe(map(response => response.data));
  }

  /**
   * Obtiene el historial de versiones de una tarifa
   */
  getRateHistory(
    teacherUuid?: string,
    modalityUuid?: string,
    activityTypeUuid?: string
  ): Observable<(TeacherRate | ModalityRate | DefaultRate)[]> {
    if (teacherUuid && activityTypeUuid) {
      return this.getTeacherRatesByTeacher(teacherUuid).pipe(
        map(rates => rates.filter(r => r.activityType.uuid === activityTypeUuid))
      );
    } else if (modalityUuid && activityTypeUuid) {
      return this.getModalityRatesByModality(modalityUuid).pipe(
        map(rates => rates.filter(r => r.activityType.uuid === activityTypeUuid))
      );
    }
    return this.getAllDefaultRates();
  }

  /**
   * Valida que las fechas de vigencia sean correctas
   */
  validateRateDates(effectiveFrom: string, effectiveTo?: string): boolean {
    const from = new Date(effectiveFrom);

    if (effectiveTo) {
      const to = new Date(effectiveTo);
      return from <= to;
    }

    return true;
  }

  /**
   * Verifica si una tarifa está activa en una fecha específica
   */
  isRateActiveOnDate(
    rate: TeacherRate | ModalityRate | DefaultRate,
    date: string
  ): boolean {
    const checkDate = new Date(date);
    const effectiveFrom = new Date(rate.effectiveFrom);

    if (checkDate < effectiveFrom) {
      return false;
    }

    if (rate.effectiveTo) {
      const effectiveTo = new Date(rate.effectiveTo);
      return checkDate <= effectiveTo;
    }

    return true;
  }

  createNewModalityRateVersion(
    modalityUuid: string,
    newRatePerHour: number,
    effectiveFrom: string
  ): Observable<ModalityRate> {
    const params = new HttpParams()
      .set('newRatePerHour', newRatePerHour.toString())
      .set('effectiveFrom', effectiveFrom);

    return this.post<ModalityRate>(
      `${this.modalityRatesEndpoint}/modality/${modalityUuid}/new-version?${params.toString()}`,
      {}
    ).pipe(map(response => response.data));
  }


  createNewDefaultRateVersion(
    activityTypeUuid: string,
    newRatePerHour: number,
    effectiveFrom: string
  ): Observable<DefaultRate> {
    const params = new HttpParams()
      .set('newRatePerHour', newRatePerHour.toString())
      .set('effectiveFrom', effectiveFrom);

    return this.post<DefaultRate>(
      `${this.defaultRatesEndpoint}/activity-type/${activityTypeUuid}/new-version?${params.toString()}`,
      {}
    ).pipe(map(response => response.data));
  }


}
