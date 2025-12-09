// src/app/features/payroll-management/models/payroll.models.ts

/**
 * ========================================
 * MODELOS PARA GESTIÓN DE NÓMINA
 * ========================================
 * Basados en el backend existente
 */

// ==================== ATTENDANCE ACTIVITY TYPE ====================

export interface AttendanceActivityType {
  uuid: string;
  code: string;           // Código único del tipo (REGULAR_CLASS, WORKSHOP, etc.)
  name: string;           // Nombre descriptivo
  description?: string;   // Descripción opcional
  createdAt?: string;
  updatedAt?: string;
}

export type ActivityTypeCode =
  | 'REGULAR_CLASS'      // Clase regular del horario
  | 'MAKEUP_CLASS'       // Clase de recuperación
  | 'WORKSHOP'           // Taller
  | 'EXAM_SUPERVISION'   // Supervisión de examen
  | 'OTHER';             // Otros

export const ACTIVITY_TYPE_NAMES: Record<ActivityTypeCode, string> = {
  REGULAR_CLASS: 'Clase Regular',
  MAKEUP_CLASS: 'Clase de Recuperación',
  WORKSHOP: 'Taller',
  EXAM_SUPERVISION: 'Supervisión de Examen',
  OTHER: 'Otros'
};

export const ACTIVITY_TYPE_ICONS: Record<ActivityTypeCode, string> = {
  REGULAR_CLASS: 'school',
  MAKEUP_CLASS: 'history_edu',
  WORKSHOP: 'construction',
  EXAM_SUPERVISION: 'assignment',
  OTHER: 'more_horiz'
};

// ==================== TEACHER RATES ====================

export interface TeacherRate {
  uuid: string;
  teacher: {
    uuid: string;
    fullName: string;
    code?: string;
    email: string;
  };
  activityType: AttendanceActivityType;
  amountPerHour: number;      // Alias para ratePerHour del backend
  ratePerHour: number;         // Nombre del backend
  validFrom: string;           // Alias para effectiveFrom del backend
  validUntil?: string;         // Alias para effectiveTo del backend
  effectiveFrom: string;       // Nombre del backend (ISO date)
  effectiveTo?: string;        // Nombre del backend (ISO date, nullable)
  isActive?: boolean;          // Calculado por el backend
}

export interface TeacherRateRequest {
  teacherUuid: string;
  activityTypeUuid: string;
  ratePerHour: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

// ==================== MODALITY RATES ====================

export interface ModalityRate {
  uuid: string;
  modality: {
    uuid: string;
    name: string; // Instituto o Escuela Superior
    durationYears: number;
  };
  activityType: AttendanceActivityType;
  ratePerHour: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface ModalityRateRequest {
  modalityUuid: string;
  activityTypeUuid: string;
  ratePerHour: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

// ==================== DEFAULT RATES ====================

export interface DefaultRate {
  uuid: string;
  activityType: AttendanceActivityType;
  ratePerHour: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface DefaultRateRequest {
  activityTypeUuid: string;
  ratePerHour: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

// ==================== EXTRA ASSIGNMENTS ====================

export interface ExtraAssignment {
  uuid: string;
  teacher: {
    uuid: string;
    fullName: string;
    email: string;
  };
  title: string;
  description?: string;
  activityType: AttendanceActivityType;
  assignmentDate: string; // ISO date
  startTime: string; // HH:mm:ss
  endTime: string; // HH:mm:ss
  durationMinutes: number;
  ratePerHour?: number; // Si es null, usa tarifa del sistema
  notes?: string;
}

export interface ExtraAssignmentRequest {
  teacherUuid: string;
  title: string;
  description?: string;
  activityTypeUuid: string;
  assignmentDate: string;
  startTime: string;
  endTime: string;
  ratePerHour?: number;
  notes?: string;
}

// ==================== PAYROLL PERIOD ====================

export interface PayrollPeriod {
  uuid: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  periodType: PeriodType;
  name: string;
  description?: string;
  isCalculated: boolean;
  calculatedAt?: string; // ISO datetime
}

export type PeriodType = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';

export const PERIOD_TYPE_NAMES: Record<PeriodType, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
  CUSTOM: 'Personalizado'
};

export interface PayrollPeriodRequest {
  startDate: string;
  endDate: string;
  periodType: PeriodType;
  name: string;
  description?: string;
}

// ==================== PAYROLL LINE ====================

export interface PayrollLine {
  uuid: string;
  payrollPeriod: PayrollPeriod;
  teacher: {
    uuid: string;
    fullName: string;
    email: string;
    department: {
      uuid: string;
      name: string;
    };
  };
  totalHoursWorked: number; // Horas pedagógicas trabajadas
  totalHoursScheduled: number; // Horas pedagógicas programadas
  grossAmount: number; // Monto bruto
  totalPenalties: number; // Total de descuentos
  netAmount: number; // Monto neto (bruto - penalizaciones)
  details: string; // JSON string con desglose
  generatedAt: string; // ISO datetime
  compliancePercentage: number; // Porcentaje de cumplimiento
}

export interface PayrollDetailItem {
  type: 'ATTENDANCE' | 'EXTRA_ASSIGNMENT';
  date: string; // ISO date
  activityType: string; // Nombre del tipo de actividad
  description?: string;
  ratePerHour: number;
  hoursWorked: number; // Horas pedagógicas trabajadas
  hoursScheduled: number; // Horas pedagógicas programadas
  grossAmount: number;
  penaltyMinutes: number;
  penaltyAmount: number;
  lateMinutes?: number;
  earlyDepartureMinutes?: number;
}

export interface PayrollPeriodSummary {
  period: PayrollPeriod;
  totalTeachers: number;
  totalGrossAmount: number;
  totalPenalties: number;
  totalNetAmount: number;
  averageCompliancePercentage: number;
  lines: PayrollLine[];
}

// ==================== TEACHER ATTENDANCE ====================

export interface TeacherAttendanceResponse {
  uuid: string;
  teacher: {
    uuid: string;
    fullName: string;
    email: string;
  };
  attendanceDate: string; // ISO date
  classSession?: any; // ClassSessionResponse si existe
  extraAssignment?: ExtraAssignment; // Si existe
  attendanceActivityType: AttendanceActivityType;
  scheduledStartTime?: string; // HH:mm:ss
  scheduledEndTime?: string; // HH:mm:ss
  scheduledDurationMinutes?: number;
  checkinAt?: string; // ISO datetime
  checkoutAt?: string; // ISO datetime
  actualDurationMinutes?: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  status: AttendanceStatus;
  isHoliday: boolean;
  adminNote?: string;
}

export type AttendanceStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'OVERRIDDEN'
  | 'REJECTED'
  | 'HOLIDAY';

export const ATTENDANCE_STATUS_NAMES: Record<AttendanceStatus, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  OVERRIDDEN: 'Modificado',
  REJECTED: 'Rechazado',
  HOLIDAY: 'Feriado'
};

export const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
  PENDING: 'warn',
  APPROVED: 'primary',
  OVERRIDDEN: 'accent',
  REJECTED: 'warn',
  HOLIDAY: 'primary'
};

export interface OverrideAttendanceRequest {
  checkinAt: string; // ISO datetime
  checkoutAt: string; // ISO datetime
  resetPenalties: boolean;
  adminNote: string;
}

export interface MarkHolidayRequest {
  adminNote: string;
}

export interface AttendanceStatistics {
  totalAttendances: number;
  approvedAttendances: number;
  pendingAttendances: number;
  overriddenAttendances: number;
  rejectedAttendances: number;
  holidayCount: number;
  totalMinutesWorked: number;
  totalMinutesScheduled: number;
  totalLateMinutes: number;
  totalEarlyDepartureMinutes: number;
  compliancePercentage: number;
  onTimePercentage: number;
}

// ==================== FILTERS ====================

export interface PayrollFilters {
  periodUuid?: string;
  teacherUuid?: string;
  startDate?: string;
  endDate?: string;
}

export interface RateFilters {
  teacherUuid?: string;
  modalityUuid?: string;
  activityTypeUuid?: string;
  includeInactive?: boolean;
}

// ==================== UI HELPER INTERFACES ====================

export interface RateVersionHistory {
  current?: TeacherRate | ModalityRate | DefaultRate;
  history: (TeacherRate | ModalityRate | DefaultRate)[];
}

export interface PayrollExportData {
  period: PayrollPeriod;
  lines: PayrollLine[];
  summary: {
    totalTeachers: number;
    totalGross: number;
    totalPenalties: number;
    totalNet: number;
  };
}
