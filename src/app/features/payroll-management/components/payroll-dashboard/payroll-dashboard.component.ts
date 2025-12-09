// src/app/features/payroll-management/components/payroll-dashboard/payroll-dashboard.component.ts

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, forkJoin, interval, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';

// Services
import { PayrollPeriodService } from '../../services/payroll-period.service';
import { PayrollLineService } from '../../services/payroll-line.service';
import { TeacherAttendanceService } from '../../../attendance/services/teacher-attendance.service';

// Models
import { PayrollPeriod, PayrollLine, PayrollPeriodSummary } from '../../models/payroll.models';
import { TeacherAttendanceResponse } from '../../../attendance/models/teacher-attendance.model';

interface DashboardStats {
  currentPeriod?: PayrollPeriod;
  totalTeachers: number;
  totalGrossAmount: number;
  totalPenalties: number;
  totalNetAmount: number;
  averageCompliance: number;
  pendingAttendances: number;
  calculatedLines: number;
}

interface RecentActivity {
  type: 'attendance' | 'calculation' | 'period';
  message: string;
  timestamp: Date;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-payroll-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
    MatChipsModule,
    MatBadgeModule,
    MatTabsModule,
    MatTableModule,
    MatSelectModule,
    MatFormFieldModule
  ],
  templateUrl: './payroll-dashboard.component.html',
  styleUrls: ['./payroll-dashboard.component.scss']
})
export class PayrollDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private router = inject(Router);
  private payrollPeriodService = inject(PayrollPeriodService);
  private payrollLineService = inject(PayrollLineService);
  private attendanceService = inject(TeacherAttendanceService);

  // State
  isLoading = false;
  stats: DashboardStats = {
    totalTeachers: 0,
    totalGrossAmount: 0,
    totalPenalties: 0,
    totalNetAmount: 0,
    averageCompliance: 0,
    pendingAttendances: 0,
    calculatedLines: 0
  };

  periods: PayrollPeriod[] = [];
  selectedPeriod?: PayrollPeriod;
  topTeachers: PayrollLine[] = [];
  recentActivities: RecentActivity[] = [];
  pendingAttendances: TeacherAttendanceResponse[] = [];

  // Chart data (para futuras gráficas)
  complianceChartData: any;
  paymentTrendData: any;

  ngOnInit(): void {
    this.loadDashboardData();

    // Actualizar datos cada 5 minutos
    interval(300000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadDashboardData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboardData(): void {
    this.isLoading = true;

    forkJoin({
      periods: this.payrollPeriodService.getAllPeriods(),
      activePeriods: this.payrollPeriodService.getActivePeriods()
    }).subscribe({
      next: ({ periods, activePeriods }) => {
        this.periods = periods.sort((a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );

        // Seleccionar el período actual o el más reciente activo
        this.selectedPeriod = this.payrollPeriodService.getCurrentPeriod(this.periods)
          || activePeriods[0]
          || this.periods[0];

        if (this.selectedPeriod) {
          this.loadPeriodData(this.selectedPeriod.uuid);
        } else {
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.isLoading = false;
      }
    });
  }

  loadPeriodData(periodUuid: string): void {
    forkJoin({
      summary: this.payrollLineService.getPayrollPeriodSummary(periodUuid),
      lines: this.payrollLineService.getPayrollLinesByPeriod(periodUuid),
      attendances: this.loadPendingAttendances()
    }).subscribe({
      next: ({ summary, lines, attendances }) => {
        this.updateStats(summary, lines, attendances);
        this.updateTopTeachers(lines);
        this.updateRecentActivities(summary, attendances);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading period data:', error);
        this.isLoading = false;
      }
    });
  }

  private loadPendingAttendances() {
    if (!this.selectedPeriod) {
      return of([]);
    }

    return this.attendanceService.getAttendancesByDateRange(
      this.selectedPeriod.startDate,
      this.selectedPeriod.endDate
    ).pipe(
      map(response => {
        // response.data contiene el array de asistencias
        const attendances = response.data || [];
        return attendances.filter((a: TeacherAttendanceResponse) => a.status === 'PENDING');
      }),
      catchError(error => {
        console.error('Error loading pending attendances:', error);
        return of([]);
      })
    );
  }

  private updateStats(
    summary: PayrollPeriodSummary,
    lines: PayrollLine[],
    attendances: TeacherAttendanceResponse[]
  ): void {
    this.stats = {
      currentPeriod: this.selectedPeriod,
      totalTeachers: summary.totalTeachers,
      totalGrossAmount: summary.totalGrossAmount,
      totalPenalties: summary.totalPenalties,
      totalNetAmount: summary.totalNetAmount,
      averageCompliance: summary.averageCompliancePercentage,
      pendingAttendances: attendances.length,
      calculatedLines: lines.length
    };

    this.pendingAttendances = attendances.slice(0, 10); // Últimas 10
  }

  private updateTopTeachers(lines: PayrollLine[]): void {
    this.topTeachers = [...lines]
      .sort((a, b) => b.netAmount - a.netAmount)
      .slice(0, 5);
  }

  private updateRecentActivities(
    summary: PayrollPeriodSummary,
    attendances: TeacherAttendanceResponse[]
  ): void {
    const activities: RecentActivity[] = [];

    // Agregar actividad de cálculo si el período está calculado
    if (summary.period.isCalculated && summary.period.calculatedAt) {
      activities.push({
        type: 'calculation',
        message: `Nómina calculada para ${summary.totalTeachers} docentes`,
        timestamp: new Date(summary.period.calculatedAt),
        icon: 'calculate',
        color: 'primary'
      });
    }

    // Agregar asistencias pendientes recientes
    attendances.slice(0, 5).forEach((att: TeacherAttendanceResponse) => {
      activities.push({
        type: 'attendance',
        message: `Asistencia pendiente: ${att.teacher.fullName}`,
        timestamp: new Date(att.attendanceDate),
        icon: 'schedule',
        color: 'warn'
      });
    });

    this.recentActivities = activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }

  onPeriodChange(period: PayrollPeriod): void {
    this.selectedPeriod = period;
    this.loadPeriodData(period.uuid);
  }

  navigateTo(route: string): void {
    this.router.navigate([`/dashboard/nomina/${route}`]);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  getComplianceColor(compliance: number): string {
    if (compliance >= 95) return 'success';
    if (compliance >= 85) return 'primary';
    if (compliance >= 75) return 'accent';
    return 'warn';
  }

  formatTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    return 'hace un momento';
  }
}
