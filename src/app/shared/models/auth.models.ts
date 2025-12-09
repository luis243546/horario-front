// src/app/shared/models/auth.models.ts
export interface LoginRequest {
  email: string;
  password: string;
}
export interface LoginResponse {
  token: string;
  // otros datos si aplica (userId, roles…)
}
export interface User {
  uuid: string;
  email: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  firstLogin: boolean;
  teacher?: TeacherInfo;
}

export interface TeacherInfo {
  uuid: string;
  fullName: string;
  email: string;
  phone?: string;
  department: {
    uuid: string;
    name: string;
    code?: string;
  };
  knowledgeAreas: KnowledgeArea[];
  hasUserAccount: boolean;
  totalAvailabilities: number;
}

export interface KnowledgeArea {
  uuid: string;
  name: string;
  description?: string;
  department: {
    uuid: string;
    name: string;
    code?: string;
  };
}

export type UserRole = 'COORDINATOR' | 'ASSISTANT' | 'TEACHER' | 'ACCOUNTANT';

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

export interface TokenPayload {
  sub: string; // email
  roles: string[];
  exp: number;
  iat: number;
}

// Constantes para roles
export const USER_ROLES = {
  COORDINATOR: 'COORDINATOR',
  ASSISTANT: 'ASSISTANT',
  TEACHER: 'TEACHER',
  ACCOUNTANT: 'ACCOUNTANT'
} as const;

// Nombres para mostrar de roles
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  COORDINATOR: 'Coordinador General',
  ASSISTANT: 'Administrador',
  TEACHER: 'Docente',
  ACCOUNTANT: 'Contador'
};

// Permisos por rol
export const ROLE_PERMISSIONS = {
  COORDINATOR: {
    canDelete: true,
    canCreate: true,
    canUpdate: true,
    canRead: true,
    canManageUsers: true,
    canManagePeriods: true,
    canViewReports: true
  },
  ASSISTANT: {
    canDelete: false,
    canCreate: true,
    canUpdate: true,
    canRead: true,
    canManageUsers: false,
    canManagePeriods: true,
    canViewReports: true
  },
  TEACHER: {
    canDelete: false,
    canCreate: false,
    canUpdate: false,
    canRead: true,
    canManageUsers: false,
    canManagePeriods: false,
    canViewReports: false,
    canManageOwnAvailability: true
  },
  ACCOUNTANT: {  // ← AGREGAR PERMISOS COMPLETOS
    canDelete: false,
    canCreate: false,    // No crea datos base
    canUpdate: true,     // Puede editar asistencias (override)
    canRead: true,
    canManageUsers: false,
    canManagePeriods: false,
    canViewReports: true,
    canViewPayroll: true,         // ✅ Ver nómina
    canCalculatePayroll: true,    // ✅ Calcular nómina
    canExportPayroll: true,       // ✅ Exportar reportes
    canManageRates: true,         // ✅ Gestionar tarifas
    canOverrideAttendance: true   // ✅ Editar asistencias
  }
} as const;

// Utilidades para trabajar con roles
export class RoleUtils {
  static canDelete(role: UserRole): boolean {
    return ROLE_PERMISSIONS[role]?.canDelete || false;
  }

  static canCreate(role: UserRole): boolean {
    return ROLE_PERMISSIONS[role]?.canCreate || false;
  }

  static canUpdate(role: UserRole): boolean {
    return ROLE_PERMISSIONS[role]?.canUpdate || false;
  }

  static canManageUsers(role: UserRole): boolean {
    return ROLE_PERMISSIONS[role]?.canManageUsers || false;
  }

  static isAdmin(role: UserRole): boolean {
    return role === USER_ROLES.COORDINATOR || role === USER_ROLES.ASSISTANT;
  }

  static isTeacher(role: UserRole): boolean {
    return role === USER_ROLES.TEACHER;
  }

  static isAccountant(role: UserRole): boolean {
    return role === USER_ROLES.ACCOUNTANT;
  }

  static getDisplayName(role: UserRole): string {
    return ROLE_DISPLAY_NAMES[role] || 'Usuario';
  }

  static getAvailableRoles(): UserRole[] {
    return Object.values(USER_ROLES) as UserRole[];
  }

  static canViewPayroll(role: UserRole): boolean {
    return role === USER_ROLES.COORDINATOR ||
      role === USER_ROLES.ASSISTANT ||
      role === USER_ROLES.ACCOUNTANT;
  }

  static getRoleIcon(role: UserRole): string {
    const icons = {
      COORDINATOR: 'admin_panel_settings',
      ASSISTANT: 'support_agent',
      TEACHER: 'school',
      ACCOUNTANT: 'account_balance_wallet'
    };
    return icons[role] || 'person';
  }

  static getRoleColor(role: UserRole): string {
    const colors = {
      COORDINATOR: 'purple',
      ASSISTANT: 'blue',
      TEACHER: 'green',
      ACCOUNTANT: 'orange'
    };
    return colors[role] || 'gray';
  }
}
