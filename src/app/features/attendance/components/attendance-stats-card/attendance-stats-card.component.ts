// src/app/features/attendance/components/attendance-stats-card/attendance-stats-card.component.ts
import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

// Services
import { TeacherAttendanceService } from '../../services/teacher-attendance.service';

// Models
import {
  AttendanceStatistics,
  AttendanceTimeUtils
} from '../../models/teacher-attendance.model';

/**
 * Período de tiempo para las estadísticas
 */
interface StatsPeriod {
  label: string;
  value: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Componente de tarjeta de estadísticas de asistencia
 * Muestra métricas y gráficos de cumplimiento
 */
@Component({
  selector: 'app-attendance-stats-card',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './attendance-stats-card.component.html',
  styleUrls: ['./attendance-stats-card.component.scss']
})
export class AttendanceStatsCardComponent implements OnInit, OnDestroy {
  @Input() teacherUuid!: string;

  private destroy$ = new Subject<void>();
  private attendanceService = inject(TeacherAttendanceService);

  // Estado
  stats: AttendanceStatistics | null = null;
  loading: boolean = false;

  // Control de período
  periodControl = new FormControl<string>('current_month');

  // Períodos disponibles
  periods: StatsPeriod[] = [];

  // Referencias para el template
  readonly timeUtils = AttendanceTimeUtils;

  ngOnInit(): void {
    this.initializePeriods();
    this.loadStatistics();

    // Recargar cuando cambie el período
    this.periodControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadStatistics());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializePeriods(): void {
    const now = new Date();

    // Mes actual
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Mes anterior
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Últimos 7 días
    const last7DaysStart = new Date(now);
    last7DaysStart.setDate(last7DaysStart.getDate() - 7);

    // Últimos 30 días
    const last30DaysStart = new Date(now);
    last30DaysStart.setDate(last30DaysStart.getDate() - 30);

    // Año actual
    const currentYearStart = new Date(now.getFullYear(), 0, 1);
    const currentYearEnd = new Date(now.getFullYear(), 11, 31);

    this.periods = [
      {
        label: 'Últimos 7 días',
        value: 'last_7_days',
        startDate: last7DaysStart,
        endDate: now
      },
      {
        label: 'Últimos 30 días',
        value: 'last_30_days',
        startDate: last30DaysStart,
        endDate: now
      },
      {
        label: 'Mes actual',
        value: 'current_month',
        startDate: currentMonthStart,
        endDate: currentMonthEnd
      },
      {
        label: 'Mes anterior',
        value: 'last_month',
        startDate: lastMonthStart,
        endDate: lastMonthEnd
      },
      {
        label: 'Año actual',
        value: 'current_year',
        startDate: currentYearStart,
        endDate: currentYearEnd
      }
    ];
  }

  private loadStatistics(): void {
    if (!this.teacherUuid) {
      console.error('teacherUuid no proporcionado');
      return;
    }

    const selectedPeriod = this.periods.find(
      p => p.value === this.periodControl.value
    );

    if (!selectedPeriod) {
      return;
    }

    const startDate = selectedPeriod.startDate.toISOString().split('T')[0];
    const endDate = selectedPeriod.endDate.toISOString().split('T')[0];

    this.loading = true;

    this.attendanceService.getStatistics(this.teacherUuid, startDate, endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.stats = response.data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error cargando estadísticas:', error);
          this.loading = false;
        }
      });
  }

  // ==================== CÁLCULOS PARA EL TEMPLATE ====================

  getCompliancePercentage(): number {
    if (!this.stats || this.stats.totalMinutesScheduled === 0) {
      return 100;
    }

    return this.timeUtils.calculateCompliancePercentage(
      this.stats.totalMinutesScheduled,
      this.stats.totalMinutesWorked,
      this.stats.totalPenaltyMinutes
    );
  }

  getComplianceColor(): string {
    const percentage = this.getCompliancePercentage();

    if (percentage >= 95) return 'primary';
    if (percentage >= 85) return 'accent';
    if (percentage >= 70) return 'warn';
    return 'warn';
  }

  getOnTimePercentage(): number {
    if (!this.stats || this.stats.attendanceCount === 0) {
      return 100;
    }

    return Math.round((this.stats.onTimeCount / this.stats.attendanceCount) * 100);
  }

  getAverageHoursPerDay(): number {
    if (!this.stats || this.stats.attendanceCount === 0) {
      return 0;
    }

    return Math.round((this.stats.totalMinutesWorked / this.stats.attendanceCount) / 60 * 10) / 10;
  }

  getTotalPenaltyHours(): number {
    if (!this.stats) {
      return 0;
    }

    return Math.round((this.stats.totalPenaltyMinutes / 60) * 10) / 10;
  }

  getPenaltySeverity(): 'success' | 'warn' | 'danger' {
    const percentage = this.getCompliancePercentage();

    if (percentage >= 95) return 'success';
    if (percentage >= 85) return 'warn';
    return 'danger';
  }
}
