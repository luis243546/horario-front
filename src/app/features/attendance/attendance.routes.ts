import { Routes } from '@angular/router';
import { AuthGuard } from '../../shared/guards/auth.guard';

/**
 * Rutas del módulo de asistencia
 */
export const ATTENDANCE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'mi-asistencia',
    pathMatch: 'full'
  },
  {
    path: 'mi-asistencia',
    loadComponent: () =>
      import('./components/teacher-attendance-dashboard/teacher-attendance-dashboard.component')
        .then(m => m.TeacherAttendanceDashboardComponent),
    canActivate: [AuthGuard],
    data: {
      title: 'Mi Asistencia',
      breadcrumb: 'Asistencia'
    }
  }
];
