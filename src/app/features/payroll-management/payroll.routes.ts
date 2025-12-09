// src/app/features/payroll-management/payroll.routes.ts
import { Routes } from '@angular/router';
import { AuthGuard } from '../../shared/guards/auth.guard';

export const PAYROLL_ROUTES: Routes = [
  // Ruta principal - redirige al dashboard
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  // Dashboard de Nómina
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/payroll-dashboard/payroll-dashboard.component')
        .then(m => m.PayrollDashboardComponent),
    canActivate: [AuthGuard],
    data: {
      title: 'Dashboard de Nómina',
      breadcrumb: 'Dashboard',
      roles: ['COORDINATOR', 'ASSISTANT', 'ACCOUNTANT']
    }
  },
  // Gestión de Períodos
  {
    path: 'periods',
    loadComponent: () =>
      import('./components/payroll-period-list/payroll-period-list.component')
        .then(m => m.PayrollPeriodListComponent),
    canActivate: [AuthGuard],
    data: {
      title: 'Períodos de Nómina',
      breadcrumb: 'Períodos',
      roles: ['COORDINATOR', 'ASSISTANT', 'ACCOUNTANT']
    }
  },
  // Gestión de Tarifas
  {
    path: 'rates',
    loadComponent: () =>
      import('./components/rate-management/rate-management.component')
        .then(m => m.RateManagementComponent),
    canActivate: [AuthGuard],
    data: {
      title: 'Gestión de Tarifas',
      breadcrumb: 'Tarifas',
      roles: ['COORDINATOR', 'ASSISTANT', 'ACCOUNTANT']
    }
  },
  // Futuras rutas:
  // - Cálculo de nómina
  // - Líneas de nómina
  // - Override de asistencias
  // - Actividades extra
  // - Reportes
];
