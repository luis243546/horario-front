// src/app/features/attendance/models/calendar-exception.model.ts

/**
 * Respuesta de una excepción de calendario
 */
export interface AcademicCalendarExceptionResponse {
  uuid: string;
  date: string;              // LocalDate (YYYY-MM-DD)
  code: string;              // Código único (ej: CHRISTMAS_2025, INDEPENDENCE_DAY)
  description: string;        // Descripción legible (ej: "Navidad", "Día de la Independencia")
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO para crear una excepción de calendario
 */
export interface AcademicCalendarExceptionRequest {
  date: string;              // YYYY-MM-DD
  code: string;
  description: string;
}

/**
 * DTO para crear múltiples excepciones en lote
 */
export interface BulkCalendarExceptionRequest {
  exceptions: AcademicCalendarExceptionRequest[];
}

/**
 * Respuesta de verificación si una fecha es feriado
 */
export interface IsHolidayResponse {
  isHoliday: boolean;
  exception?: AcademicCalendarExceptionResponse;
}

/**
 * Feriados predefinidos del Perú (para referencia)
 */
export interface PredefinedHoliday {
  code: string;
  description: string;
  month: number;    // 1-12
  day: number;      // 1-31
  isFixed: boolean; // true si es fecha fija, false si varía cada año
}

/**
 * Catálogo de feriados nacionales del Perú
 */
export const PERU_NATIONAL_HOLIDAYS: PredefinedHoliday[] = [
  {
    code: 'NEW_YEAR',
    description: 'Año Nuevo',
    month: 1,
    day: 1,
    isFixed: true
  },
  {
    code: 'MAUNDY_THURSDAY',
    description: 'Jueves Santo',
    month: 0, // Varía
    day: 0,
    isFixed: false
  },
  {
    code: 'GOOD_FRIDAY',
    description: 'Viernes Santo',
    month: 0, // Varía
    day: 0,
    isFixed: false
  },
  {
    code: 'EASTER_SUNDAY',
    description: 'Domingo de Resurrección',
    month: 0, // Varía
    day: 0,
    isFixed: false
  },
  {
    code: 'LABOR_DAY',
    description: 'Día del Trabajo',
    month: 5,
    day: 1,
    isFixed: true
  },
  {
    code: 'SAINT_PETER_PAUL',
    description: 'San Pedro y San Pablo',
    month: 6,
    day: 29,
    isFixed: true
  },
  {
    code: 'INDEPENDENCE_DAY',
    description: 'Día de la Independencia',
    month: 7,
    day: 28,
    isFixed: true
  },
  {
    code: 'INDEPENDENCE_DAY_2',
    description: 'Fiestas Patrias',
    month: 7,
    day: 29,
    isFixed: true
  },
  {
    code: 'BATTLE_OF_AYACUCHO',
    description: 'Batalla de Ayacucho',
    month: 8,
    day: 9,
    isFixed: true
  },
  {
    code: 'SANTA_ROSA_LIMA',
    description: 'Santa Rosa de Lima',
    month: 8,
    day: 30,
    isFixed: true
  },
  {
    code: 'ALL_SAINTS',
    description: 'Todos los Santos',
    month: 11,
    day: 1,
    isFixed: true
  },
  {
    code: 'IMMACULATE_CONCEPTION',
    description: 'Inmaculada Concepción',
    month: 12,
    day: 8,
    isFixed: true
  },
  {
    code: 'CHRISTMAS',
    description: 'Navidad',
    month: 12,
    day: 25,
    isFixed: true
  }
];

/**
 * Utilidades para trabajar con feriados
 */
export class CalendarExceptionUtils {

  /**
   * Genera las excepciones para un año específico basado en feriados fijos
   */
  static generateFixedHolidaysForYear(year: number): AcademicCalendarExceptionRequest[] {
    return PERU_NATIONAL_HOLIDAYS
      .filter(holiday => holiday.isFixed)
      .map(holiday => ({
        date: `${year}-${holiday.month.toString().padStart(2, '0')}-${holiday.day.toString().padStart(2, '0')}`,
        code: `${holiday.code}_${year}`,
        description: holiday.description
      }));
  }

  /**
   * Verifica si una fecha es fin de semana
   */
  static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Domingo o Sábado
  }

  /**
   * Cuenta los días laborables entre dos fechas (excluyendo fines de semana)
   */
  static countWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      if (!this.isWeekend(current)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  /**
   * Formatea una fecha para mostrar
   */
  static formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Obtiene el nombre del mes en español
   */
  static getMonthName(month: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month - 1];
  }
}
