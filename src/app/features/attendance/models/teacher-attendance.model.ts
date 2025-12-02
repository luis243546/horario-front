// src/app/features/attendance/models/teacher-attendance.model.ts

/**
 * Estados posibles de una asistencia docente
 */
export enum AttendanceStatus {
  PENDING = 'PENDING',           // Entrada registrada, esperando salida
  COMPLETED = 'COMPLETED',       // Entrada y salida registradas
  APPROVED = 'APPROVED',         // Aprobada por administrador
  REJECTED = 'REJECTED',         // Rechazada por administrador
  OVERRIDDEN = 'OVERRIDDEN',     // Modificada manualmente por admin
  HOLIDAY = 'HOLIDAY'            // Marcada como día feriado
}

/**
 * Nombres legibles de los estados
 */
export const ATTENDANCE_STATUS_NAMES: Record<AttendanceStatus, string> = {
  [AttendanceStatus.PENDING]: 'Pendiente',
  [AttendanceStatus.COMPLETED]: 'Completado',
  [AttendanceStatus.APPROVED]: 'Aprobado',
  [AttendanceStatus.REJECTED]: 'Rechazado',
  [AttendanceStatus.OVERRIDDEN]: 'Modificado',
  [AttendanceStatus.HOLIDAY]: 'Feriado'
};

/**
 * Colores para cada estado (para badges/chips)
 */
export const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
  [AttendanceStatus.PENDING]: 'warn',
  [AttendanceStatus.COMPLETED]: 'primary',
  [AttendanceStatus.APPROVED]: 'success',
  [AttendanceStatus.REJECTED]: 'danger',
  [AttendanceStatus.OVERRIDDEN]: 'accent',
  [AttendanceStatus.HOLIDAY]: 'info'
};

/**
 * Iconos para cada estado (Material Icons)
 */
export const ATTENDANCE_STATUS_ICONS: Record<AttendanceStatus, string> = {
  [AttendanceStatus.PENDING]: 'schedule',
  [AttendanceStatus.COMPLETED]: 'check_circle',
  [AttendanceStatus.APPROVED]: 'verified',
  [AttendanceStatus.REJECTED]: 'cancel',
  [AttendanceStatus.OVERRIDDEN]: 'edit',
  [AttendanceStatus.HOLIDAY]: 'beach_access'
};

/**
 * Respuesta completa de una asistencia docente
 */
export interface TeacherAttendanceResponse {
  uuid: string;
  teacher: {
    uuid: string;
    fullName: string;
    email: string;
    department?: {
      uuid: string;
      name: string;
    };
  };
  classSession?: {
    uuid: string;
    course: {
      uuid: string;
      name: string;
      code: string;
    };
    studentGroup: {
      uuid: string;
      name: string;
    };
    teachingType: {
      uuid: string;
      name: string;
    };
  };
  attendanceActivityType: {
    uuid: string;
    code: string;
    name: string;
  };
  attendanceDate: string;          // LocalDate (YYYY-MM-DD)
  scheduledStartTime?: string;     // LocalTime (HH:mm:ss)
  scheduledEndTime?: string;       // LocalTime (HH:mm:ss)
  checkinAt?: string;              // LocalDateTime (YYYY-MM-DDTHH:mm:ss)
  checkoutAt?: string;             // LocalDateTime (YYYY-MM-DDTHH:mm:ss)
  lateMinutes: number;             // Minutos de retraso
  earlyDepartureMinutes: number;   // Minutos de salida anticipada
  scheduledDurationMinutes?: number;
  actualDurationMinutes?: number;
  isHoliday: boolean;
  status: AttendanceStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO para registrar entrada básica (sin detalles de horario)
 */
export interface CheckInBasicRequest {
  teacherUuid: string;
  classSessionUuid: string;
  attendanceDate: string;  // YYYY-MM-DD
}

/**
 * DTO para registrar entrada con cálculo de penalizaciones
 * Este es el método recomendado que calcula automáticamente las penalizaciones
 */
export interface CheckInWithScheduleRequest {
  teacherUuid: string;
  classSessionUuid: string;
  attendanceDate: string;              // YYYY-MM-DD
  scheduledStartTime: string;          // HH:mm:ss
  scheduledEndTime: string;            // HH:mm:ss
  scheduledDurationMinutes: number;
}

/**
 * DTO para modificar una asistencia manualmente (admin override)
 */
export interface AttendanceOverrideRequest {
  checkinAt?: string;              // YYYY-MM-DDTHH:mm:ss
  checkoutAt?: string;             // YYYY-MM-DDTHH:mm:ss
  lateMinutes?: number;
  earlyDepartureMinutes?: number;
  actualDurationMinutes?: number;
  status?: AttendanceStatus;
  adminNotes?: string;
}

/**
 * Estadísticas de asistencia de un docente
 */
export interface AttendanceStatistics {
  totalMinutesWorked: number;
  totalMinutesScheduled: number;
  totalPenaltyMinutes: number;
  averageLateMinutes: number;
  attendanceCount: number;
  lateCount: number;
  onTimeCount: number;
  earlyDepartureCount: number;
  compliancePercentage: number;    // Porcentaje de cumplimiento
}

/**
 * Filtros para búsqueda de asistencias
 */
export interface AttendanceFilters {
  teacherUuid?: string;
  startDate?: string;
  endDate?: string;
  status?: AttendanceStatus;
  activityTypeCode?: string;
  isHoliday?: boolean;
}

/**
 * Resumen de asistencia para vistas de calendario
 */
export interface AttendanceCalendarDay {
  date: string;
  attendances: TeacherAttendanceResponse[];
  totalScheduledMinutes: number;
  totalWorkedMinutes: number;
  totalPenaltyMinutes: number;
  hasLateArrival: boolean;
  hasEarlyDeparture: boolean;
  isHoliday: boolean;
}

/**
 * Utilidad para formatear tiempo
 */
export class AttendanceTimeUtils {

  /**
   * Convierte minutos a formato HH:mm
   */
  static minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Convierte minutos a formato legible (Xh Ym)
   */
  static minutesToReadableString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  }

  /**
   * Calcula el porcentaje de cumplimiento
   */
  static calculateCompliancePercentage(
    scheduledMinutes: number,
    workedMinutes: number,
    penaltyMinutes: number
  ): number {
    if (scheduledMinutes === 0) return 100;

    const effectiveMinutes = workedMinutes - penaltyMinutes;
    const percentage = (effectiveMinutes / scheduledMinutes) * 100;

    return Math.max(0, Math.min(100, percentage));
  }

  /**
   * Determina si una llegada es tarde (considerando tolerancia)
   */
  static isLate(lateMinutes: number, toleranceMinutes: number = 5): boolean {
    return lateMinutes > toleranceMinutes;
  }

  /**
   * Determina la severidad del retraso
   */
  static getLateSeverity(lateMinutes: number): 'low' | 'medium' | 'high' {
    if (lateMinutes <= 5) return 'low';
    if (lateMinutes <= 15) return 'medium';
    return 'high';
  }
}
