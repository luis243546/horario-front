// src/app/features/attendance/components/teacher-attendance-dashboard/teacher-attendance-dashboard.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, interval, map, switchMap, of, combineLatest } from 'rxjs';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';

// Services
import { TeacherAttendanceService } from '../../services/teacher-attendance.service';
import { CalendarExceptionService } from '../../services/calendar-exception.service';
import { AuthService } from '../../../../shared/services/auth.service';
import { ClassSessionService } from '../../../schedule-assignment/services/class-session.service';

// Models
import {
  TeacherAttendanceResponse,
  AttendanceStatus,
  ATTENDANCE_STATUS_NAMES,
  ATTENDANCE_STATUS_COLORS,
  ATTENDANCE_STATUS_ICONS,
  AttendanceTimeUtils
} from '../../models/teacher-attendance.model';
import { ClassSessionResponse } from '../../../schedule-assignment/models/class-session.model';

// Components
import { AttendanceHistoryComponent } from '../attendance-history/attendance-history.component';
import { AttendanceStatsCardComponent } from '../attendance-stats-card/attendance-stats-card.component';

/**
 * Interfaz para las sesiones del día actual con estado de asistencia
 */
interface SessionWithAttendance {
  session: ClassSessionResponse;
  attendance?: TeacherAttendanceResponse;
  canCheckIn: boolean;
  canCheckOut: boolean;
  status: 'not-started' | 'pending' | 'completed' | 'late';
  message: string;
}

/**
 * Dashboard principal para docentes
 * Permite marcar entrada y salida, ver horario del día y estadísticas
 */
@Component({
  selector: 'app-teacher-attendance-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule,
    MatSnackBarModule,
    MatBadgeModule,
    MatTabsModule,
    AttendanceHistoryComponent,
    AttendanceStatsCardComponent
  ],
  templateUrl: './teacher-attendance-dashboard.component.html',
  styleUrls: ['./teacher-attendance-dashboard.component.scss']
})
export class TeacherAttendanceDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private snackBar = inject(MatSnackBar);
  private attendanceService = inject(TeacherAttendanceService);
  private calendarService = inject(CalendarExceptionService);
  private authService = inject(AuthService);
  private classSessionService = inject(ClassSessionService);

  // Estado
  teacherUuid: string = '';
  teacherName: string = '';
  currentDate: string = '';
  currentTime: string = '';
  isHoliday: boolean = false;
  holidayName: string = '';

  // Sesiones del día
  todaySessions: SessionWithAttendance[] = [];
  loadingSessions: boolean = false;

  // Asistencias pendientes
  pendingAttendances: TeacherAttendanceResponse[] = [];

  // Estado de carga
  checkingIn: string | null = null;  // UUID de la sesión en proceso de check-in
  checkingOut: string | null = null; // UUID de la asistencia en proceso de check-out

  // Referencias a enums y utilidades para el template
  readonly AttendanceStatus = AttendanceStatus;
  readonly statusNames = ATTENDANCE_STATUS_NAMES;
  readonly statusColors = ATTENDANCE_STATUS_COLORS;
  readonly statusIcons = ATTENDANCE_STATUS_ICONS;
  readonly timeUtils = AttendanceTimeUtils;

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    // Obtener información del docente actual
    const userInfo = this.authService.getUserInfo();
    this.teacherUuid = userInfo?.['teacher']?.uuid || '';
    this.teacherName = this.authService.getUserDisplayName();

    if (!this.teacherUuid) {
      this.snackBar.open('Error: No se pudo obtener información del docente', 'Cerrar', {
        duration: 5000
      });
      return;
    }

    // Actualizar reloj cada segundo
    this.startClock();

    // Cargar datos iniciales
    this.loadTodayData();

    // Refrescar datos cada 30 segundos
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadTodayData());
  }

  private startClock(): void {
    interval(1000)
      .pipe(
        takeUntil(this.destroy$),
        map(() => new Date())
      )
      .subscribe(now => {
        this.currentDate = now.toLocaleDateString('es-PE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        this.currentTime = now.toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      });
  }

  private loadTodayData(): void {
    const today = new Date().toISOString().split('T')[0];

    this.loadingSessions = true;

    // Cargar en paralelo: sesiones del día, asistencias del día, y verificar si es feriado
    combineLatest([
      this.classSessionService.getSessionsByTeacher(this.teacherUuid),
      this.attendanceService.getAttendancesByTeacherAndDate(this.teacherUuid, today),
      this.calendarService.isHoliday(today)
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([sessionsResponse, attendancesResponse, holidayResponse]) => {
          const allSessions = Array.isArray(sessionsResponse.data)
            ? sessionsResponse.data
            : [sessionsResponse.data];

          const todayAttendances = Array.isArray(attendancesResponse.data)
            ? attendancesResponse.data
            : [attendancesResponse.data];

          this.isHoliday = holidayResponse.data;

          // Filtrar sesiones del día actual (comparar día de la semana)
          const todayDayOfWeek = this.getDayOfWeekName(new Date());
          const todaySessions = allSessions.filter(
            session => session.dayOfWeek === todayDayOfWeek
          );

          // Combinar sesiones con sus asistencias
          this.todaySessions = this.combineSessionsWithAttendances(
            todaySessions,
            todayAttendances
          );

          // Filtrar asistencias pendientes (sin checkout)
          this.pendingAttendances = todayAttendances.filter(
            att => !att.checkoutAt && att.status === AttendanceStatus.PENDING
          );

          this.loadingSessions = false;
        },
        error: (error) => {
          console.error('Error cargando datos del día:', error);
          this.snackBar.open('Error al cargar datos', 'Cerrar', { duration: 3000 });
          this.loadingSessions = false;
        }
      });
  }

  private combineSessionsWithAttendances(
    sessions: ClassSessionResponse[],
    attendances: TeacherAttendanceResponse[]
  ): SessionWithAttendance[] {
    return sessions.map(session => {
      const attendance = attendances.find(
        att => att.classSession?.uuid === session.uuid
      );

      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0]; // HH:mm:ss

      // Obtener la primera hora pedagógica de la sesión
      const firstHour = session.teachingHours?.[0];
      const scheduledStart = firstHour?.startTime;

      let canCheckIn = false;
      let canCheckOut = false;
      let status: 'not-started' | 'pending' | 'completed' | 'late' = 'not-started';
      let message = '';

      if (attendance) {
        // Ya tiene asistencia registrada
        if (attendance.checkoutAt) {
          status = 'completed';
          message = 'Asistencia completada';
        } else {
          status = 'pending';
          message = 'Esperando marcar salida';
          canCheckOut = true;
        }
      } else {
        // No tiene asistencia aún
        if (scheduledStart && currentTime >= scheduledStart) {
          canCheckIn = true;

          // Verificar si llegaría tarde
          const minutesLate = this.calculateMinutesLate(scheduledStart, currentTime);
          if (minutesLate > 5) {
            status = 'late';
            message = `Llegaría tarde (${minutesLate} min de retraso)`;
          } else {
            message = 'Puede marcar entrada';
          }
        } else {
          message = `Clase empieza a las ${scheduledStart}`;
        }
      }

      return {
        session,
        attendance,
        canCheckIn,
        canCheckOut,
        status,
        message
      };
    });
  }

  private calculateMinutesLate(scheduledStart: string, actualTime: string): number {
    const [schedH, schedM, schedS] = scheduledStart.split(':').map(Number);
    const [actualH, actualM, actualS] = actualTime.split(':').map(Number);

    const scheduledMinutes = schedH * 60 + schedM;
    const actualMinutes = actualH * 60 + actualM;

    return Math.max(0, actualMinutes - scheduledMinutes);
  }

  private getDayOfWeekName(date: Date): string {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getDay()];
  }

  // ==================== ACCIONES ====================

  checkIn(sessionWithAttendance: SessionWithAttendance): void {
    const session = sessionWithAttendance.session;

    if (!session.teachingHours || session.teachingHours.length === 0) {
      this.snackBar.open('Error: La sesión no tiene horas pedagógicas', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    this.checkingIn = session.uuid;

    const firstHour = session.teachingHours[0];
    const lastHour = session.teachingHours[session.teachingHours.length - 1];

    const scheduledStartTime = firstHour.startTime;
    const scheduledEndTime = lastHour.endTime;
    const totalMinutes = session.teachingHours.reduce(
      (sum, hour) => sum + hour.durationMinutes,
      0
    );

    const today = new Date().toISOString().split('T')[0];

    const request = {
      teacherUuid: this.teacherUuid,
      classSessionUuid: session.uuid,
      attendanceDate: today,
      scheduledStartTime,
      scheduledEndTime,
      scheduledDurationMinutes: totalMinutes
    };

    this.attendanceService.checkInWithSchedule(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const attendance = response.data;

          let message = 'Entrada registrada correctamente';
          if (attendance.lateMinutes > 0) {
            message = `Entrada registrada con ${attendance.lateMinutes} min de retraso`;
          }

          this.snackBar.open(message, 'Cerrar', {
            duration: 5000,
            panelClass: attendance.lateMinutes > 0 ? ['warn-snackbar'] : ['success-snackbar']
          });

          this.checkingIn = null;
          this.loadTodayData();
        },
        error: (error) => {
          console.error('Error en check-in:', error);
          this.snackBar.open(
            error.error?.message || 'Error al registrar entrada',
            'Cerrar',
            { duration: 3000 }
          );
          this.checkingIn = null;
        }
      });
  }

  checkOut(sessionWithAttendance: SessionWithAttendance): void {
    if (!sessionWithAttendance.attendance) {
      return;
    }

    const attendanceUuid = sessionWithAttendance.attendance.uuid;
    this.checkingOut = attendanceUuid;

    this.attendanceService.checkOut(attendanceUuid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const attendance = response.data;

          let message = 'Salida registrada correctamente';
          if (attendance.earlyDepartureMinutes > 0) {
            message = `Salida registrada. Salida anticipada: ${attendance.earlyDepartureMinutes} min`;
          }

          this.snackBar.open(message, 'Cerrar', {
            duration: 5000,
            panelClass: attendance.earlyDepartureMinutes > 0 ? ['warn-snackbar'] : ['success-snackbar']
          });

          this.checkingOut = null;
          this.loadTodayData();
        },
        error: (error) => {
          console.error('Error en check-out:', error);
          this.snackBar.open(
            error.error?.message || 'Error al registrar salida',
            'Cerrar',
            { duration: 3000 }
          );
          this.checkingOut = null;
        }
      });
  }

  // ==================== UTILIDADES PARA TEMPLATE ====================

  getSessionTitle(session: ClassSessionResponse): string {
    return session.course?.name || 'Sin curso';
  }

  getSessionSubtitle(session: ClassSessionResponse): string {
    const group = session.studentGroup?.name || '';
    const space = session.learningSpace?.name || '';
    return `${group} - ${space}`;
  }

  getSessionTime(session: ClassSessionResponse): string {
    if (!session.teachingHours || session.teachingHours.length === 0) {
      return 'Sin horario';
    }
    const firstHour = session.teachingHours[0];
    const lastHour = session.teachingHours[session.teachingHours.length - 1];
    return `${firstHour.startTime.substring(0, 5)} - ${lastHour.endTime.substring(0, 5)}`;
  }

  getStatusChipColor(status: string): string {
    const colors: Record<string, string> = {
      'not-started': 'primary',
      'pending': 'warn',
      'completed': 'accent',
      'late': 'warn'
    };
    return colors[status] || 'primary';
  }

  getCompletedCount(): number {
    return this.todaySessions.filter(s => s.status === 'completed').length;
  }

  getPendingCount(): number {
    return this.todaySessions.filter(s => s.status === 'pending').length;
  }

  getNotStartedCount(): number {
    return this.todaySessions.filter(s => s.status === 'not-started').length;
  }

  refreshData(): void {
    this.loadTodayData();
  }
}
