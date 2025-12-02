// src/app/features/attendance/models/activity-type.model.ts

/**
 * Representa un tipo de actividad para asistencias de docentes
 * Ejemplos: REGULAR_CLASS, WORKSHOP, SUBSTITUTE_EXAM, EXTRA_HOURS
 */
export interface AttendanceActivityTypeResponse {
  uuid: string;
  code: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO para crear o actualizar un tipo de actividad
 */
export interface AttendanceActivityTypeRequest {
  code: string;
  name: string;
  description?: string;
}

/**
 * Códigos predefinidos de tipos de actividad
 */
export enum ActivityTypeCode {
  REGULAR_CLASS = 'REGULAR_CLASS',
  WORKSHOP = 'WORKSHOP',
  SUBSTITUTE_EXAM = 'SUBSTITUTE_EXAM',
  EXTRA_HOURS = 'EXTRA_HOURS'
}

/**
 * Nombres legibles de los tipos de actividad
 */
export const ACTIVITY_TYPE_NAMES: Record<ActivityTypeCode, string> = {
  [ActivityTypeCode.REGULAR_CLASS]: 'Clase Regular',
  [ActivityTypeCode.WORKSHOP]: 'Taller',
  [ActivityTypeCode.SUBSTITUTE_EXAM]: 'Examen Sustitutorio',
  [ActivityTypeCode.EXTRA_HOURS]: 'Horas Extra'
};

/**
 * Descripciones de los tipos de actividad
 */
export const ACTIVITY_TYPE_DESCRIPTIONS: Record<ActivityTypeCode, string> = {
  [ActivityTypeCode.REGULAR_CLASS]: 'Clase programada según horario regular',
  [ActivityTypeCode.WORKSHOP]: 'Taller o actividad extracurricular',
  [ActivityTypeCode.SUBSTITUTE_EXAM]: 'Supervisión de examen de recuperación',
  [ActivityTypeCode.EXTRA_HOURS]: 'Horas adicionales no programadas'
};

/**
 * Iconos para los tipos de actividad (Material Icons)
 */
export const ACTIVITY_TYPE_ICONS: Record<ActivityTypeCode, string> = {
  [ActivityTypeCode.REGULAR_CLASS]: 'school',
  [ActivityTypeCode.WORKSHOP]: 'engineering',
  [ActivityTypeCode.SUBSTITUTE_EXAM]: 'assignment',
  [ActivityTypeCode.EXTRA_HOURS]: 'more_time'
};

/**
 * Colores para los tipos de actividad
 */
export const ACTIVITY_TYPE_COLORS: Record<ActivityTypeCode, string> = {
  [ActivityTypeCode.REGULAR_CLASS]: 'primary',
  [ActivityTypeCode.WORKSHOP]: 'accent',
  [ActivityTypeCode.SUBSTITUTE_EXAM]: 'warn',
  [ActivityTypeCode.EXTRA_HOURS]: 'success'
};
