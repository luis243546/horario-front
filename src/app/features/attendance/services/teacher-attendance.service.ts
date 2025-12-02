// src/app/features/attendance/services/teacher-attendance.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { BaseApiService, ApiResponse } from '../../../shared/services/base-api.service';
import {
  TeacherAttendanceResponse,
  CheckInBasicRequest,
  CheckInWithScheduleRequest,
  AttendanceOverrideRequest,
  AttendanceStatistics,
  AttendanceFilters,
  AttendanceStatus
} from '../models/teacher-attendance.model';

/**
 * Servicio para gestionar asistencias de docentes
 * Maneja check-in, check-out, aprobaciones y estadísticas
 */
@Injectable({
  providedIn: 'root'
})
export class TeacherAttendanceService extends BaseApiService {

  private readonly endpoint = '/protected/teacher-attendances';

  // ==================== CONSULTAS GENERALES ====================

  /**
   * Obtiene todas las asistencias del sistema
   * Uso: Administradores para ver todas las asistencias
   */
  getAllAttendances(): Observable<ApiResponse<TeacherAttendanceResponse[]>> {
    return this.get<TeacherAttendanceResponse[]>(this.endpoint);
  }

  /**
   * Obtiene una asistencia por su UUID
   */
  getAttendanceById(uuid: string): Observable<ApiResponse<TeacherAttendanceResponse>> {
    return this.get<TeacherAttendanceResponse>(`${this.endpoint}/${uuid}`);
  }

  /**
   * Obtiene una asistencia con detalles completos (incluye relaciones anidadas)
   */
  getAttendanceWithDetails(uuid: string): Observable<ApiResponse<TeacherAttendanceResponse>> {
    return this.get<TeacherAttendanceResponse>(`${this.endpoint}/${uuid}/details`);
  }

  // ==================== CONSULTAS POR DOCENTE ====================

  /**
   * Obtiene todas las asistencias de un docente específico
   */
  getAttendancesByTeacher(teacherUuid: string): Observable<ApiResponse<TeacherAttendanceResponse[]>> {
    return this.get<TeacherAttendanceResponse[]>(`${this.endpoint}/teacher/${teacherUuid}`);
  }

  /**
   * Obtiene las asistencias de un docente en una fecha específica
   */
  getAttendancesByTeacherAndDate(
    teacherUuid: string,
    date: string
  ): Observable<ApiResponse<TeacherAttendanceResponse[]>> {
    return this.get<TeacherAttendanceResponse[]>(
      `${this.endpoint}/teacher/${teacherUuid}/date/${date}`
    );
  }

  /**
   * Obtiene las asistencias de un docente en un rango de fechas
   */
  getAttendancesByTeacherAndDateRange(
    teacherUuid: string,
    startDate: string,
    endDate: string
  ): Observable<ApiResponse<TeacherAttendanceResponse[]>> {
    const params = this.createParams({ startDate, endDate });
    return this.get<TeacherAttendanceResponse[]>(
      `${this.endpoint}/teacher/${teacherUuid}/range`,
      params
    );
  }

  /**
   * Obtiene asistencias pendientes de un docente
   * (Entrada registrada pero sin salida)
   */
  getPendingAttendancesByTeacher(
    teacherUuid: string
  ): Observable<ApiResponse<TeacherAttendanceResponse[]>> {
    return this.get<TeacherAttendanceResponse[]>(
      `${this.endpoint}/teacher/${teacherUuid}/pending`
    );
  }

  // ==================== CONSULTAS POR RANGO DE FECHAS ====================

  /**
   * Obtiene todas las asistencias en un rango de fechas (todas los docentes)
   */
  getAttendancesByDateRange(
    startDate: string,
    endDate: string
  ): Observable<ApiResponse<TeacherAttendanceResponse[]>> {
    const params = this.createParams({ startDate, endDate });
    return this.get<TeacherAttendanceResponse[]>(`${this.endpoint}/range`, params);
  }

  // ==================== CHECK-IN / CHECK-OUT ====================

  /**
   * Registra entrada básica (sin cálculo de penalizaciones)
   * Uso: Cuando no se conocen los detalles del horario
   */
  checkIn(request: CheckInBasicRequest): Observable<ApiResponse<TeacherAttendanceResponse>> {
    return this.post<TeacherAttendanceResponse>(`${this.endpoint}/check-in`, request);
  }

  /**
   * Registra entrada con horario completo y cálculo automático de penalizaciones
   * Este es el método RECOMENDADO para uso normal
   * Calcula automáticamente:
   * - Minutos de retraso (con tolerancia de 5 minutos)
   * - Penalizaciones aplicables
   */
  checkInWithSchedule(
    request: CheckInWithScheduleRequest
  ): Observable<ApiResponse<TeacherAttendanceResponse>> {
    return this.post<TeacherAttendanceResponse>(
      `${this.endpoint}/check-in-with-schedule`,
      request
    );
  }

  /**
   * Registra salida del docente
   * Calcula automáticamente:
   * - Duración real de la asistencia
   * - Salida anticipada (si aplica)
   */
  checkOut(attendanceUuid: string): Observable<ApiResponse<TeacherAttendanceResponse>> {
    return this.patch<TeacherAttendanceResponse>(
      `${this.endpoint}/${attendanceUuid}/check-out`,
      {}
    );
  }

  // ==================== ADMINISTRACIÓN ====================

  /**
   * Aprueba una asistencia (solo administradores)
   */
  approveAttendance(
    attendanceUuid: string,
    adminNote?: string
  ): Observable<ApiResponse<TeacherAttendanceResponse>> {
    const url = adminNote
      ? `${this.endpoint}/${attendanceUuid}/approve?adminNote=${encodeURIComponent(adminNote)}`
      : `${this.endpoint}/${attendanceUuid}/approve`;

    return this.patch<TeacherAttendanceResponse>(url, {});
  }

  /**
   * Rechaza una asistencia con razón (solo administradores)
   */
  rejectAttendance(
    attendanceUuid: string,
    reason: string
  ): Observable<ApiResponse<TeacherAttendanceResponse>> {
    const url = `${this.endpoint}/${attendanceUuid}/reject?reason=${encodeURIComponent(reason)}`;
    return this.patch<TeacherAttendanceResponse>(url, {});
  }

  /**
   * Modifica una asistencia manualmente (override administrativo)
   * Permite corregir errores o ajustar tiempos manualmente
   */
  overrideAttendance(
    attendanceUuid: string,
    data: AttendanceOverrideRequest
  ): Observable<ApiResponse<TeacherAttendanceResponse>> {
    return this.patch<TeacherAttendanceResponse>(
      `${this.endpoint}/${attendanceUuid}/override`,
      data
    );
  }

  /**
   * Marca una asistencia como día feriado
   * Automáticamente establece entrada y salida a tiempo completo
   */
  markAsHoliday(attendanceUuid: string): Observable<ApiResponse<TeacherAttendanceResponse>> {
    return this.patch<TeacherAttendanceResponse>(
      `${this.endpoint}/${attendanceUuid}/mark-holiday`,
      {}
    );
  }

  // ==================== ESTADÍSTICAS ====================

  /**
   * Obtiene el total de minutos trabajados por un docente en un período
   */
  getTotalMinutesWorked(
    teacherUuid: string,
    startDate: string,
    endDate: string
  ): Observable<ApiResponse<number>> {
    const params = this.createParams({ startDate, endDate });
    return this.get<number>(
      `${this.endpoint}/teacher/${teacherUuid}/total-minutes-worked`,
      params
    );
  }

  /**
   * Obtiene el total de minutos de penalización de un docente en un período
   */
  getTotalPenaltyMinutes(
    teacherUuid: string,
    startDate: string,
    endDate: string
  ): Observable<ApiResponse<number>> {
    const params = this.createParams({ startDate, endDate });
    return this.get<number>(
      `${this.endpoint}/teacher/${teacherUuid}/total-penalty-minutes`,
      params
    );
  }

  /**
   * Obtiene estadísticas completas de un docente en un período
   * Incluye:
   * - Total de minutos trabajados
   * - Total de minutos programados
   * - Total de penalizaciones
   * - Promedio de minutos de retraso
   * - Contadores de asistencias
   */
  getStatistics(
    teacherUuid: string,
    startDate: string,
    endDate: string
  ): Observable<ApiResponse<AttendanceStatistics>> {
    const params = this.createParams({ startDate, endDate });
    return this.get<AttendanceStatistics>(
      `${this.endpoint}/teacher/${teacherUuid}/statistics`,
      params
    );
  }

  // ==================== UTILIDADES ====================

  /**
   * Filtra asistencias con múltiples criterios
   */
  filterAttendances(filters: AttendanceFilters): Observable<ApiResponse<TeacherAttendanceResponse[]>> {
    const params = this.createParams(filters);
    return this.get<TeacherAttendanceResponse[]>(this.endpoint, params);
  }

  /**
   * Verifica si un docente ya tiene entrada registrada para una sesión específica hoy
   */
  hasCheckedInToday(teacherUuid: string, classSessionUuid: string): Observable<boolean> {
    const today = new Date().toISOString().split('T')[0];

    return new Observable(observer => {
      this.getAttendancesByTeacherAndDate(teacherUuid, today).subscribe({
        next: (response) => {
          const hasCheckedIn = response.data.some(
            att => att.classSession?.uuid === classSessionUuid
          );
          observer.next(hasCheckedIn);
          observer.complete();
        },
        error: () => {
          observer.next(false);
          observer.complete();
        }
      });
    });
  }

  /**
   * Obtiene la asistencia pendiente de un docente para una sesión específica
   * Útil para el botón de check-out
   */
  getPendingAttendanceForSession(
    teacherUuid: string,
    classSessionUuid: string
  ): Observable<TeacherAttendanceResponse | null> {
    return new Observable(observer => {
      this.getPendingAttendancesByTeacher(teacherUuid).subscribe({
        next: (response) => {
          const pending = response.data.find(
            att => att.classSession?.uuid === classSessionUuid && !att.checkoutAt
          );
          observer.next(pending || null);
          observer.complete();
        },
        error: () => {
          observer.next(null);
          observer.complete();
        }
      });
    });
  }
}
