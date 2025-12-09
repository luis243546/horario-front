// src/app/features/payroll-management/services/payroll-line.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseApiService, ApiResponse } from '../../../shared/services/base-api.service';
import { PayrollLine, PayrollPeriodSummary, PayrollDetailItem } from '../models/payroll.models';

@Injectable({
  providedIn: 'root'
})
export class PayrollLineService extends BaseApiService {
  private readonly endpoint = '/protected/payroll-lines';

  constructor(protected override http: HttpClient) {
    super(http);
  }

  // ==================== QUERY OPERATIONS ====================

  /**
   * Obtiene todas las líneas de nómina
   */
  getAllPayrollLines(): Observable<PayrollLine[]> {
    return this.get<PayrollLine[]>(this.endpoint)
      .pipe(map(response => response.data));
  }

  /**
   * Obtiene una línea de nómina por ID
   */
  getPayrollLineById(uuid: string): Observable<PayrollLine> {
    return this.get<PayrollLine>(`${this.endpoint}/${uuid}`)
      .pipe(map(response => response.data));
  }

  /**
   * Obtiene una línea de nómina por ID con detalles completos
   */
  getPayrollLineByIdWithDetails(uuid: string): Observable<PayrollLine> {
    return this.get<PayrollLine>(`${this.endpoint}/${uuid}/details`)
      .pipe(map(response => response.data));
  }

  /**
   * Obtiene todas las líneas de un período específico
   */
  getPayrollLinesByPeriod(periodUuid: string): Observable<PayrollLine[]> {
    return this.get<PayrollLine[]>(`${this.endpoint}/period/${periodUuid}`)
      .pipe(map(response => response.data));
  }

  /**
   * Obtiene todas las líneas de un docente
   */
  getPayrollLinesByTeacher(teacherUuid: string): Observable<PayrollLine[]> {
    return this.get<PayrollLine[]>(`${this.endpoint}/teacher/${teacherUuid}`)
      .pipe(map(response => response.data));
  }

  /**
   * Obtiene la línea específica de un docente en un período
   */
  getPayrollLineByPeriodAndTeacher(
    periodUuid: string,
    teacherUuid: string
  ): Observable<PayrollLine> {
    return this.get<PayrollLine>(
      `${this.endpoint}/period/${periodUuid}/teacher/${teacherUuid}`
    ).pipe(map(response => response.data));
  }

  // ==================== CALCULATION OPERATIONS ====================

  /**
   * Calcula la nómina para un docente específico en un período
   */
  calculatePayrollForTeacher(
    periodUuid: string,
    teacherUuid: string
  ): Observable<PayrollLine> {
    return this.post<PayrollLine>(
      `${this.endpoint}/calculate/period/${periodUuid}/teacher/${teacherUuid}`,
      {}
    ).pipe(map(response => response.data));
  }

  /**
   * Calcula la nómina para todos los docentes de un período
   */
  calculatePayrollForAllTeachers(periodUuid: string): Observable<PayrollLine[]> {
    return this.post<PayrollLine[]>(
      `${this.endpoint}/calculate/period/${periodUuid}`,
      {}
    ).pipe(map(response => response.data));
  }

  // ==================== SUMMARY OPERATIONS ====================

  /**
   * Obtiene el resumen completo de un período de nómina
   */
  getPayrollPeriodSummary(periodUuid: string): Observable<PayrollPeriodSummary> {
    return this.get<PayrollPeriodSummary>(
      `${this.endpoint}/period/${periodUuid}/summary`
    ).pipe(map(response => response.data));
  }

  // ==================== HELPER METHODS ====================

  /**
   * Parsea el JSON de detalles de una línea de nómina
   */
  parsePayrollDetails(detailsJson: string): PayrollDetailItem[] {
    try {
      return JSON.parse(detailsJson) as PayrollDetailItem[];
    } catch (error) {
      console.error('Error parsing payroll details:', error);
      return [];
    }
  }

  /**
   * Calcula el monto total de descuentos por tardanza
   */
  calculateLatePenalties(details: PayrollDetailItem[]): number {
    return details
      .filter(item => item.type === 'ATTENDANCE')
      .reduce((sum, item) => sum + item.penaltyAmount, 0);
  }

  /**
   * Calcula el total de horas extras
   */
  calculateExtraHours(details: PayrollDetailItem[]): number {
    return details
      .filter(item => item.type === 'EXTRA_ASSIGNMENT')
      .reduce((sum, item) => sum + item.hoursWorked, 0);
  }

  /**
   * Obtiene las actividades extra de una línea de nómina
   */
  getExtraActivities(details: PayrollDetailItem[]): PayrollDetailItem[] {
    return details.filter(item => item.type === 'EXTRA_ASSIGNMENT');
  }

  /**
   * Obtiene las asistencias regulares de una línea de nómina
   */
  getRegularAttendances(details: PayrollDetailItem[]): PayrollDetailItem[] {
    return details.filter(item => item.type === 'ATTENDANCE');
  }

  /**
   * Calcula el porcentaje de penalización sobre el monto bruto
   */
  getPenaltyPercentage(line: PayrollLine): number {
    if (line.grossAmount === 0) return 0;
    return (line.totalPenalties / line.grossAmount) * 100;
  }

  /**
   * Formatea el cumplimiento en un color
   */
  getComplianceColor(compliancePercentage: number): string {
    if (compliancePercentage >= 95) return 'success';
    if (compliancePercentage >= 85) return 'primary';
    if (compliancePercentage >= 75) return 'accent';
    return 'warn';
  }

  /**
   * Agrupa líneas de nómina por departamento
   */
  groupLinesByDepartment(lines: PayrollLine[]): Map<string, PayrollLine[]> {
    const grouped = new Map<string, PayrollLine[]>();

    lines.forEach(line => {
      const deptName = line.teacher.department.name;
      if (!grouped.has(deptName)) {
        grouped.set(deptName, []);
      }
      grouped.get(deptName)!.push(line);
    });

    return grouped;
  }

  /**
   * Calcula estadísticas generales de un conjunto de líneas
   */
  calculateLinesStatistics(lines: PayrollLine[]): {
    totalTeachers: number;
    totalGross: number;
    totalPenalties: number;
    totalNet: number;
    averageCompliance: number;
    totalHoursWorked: number;
    totalHoursScheduled: number;
  } {
    const totalTeachers = lines.length;
    const totalGross = lines.reduce((sum, l) => sum + l.grossAmount, 0);
    const totalPenalties = lines.reduce((sum, l) => sum + l.totalPenalties, 0);
    const totalNet = lines.reduce((sum, l) => sum + l.netAmount, 0);
    const totalHoursWorked = lines.reduce((sum, l) => sum + l.totalHoursWorked, 0);
    const totalHoursScheduled = lines.reduce((sum, l) => sum + l.totalHoursScheduled, 0);
    const averageCompliance = totalTeachers > 0
      ? lines.reduce((sum, l) => sum + l.compliancePercentage, 0) / totalTeachers
      : 0;

    return {
      totalTeachers,
      totalGross,
      totalPenalties,
      totalNet,
      averageCompliance,
      totalHoursWorked,
      totalHoursScheduled
    };
  }
}
