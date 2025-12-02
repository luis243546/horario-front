// src/app/features/attendance/services/calendar-exception.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiService, ApiResponse } from '../../../shared/services/base-api.service';
import {
  AcademicCalendarExceptionResponse,
  AcademicCalendarExceptionRequest,
  BulkCalendarExceptionRequest,
  IsHolidayResponse
} from '../models/calendar-exception.model';

/**
 * Servicio para gestionar excepciones de calendario (feriados y días no laborables)
 */
@Injectable({
  providedIn: 'root'
})
export class CalendarExceptionService extends BaseApiService {

  private readonly endpoint = '/protected/calendar-exceptions';

  // ==================== CONSULTAS ====================

  /**
   * Obtiene todas las excepciones de calendario
   */
  getAllExceptions(): Observable<ApiResponse<AcademicCalendarExceptionResponse[]>> {
    return this.get<AcademicCalendarExceptionResponse[]>(this.endpoint);
  }

  /**
   * Obtiene una excepción por su UUID
   */
  getExceptionById(uuid: string): Observable<ApiResponse<AcademicCalendarExceptionResponse>> {
    return this.get<AcademicCalendarExceptionResponse>(`${this.endpoint}/${uuid}`);
  }

  /**
   * Obtiene la excepción para una fecha específica
   */
  getExceptionByDate(date: string): Observable<ApiResponse<AcademicCalendarExceptionResponse>> {
    return this.get<AcademicCalendarExceptionResponse>(`${this.endpoint}/date/${date}`);
  }

  /**
   * Obtiene excepciones en un rango de fechas
   */
  getExceptionsByDateRange(
    startDate: string,
    endDate: string
  ): Observable<ApiResponse<AcademicCalendarExceptionResponse[]>> {
    const params = this.createParams({ startDate, endDate });
    return this.get<AcademicCalendarExceptionResponse[]>(`${this.endpoint}/range`, params);
  }

  /**
   * Obtiene las próximas excepciones (feriados futuros)
   */
  getUpcomingExceptions(): Observable<ApiResponse<AcademicCalendarExceptionResponse[]>> {
    return this.get<AcademicCalendarExceptionResponse[]>(`${this.endpoint}/upcoming`);
  }

  /**
   * Obtiene todas las excepciones de un mes específico
   */
  getExceptionsByMonth(
    year: number,
    month: number
  ): Observable<ApiResponse<AcademicCalendarExceptionResponse[]>> {
    return this.get<AcademicCalendarExceptionResponse[]>(
      `${this.endpoint}/month/${year}/${month}`
    );
  }

  // ==================== VERIFICACIONES ====================

  /**
   * Verifica si una fecha específica es feriado
   */
  isHoliday(date: string): Observable<ApiResponse<boolean>> {
    return this.get<boolean>(`${this.endpoint}/is-holiday/${date}`);
  }

  /**
   * Verifica si una fecha es feriado y obtiene los detalles
   */
  checkHolidayWithDetails(date: string): Observable<IsHolidayResponse> {
    return new Observable(observer => {
      this.getExceptionByDate(date).subscribe({
        next: (response) => {
          observer.next({
            isHoliday: true,
            exception: response.data
          });
          observer.complete();
        },
        error: () => {
          observer.next({ isHoliday: false });
          observer.complete();
        }
      });
    });
  }

  // ==================== CRUD ====================

  /**
   * Crea una nueva excepción de calendario
   */
  createException(
    request: AcademicCalendarExceptionRequest
  ): Observable<ApiResponse<AcademicCalendarExceptionResponse>> {
    return this.post<AcademicCalendarExceptionResponse>(this.endpoint, request);
  }

  /**
   * Crea múltiples excepciones en lote
   * Útil para importar feriados de un año completo
   */
  createBulkExceptions(
    request: BulkCalendarExceptionRequest
  ): Observable<ApiResponse<AcademicCalendarExceptionResponse[]>> {
    return this.post<AcademicCalendarExceptionResponse[]>(`${this.endpoint}/bulk`, request);
  }

  /**
   * Actualiza una excepción existente
   */
  updateException(
    uuid: string,
    request: AcademicCalendarExceptionRequest
  ): Observable<ApiResponse<AcademicCalendarExceptionResponse>> {
    return this.patch<AcademicCalendarExceptionResponse>(`${this.endpoint}/${uuid}`, request);
  }

  /**
   * Elimina una excepción de calendario
   */
  deleteException(uuid: string): Observable<ApiResponse<void>> {
    return this.delete<void>(`${this.endpoint}/${uuid}`);
  }

  // ==================== UTILIDADES ====================

  /**
   * Importa los feriados nacionales de Perú para un año específico
   */
  importNationalHolidaysForYear(year: number): Observable<ApiResponse<AcademicCalendarExceptionResponse[]>> {
    // Feriados fijos del Perú
    const holidays: AcademicCalendarExceptionRequest[] = [
      {
        date: `${year}-01-01`,
        code: `NEW_YEAR_${year}`,
        description: 'Año Nuevo'
      },
      {
        date: `${year}-05-01`,
        code: `LABOR_DAY_${year}`,
        description: 'Día del Trabajo'
      },
      {
        date: `${year}-06-29`,
        code: `SAINT_PETER_PAUL_${year}`,
        description: 'San Pedro y San Pablo'
      },
      {
        date: `${year}-07-28`,
        code: `INDEPENDENCE_DAY_${year}`,
        description: 'Día de la Independencia'
      },
      {
        date: `${year}-07-29`,
        code: `INDEPENDENCE_DAY_2_${year}`,
        description: 'Fiestas Patrias'
      },
      {
        date: `${year}-08-30`,
        code: `SANTA_ROSA_LIMA_${year}`,
        description: 'Santa Rosa de Lima'
      },
      {
        date: `${year}-10-08`,
        code: `BATTLE_OF_AYACUCHO_${year}`,
        description: 'Batalla de Ayacucho'
      },
      {
        date: `${year}-11-01`,
        code: `ALL_SAINTS_${year}`,
        description: 'Todos los Santos'
      },
      {
        date: `${year}-12-08`,
        code: `IMMACULATE_CONCEPTION_${year}`,
        description: 'Inmaculada Concepción'
      },
      {
        date: `${year}-12-25`,
        code: `CHRISTMAS_${year}`,
        description: 'Navidad'
      }
    ];

    return this.createBulkExceptions({ exceptions: holidays });
  }

  /**
   * Obtiene la cantidad de días laborables en un mes (excluyendo feriados y fines de semana)
   */
  getWorkingDaysInMonth(year: number, month: number): Observable<number> {
    return new Observable(observer => {
      this.getExceptionsByMonth(year, month).subscribe({
        next: (response) => {
          const daysInMonth = new Date(year, month, 0).getDate();
          let workingDays = 0;

          for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const dayOfWeek = date.getDay();
            const dateString = date.toISOString().split('T')[0];

            // No es fin de semana
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
              // No es feriado
              const isHoliday = response.data.some(ex => ex.date === dateString);
              if (!isHoliday) {
                workingDays++;
              }
            }
          }

          observer.next(workingDays);
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }
}
