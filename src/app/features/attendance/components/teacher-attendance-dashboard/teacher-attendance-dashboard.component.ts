// src/app/features/attendance/components/teacher-attendance-dashboard/teacher-attendance-dashboard.component.ts
// ✅ VERSIÓN CORREGIDA - USA MeService para obtener teacherUuid

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, interval, map, switchMap, of, combineLatest, finalize } from 'rxjs';

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
import { MeService } from '../../../../shared/services/me.service'; // ✅ AGREGADO
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
import {ClassNotificationService} from '../../services/class-notification.service';

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
  private meService = inject(MeService); // ✅ AGREGADO
  private classSessionService = inject(ClassSessionService);
  private notificationService = inject(ClassNotificationService); // ✅ AGREGAR ESTA LÍNEA

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
  loadingProfile: boolean = false; // ✅ AGREGADO

  // ✅ NUEVO: Horario semanal completo
  weeklySchedule: Map<string, ClassSessionResponse[]> = new Map();
  loadingWeeklySchedule: boolean = false;
  weekDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  weekDayNames: Record<string, string> = {
    'MONDAY': 'Lunes',
    'TUESDAY': 'Martes',
    'WEDNESDAY': 'Miércoles',
    'THURSDAY': 'Jueves',
    'FRIDAY': 'Viernes',
    'SATURDAY': 'Sábado',
    'SUNDAY': 'Domingo'
  };

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
    this.notificationService.stopMonitoring(); // ✅ AGREGAR ESTA LÍNEA
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    console.log('🔍 TeacherAttendanceDashboard - Inicializando...');

    // ✅ CORREGIDO: Obtener información del docente desde el backend
    this.loadTeacherProfile();
  }

  /**
   * ✅ NUEVO MÉTODO: Carga el perfil del docente desde el backend
   */
  private loadTeacherProfile(): void {
    this.loadingProfile = true;

    this.meService.getCurrentUserProfile()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loadingProfile = false)
      )
      .subscribe({
        next: (response) => {
          console.log('✅ Perfil de usuario recibido:', response.data);

          const profile = response.data;

          // Verificar que sea un docente
          if (profile.role !== 'TEACHER' || !profile.teacher) {
            console.error('❌ El usuario no es un docente o no tiene información de teacher');
            this.snackBar.open('Error: El usuario actual no es un docente', 'Cerrar', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
            return;
          }

          // ✅ ASIGNAR EL UUID DEL TEACHER
          this.teacherUuid = profile.teacher.uuid;
          this.teacherName = profile.teacher.fullName;

          console.log('✅ TeacherUUID obtenido:', this.teacherUuid);
          console.log('✅ TeacherName:', this.teacherName);

          // Ahora sí, inicializar el resto del componente
          this.startClock();
          this.loadTodayData();
          this.loadWeeklySchedule(); // ✅ AGREGAR ESTA LÍNEA
          // ✅ INICIAR MONITOREO DE NOTIFICACIONES
          this.notificationService.startMonitoring(this.teacherUuid);

          // Refrescar datos cada 30 segundos
          interval(30000)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.loadTodayData());
        },
        error: (error) => {
          console.error('❌ Error al cargar perfil del docente:', error);

          this.snackBar.open(
            'Error: No se pudo obtener información del docente',
            'Cerrar',
            {
              duration: 5000,
              panelClass: ['error-snackbar']
            }
          );
        }
      });
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
    if (!this.teacherUuid) {
      console.warn('⚠️ No se puede cargar datos sin teacherUuid');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const dayOfWeekToday = this.getDayOfWeekName(new Date());

    console.log('🔍 DEBUG - loadTodayData iniciado:', {
      teacherUuid: this.teacherUuid,
      today: today,
      dayOfWeek: dayOfWeekToday
    });

    this.loadingSessions = true;

    // Cargar en paralelo: sesiones del día, asistencias del día, y verificar si es feriado
    combineLatest([
      this.classSessionService.getSessionsByTeacher(this.teacherUuid),
      this.attendanceService.getAttendancesByTeacherAndDate(this.teacherUuid, today),
      this.calendarService.isHoliday(today)
    ])
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loadingSessions = false)
      )
      .subscribe({
        next: ([sessionsResponse, attendancesResponse, holidayResponse]) => {
          console.log('📊 Datos cargados del backend:', {
            sessionsResponse: sessionsResponse,
            sessions: sessionsResponse.data,
            sessionsCount: Array.isArray(sessionsResponse.data) ? sessionsResponse.data.length : 1,
            attendances: attendancesResponse.data,
            holiday: holidayResponse.data
          });

          const allSessions = Array.isArray(sessionsResponse.data)
            ? sessionsResponse.data
            : [sessionsResponse.data];

          console.log('📋 TODAS las sesiones del docente:', {
            total: allSessions.length,
            sessions: allSessions.map(s => ({
              uuid: s.uuid,
              dayOfWeek: s.dayOfWeek,
              course: s.course?.name,
              group: s.studentGroup?.name,
              hours: s.teachingHours?.length || 0
            }))
          });

          const todayAttendances = Array.isArray(attendancesResponse.data)
            ? attendancesResponse.data
            : [attendancesResponse.data];

          // Verificar si es feriado
          this.isHoliday = holidayResponse.data || false;

          // Filtrar sesiones de hoy
          const dayOfWeek = this.getDayOfWeekName(new Date());
          console.log('🔍 Filtrando por día:', dayOfWeek);

          const todaySessions = allSessions.filter(
            session => session.dayOfWeek === dayOfWeek
          );

          console.log('✅ Sesiones filtradas para HOY:', {
            dayOfWeek: dayOfWeek,
            filtered: todaySessions.length,
            sessions: todaySessions.map(s => ({
              uuid: s.uuid,
              course: s.course?.name,
              group: s.studentGroup?.name
            }))
          });

          // Combinar sesiones con asistencias
          this.todaySessions = this.combineSessionsWithAttendances(
            todaySessions,
            todayAttendances
          );

          console.log('✅ Sesiones del día procesadas:', this.todaySessions.length);
        },
        error: (error) => {
          console.error('❌ Error al cargar datos del día:', error);
          console.error('❌ Error detallado:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error
          });

          this.snackBar.open('Error al cargar horario del día', 'Cerrar', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  /**
   * ✅ NUEVO: Cargar horario semanal completo del docente
   */
  private loadWeeklySchedule(): void {
    if (!this.teacherUuid) {
      console.warn('⚠️ No se puede cargar horario sin teacherUuid');
      return;
    }

    this.loadingWeeklySchedule = true;

    this.classSessionService.getSessionsByTeacher(this.teacherUuid)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loadingWeeklySchedule = false)
      )
      .subscribe({
        next: (response) => {
          const allSessions = Array.isArray(response.data) ? response.data : [response.data];

          console.log('📅 Horario semanal cargado:', {
            totalSessions: allSessions.length,
            sessions: allSessions
          });

          // Agrupar sesiones por día de la semana
          this.weeklySchedule.clear();

          this.weekDays.forEach(day => {
            const daySessions = allSessions
              .filter(session => session.dayOfWeek === day)
              .sort((a, b) => {
                // Ordenar por hora de inicio
                const timeA = a.teachingHours[0]?.startTime || '00:00:00';
                const timeB = b.teachingHours[0]?.startTime || '00:00:00';
                return timeA.localeCompare(timeB);
              });

            if (daySessions.length > 0) {
              this.weeklySchedule.set(day, daySessions);
            }
          });

          console.log('📊 Horario agrupado por día:', {
            days: Array.from(this.weeklySchedule.keys()),
            totalDays: this.weeklySchedule.size
          });
        },
        error: (error) => {
          console.error('❌ Error al cargar horario semanal:', error);
          this.snackBar.open('Error al cargar horario semanal', 'Cerrar', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  private combineSessionsWithAttendances(
    sessions: ClassSessionResponse[],
    attendances: TeacherAttendanceResponse[]
  ): SessionWithAttendance[] {
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0]; // HH:mm:ss

    console.log('🔍 DEBUG - combineSessionsWithAttendances:', {
      sessions: sessions.length,
      attendances: attendances.length,
      currentTime: currentTime,
      isHoliday: this.isHoliday
    });

    return sessions.map(session => {
      // Buscar asistencia correspondiente
      const attendance = attendances.find(att => att.classSession?.uuid === session.uuid);

      console.log(`🔍 Procesando sesión ${session.course?.name}:`, {
        sessionUuid: session.uuid,
        attendance: attendance ? 'SÍ' : 'NO',
        attendanceUuid: attendance?.uuid,
        checkinAt: attendance?.checkinAt,
        checkoutAt: attendance?.checkoutAt
      });

      // Obtener horario de la sesión
      const firstHour = session.teachingHours[0];
      const lastHour = session.teachingHours[session.teachingHours.length - 1];
      const scheduledStart = firstHour.startTime;
      const scheduledEnd = lastHour.endTime;

      // Calcular si es hora de clase (30 minutos antes hasta que termine)
      const [schedH, schedM] = scheduledStart.split(':').map(Number);
      const [endH, endM] = scheduledEnd.split(':').map(Number);
      const [currH, currM] = currentTime.split(':').map(Number);

      const scheduledStartMinutes = schedH * 60 + schedM;
      const scheduledEndMinutes = endH * 60 + endM;
      const currentMinutes = currH * 60 + currM;

      // Permitir marcar 30 minutos antes de la clase
      const canMarkNow = currentMinutes >= (scheduledStartMinutes - 30) &&
        currentMinutes <= scheduledEndMinutes;

      let canCheckIn = false;
      let canCheckOut = false;
      let status: 'not-started' | 'pending' | 'completed' | 'late' = 'not-started';
      let message = '';

      if (this.isHoliday) {
        // Es feriado, no se puede marcar nada
        status = 'not-started';
        message = 'Día feriado';
        canCheckIn = false;
        canCheckOut = false;
      } else if (attendance) {
        // Ya tiene asistencia registrada
        if (attendance.checkoutAt) {
          // Asistencia completada
          status = 'completed';
          message = 'Asistencia completada';
          canCheckIn = false;
          canCheckOut = false;
        } else {
          // Asistencia en curso (solo check-in, sin check-out)
          status = 'pending';
          message = 'En curso - Marcar salida';
          canCheckIn = false;
          canCheckOut = true; // Puede marcar salida

          // Mostrar si llegó tarde
          if (attendance.lateMinutes > 0) {
            status = 'late';
            message = `En curso - Llegó ${attendance.lateMinutes} min tarde`;
          }
        }
      } else {
        // No tiene asistencia registrada
        if (!canMarkNow) {
          // Aún no es hora de marcar
          if (currentMinutes < (scheduledStartMinutes - 30)) {
            status = 'not-started';
            message = `Clase inicia a las ${scheduledStart.substring(0, 5)}`;
          } else {
            // Ya pasó la hora de clase
            status = 'not-started';
            message = 'Clase finalizada - No se marcó asistencia';
          }
          canCheckIn = false;
        } else {
          // Es hora de marcar entrada
          status = 'not-started';
          message = 'Marcar entrada';
          canCheckIn = true;

          // Advertir si llegaría tarde
          if (currentMinutes > (scheduledStartMinutes + 5)) {
            const lateMinutes = currentMinutes - scheduledStartMinutes;
            status = 'late';
            message = `Llegaría tarde (${lateMinutes} min de retraso)`;
          }
        }
      }

      console.log(`✅ Resultado para ${session.course?.name}:`, {
        status,
        message,
        canCheckIn,
        canCheckOut
      });

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
    const [schedH, schedM] = scheduledStart.split(':').map(Number);
    const [actualH, actualM] = actualTime.split(':').map(Number);

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

    // ✅ VALIDACIÓN 1: Verificar que no haya asistencia previa
    if (sessionWithAttendance.attendance) {
      this.snackBar.open('Ya existe una asistencia registrada para esta sesión', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // ✅ VALIDACIÓN 2: Verificar que no esté en proceso de check-in
    if (this.checkingIn === session.uuid) {
      console.log('⚠️ Ya hay un check-in en proceso para esta sesión');
      return; // Ya está procesando, no hacer nada
    }

    if (!session.teachingHours || session.teachingHours.length === 0) {
      this.snackBar.open('Error: La sesión no tiene horas pedagógicas', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
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

    console.log('📤 Enviando check-in:', request);

    this.attendanceService.checkInWithSchedule(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          // ✅ Limpiar el estado de loading SIEMPRE (incluso si hay error)
          this.checkingIn = null;
        })
      )
      .subscribe({
        next: (response) => {
          console.log('✅ Entrada registrada correctamente');
          const attendance = response.data;

          let message = 'Entrada registrada correctamente';
          if (attendance.lateMinutes > 0) {
            message = `Entrada registrada con ${attendance.lateMinutes} min de retraso`;
          }

          this.snackBar.open(message, 'Cerrar', {
            duration: 5000,
            panelClass: attendance.lateMinutes > 0 ? ['warning-snackbar'] : ['success-snackbar']
          });

          // Recargar datos
          this.loadTodayData();
        },
        error: (error) => {
          console.error('❌ Error al marcar entrada:', error);

          // Mostrar mensaje de error del backend si existe
          const errorMessage = error.error?.message || 'Error al marcar entrada';

          this.snackBar.open(errorMessage, 'Cerrar', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });

          // Recargar datos para reflejar el estado actual
          this.loadTodayData();
        }
      });
  }

  checkOut(sessionWithAttendance: SessionWithAttendance): void {
    const attendance = sessionWithAttendance.attendance;

    if (!attendance) {
      this.snackBar.open('Error: No hay registro de entrada', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    this.checkingOut = attendance.uuid;

    console.log('📤 Enviando check-out para:', attendance.uuid);

    this.attendanceService.checkOut(attendance.uuid)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.checkingOut = null)
      )
      .subscribe({
        next: (response) => {
          const updated = response.data;

          let message = 'Salida registrada correctamente';
          if (updated.earlyDepartureMinutes > 0) {
            message = `Salida registrada con ${updated.earlyDepartureMinutes} min de salida anticipada`;
          }

          this.snackBar.open(message, 'Cerrar', {
            duration: 5000,
            panelClass: updated.earlyDepartureMinutes > 0 ? ['warning-snackbar'] : ['success-snackbar']
          });

          // Recargar datos
          this.loadTodayData();
        },
        error: (error) => {
          console.error('❌ Error al marcar salida:', error);
          this.snackBar.open('Error al marcar salida', 'Cerrar', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  // ==================== UTILIDADES PARA EL TEMPLATE ====================

  /**
   * ✅ Refresca los datos del día actual
   */
  refreshData(): void {
    console.log('🔄 Refrescando datos...');
    this.loadTodayData();
  }

  /**
   * ✅ Obtiene el título de la sesión (nombre del curso)
   */
  getSessionTitle(session: ClassSessionResponse): string {
    return session.course?.name || 'Sin curso';
  }

  /**
   * ✅ Obtiene el subtítulo de la sesión (grupo + ambiente)
   */
  getSessionSubtitle(session: ClassSessionResponse): string {
    const group = session.studentGroup?.name || '';
    const space = session.learningSpace?.name || '';
    return `${group} - ${space}`;
  }

  /**
   * ✅ Obtiene el horario de la sesión (hora inicio - hora fin)
   */
  getSessionTime(session: ClassSessionResponse): string {
    if (!session.teachingHours || session.teachingHours.length === 0) {
      return 'Sin horario';
    }
    const firstHour = session.teachingHours[0];
    const lastHour = session.teachingHours[session.teachingHours.length - 1];
    return `${firstHour.startTime.substring(0, 5)} - ${lastHour.endTime.substring(0, 5)}`;
  }

  /**
   * ✅ Obtiene el color del chip según el estado
   */
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
    return this.todaySessions.filter(item => item.status === 'completed').length;
  }

  getPendingCount(): number {
    return this.todaySessions.filter(item => item.status === 'pending').length;
  }

  getNotStartedCount(): number {
    return this.todaySessions.filter(item => item.status === 'not-started').length;
  }

  formatTime(time?: string): string {
    if (!time) return '--:--';
    return time.substring(0, 5); // HH:mm
  }

  formatDateTime(dateTime?: string): string {
    if (!dateTime) return '--:--';
    const date = new Date(dateTime);
    return date.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusChipClass(status: string): string {
    const classes: Record<string, string> = {
      'not-started': 'status-not-started',
      'pending': 'status-pending',
      'completed': 'status-completed',
      'late': 'status-late'
    };
    return classes[status] || '';
  }

  getCourseDisplayName(session: ClassSessionResponse): string {
    return session.course?.name || 'Sin nombre';
  }

  getGroupDisplayName(session: ClassSessionResponse): string {
    return session.studentGroup?.name || 'Sin grupo';
  }

  getSessionTimeRange(session: ClassSessionResponse): string {
    if (!session.teachingHours || session.teachingHours.length === 0) {
      return '--:-- - --:--';
    }

    const firstHour = session.teachingHours[0];
    const lastHour = session.teachingHours[session.teachingHours.length - 1];

    return `${this.formatTime(firstHour.startTime)} - ${this.formatTime(lastHour.endTime)}`;
  }

  //agregado

  /**
   * ✅ Obtiene las sesiones de un día específico
   */
  getSessionsForDay(day: string): ClassSessionResponse[] {
    return this.weeklySchedule.get(day) || [];
  }

  /**
   * ✅ Verifica si un día tiene clases
   */
  hasSessions(day: string): boolean {
    const sessions = this.weeklySchedule.get(day);
    return sessions !== undefined && sessions.length > 0;
  }

  /**
   * ✅ Obtiene el total de horas de un día
   */
  getTotalHoursForDay(day: string): number {
    const sessions = this.weeklySchedule.get(day) || [];
    return sessions.reduce((total, session) => {
      const minutes = session.teachingHours?.reduce(
        (sum, hour) => sum + hour.durationMinutes,
        0
      ) || 0;
      return total + minutes;
    }, 0);
  }

  /**
   * ✅ Formatea minutos a formato "Xh Ymin"
   */
  formatMinutesToHours(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}min`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}min`;
    }
  }

  /**
   * ✅ Obtiene el día actual de la semana
   */
  getCurrentDayOfWeek(): string {
    return this.getDayOfWeekName(new Date());
  }

  /**
   * ✅ Verifica si es el día actual
   */
  isToday(day: string): boolean {
    return day === this.getCurrentDayOfWeek();
  }

}
