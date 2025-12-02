// src/app/features/attendance/components/attendance-history/attendance-history.component.ts
import { Component, Input, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

// Angular Material
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Services
import { TeacherAttendanceService } from '../../services/teacher-attendance.service';

// Models
import {
  TeacherAttendanceResponse,
  AttendanceStatus,
  ATTENDANCE_STATUS_NAMES,
  ATTENDANCE_STATUS_COLORS,
  AttendanceTimeUtils
} from '../../models/teacher-attendance.model';

/**
 * Componente de historial de asistencias
 * Muestra tabla paginada con filtros de fecha
 */
@Component({
  selector: 'app-attendance-history',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './attendance-history.component.html',
  styleUrls: ['./attendance-history.component.scss']
})
export class AttendanceHistoryComponent implements OnInit, OnDestroy {
  @Input() teacherUuid!: string;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private destroy$ = new Subject<void>();
  private attendanceService = inject(TeacherAttendanceService);

  // Data source para la tabla
  dataSource = new MatTableDataSource<TeacherAttendanceResponse>();

  // Columnas de la tabla
  displayedColumns: string[] = [
    'date',
    'course',
    'group',
    'checkIn',
    'checkOut',
    'duration',
    'penalties',
    'status'
  ];

  // Estado de carga
  loading: boolean = false;

  // Filtros de fecha
  startDateControl = new FormControl<Date | null>(null);
  endDateControl = new FormControl<Date | null>(null);

  // Referencias para el template
  readonly AttendanceStatus = AttendanceStatus; // ✅ Exponer el enum al template
  readonly statusNames = ATTENDANCE_STATUS_NAMES;
  readonly statusColors = ATTENDANCE_STATUS_COLORS;
  readonly timeUtils = AttendanceTimeUtils;

  ngOnInit(): void {
    this.initializeFilters();
    this.loadAttendances();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private initializeFilters(): void {
    // Por defecto: últimos 30 días
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    this.startDateControl.setValue(startDate);
    this.endDateControl.setValue(endDate);
  }

  loadAttendances(): void {
    if (!this.teacherUuid) {
      console.error('teacherUuid no proporcionado');
      return;
    }

    const startDate = this.startDateControl.value;
    const endDate = this.endDateControl.value;

    if (!startDate || !endDate) {
      return;
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    this.loading = true;

    this.attendanceService
      .getAttendancesByTeacherAndDateRange(this.teacherUuid, startDateStr, endDateStr)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const attendances = Array.isArray(response.data)
            ? response.data
            : [response.data];

          // Ordenar por fecha descendente
          attendances.sort((a, b) => {
            return new Date(b.attendanceDate).getTime() - new Date(a.attendanceDate).getTime();
          });

          this.dataSource.data = attendances;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error cargando historial:', error);
          this.loading = false;
        }
      });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  clearFilters(): void {
    this.initializeFilters();
    this.loadAttendances();
  }

  exportToCSV(): void {
    const data = this.dataSource.data;

    if (data.length === 0) {
      return;
    }

    const headers = [
      'Fecha',
      'Curso',
      'Grupo',
      'Entrada',
      'Salida',
      'Duración (min)',
      'Retraso (min)',
      'Salida Anticipada (min)',
      'Estado'
    ];

    const rows = data.map(att => [
      att.attendanceDate,
      att.classSession?.course.name || 'N/A',
      att.classSession?.studentGroup.name || 'N/A',
      att.checkinAt ? new Date(att.checkinAt).toLocaleTimeString('es-PE') : 'N/A',
      att.checkoutAt ? new Date(att.checkoutAt).toLocaleTimeString('es-PE') : 'N/A',
      att.actualDurationMinutes || 0,
      att.lateMinutes || 0,
      att.earlyDepartureMinutes || 0,
      ATTENDANCE_STATUS_NAMES[att.status]
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `historial_asistencias_${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Utilidades para el template
  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-PE', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatTime(dateTimeStr: string): string {
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTotalPenaltyMinutes(attendance: TeacherAttendanceResponse): number {
    return attendance.lateMinutes + attendance.earlyDepartureMinutes;
  }

  getStatusColor(status: AttendanceStatus): string {
    return this.statusColors[status];
  }

  getStatusName(status: AttendanceStatus): string {
    return this.statusNames[status];
  }
}
