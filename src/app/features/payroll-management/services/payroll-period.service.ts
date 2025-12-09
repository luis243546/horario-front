// src/app/features/payroll-management/services/payroll-period.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseApiService, ApiResponse } from '../../../shared/services/base-api.service';
import { PayrollPeriod, PayrollPeriodRequest } from '../models/payroll.models';

@Injectable({
  providedIn: 'root'
})
export class PayrollPeriodService extends BaseApiService {
  private readonly endpoint = '/protected/payroll-periods';

  constructor(protected override http: HttpClient) {
    super(http);
  }

  // ==================== CRUD OPERATIONS ====================

  /**
   * Obtiene todos los períodos de nómina
   */
  getAllPeriods(): Observable<PayrollPeriod[]> {
    return this.get<PayrollPeriod[]>(this.endpoint)
      .pipe(map(response => response.data));
  }

  /**
   * Obtiene un período por su UUID
   */
  getPeriodById(uuid: string): Observable<PayrollPeriod> {
    return this.get<PayrollPeriod>(`${this.endpoint}/${uuid}`)
      .pipe(map(response => response.data));
  }

  /**
   * Obtiene períodos activos (no calculados)
   */
  getActivePeriods(): Observable<PayrollPeriod[]> {
    return this.get<PayrollPeriod[]>(`${this.endpoint}/active`)
      .pipe(map(response => response.data));
  }

  /**
   * Obtiene períodos por año
   */
  getPeriodsByYear(year: number): Observable<PayrollPeriod[]> {
    return this.get<PayrollPeriod[]>(`${this.endpoint}/year/${year}`)
      .pipe(map(response => response.data));
  }

  /**
   * Crea un nuevo período de nómina
   */
  createPeriod(request: PayrollPeriodRequest): Observable<PayrollPeriod> {
    return this.post<PayrollPeriod>(this.endpoint, request)
      .pipe(map(response => response.data));
  }


   //Actualiza un período existente

  updatePeriod(uuid: string, request: PayrollPeriodRequest): Observable<PayrollPeriod> {
    return this.put<PayrollPeriod>(`${this.endpoint}/${uuid}`, request)
      .pipe(map(response => response.data));
  }

   //Elimina un período

  deletePeriod(uuid: string): Observable<void> {
    return this.delete<void>(`${this.endpoint}/${uuid}`)
      .pipe(map(response => response.data));
  }

  /**
   * Cierra un período (marca como calculado)
   */
  closePeriod(uuid: string): Observable<PayrollPeriod> {
    return this.patch<PayrollPeriod>(`${this.endpoint}/${uuid}/close`, {})
      .pipe(map(response => response.data));
  }

  // ==================== HELPER METHODS ====================

  /**
   * Verifica si un período está activo
   */
  isPeriodActive(period: PayrollPeriod): boolean {
    return !period.isCalculated;
  }

  /**
   * Verifica si dos períodos se solapan
   */
  periodsOverlap(period1: PayrollPeriod, period2: PayrollPeriod): boolean {
    const start1 = new Date(period1.startDate);
    const end1 = new Date(period1.endDate);
    const start2 = new Date(period2.startDate);
    const end2 = new Date(period2.endDate);

    return start1 <= end2 && start2 <= end1;
  }

  /**
   * Obtiene el período actual basado en la fecha actual
   */
  getCurrentPeriod(periods: PayrollPeriod[]): PayrollPeriod | undefined {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return periods.find(period => {
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      return today >= start && today <= end;
    });
  }

  /**
   * Calcula el número de días en un período
   */
  getPeriodDuration(period: PayrollPeriod): number {
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Formatea el rango de fechas del período
   */
  formatPeriodRange(period: PayrollPeriod): string {
    const start = new Date(period.startDate).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const end = new Date(period.endDate).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return `${start} - ${end}`;
  }
}
