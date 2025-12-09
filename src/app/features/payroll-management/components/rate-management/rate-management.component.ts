// src/app/features/payroll-management/components/rate-management/rate-management.component.ts

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Child Components
import { TeacherRateListComponent } from './teacher-rate-list/teacher-rate-list.component';
import { ModalityRateListComponent } from './modality-rate-list/modality-rate-list.component';
import { DefaultRateListComponent } from './default-rate-list/default-rate-list.component';

// Services
import { RateManagementService } from '../../services/rate-management.service';

// Models
import { AttendanceActivityType } from '../../models/payroll.models';

@Component({
  selector: 'app-rate-management',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    TeacherRateListComponent,
    ModalityRateListComponent,
    DefaultRateListComponent
  ],
  templateUrl: './rate-management.component.html',
  styleUrls: ['./rate-management.component.scss']
})
export class RateManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private rateService = inject(RateManagementService);
  private snackBar = inject(MatSnackBar);

  // State
  /** Índice del tab actualmente seleccionado (0: Docente, 1: Modalidad, 2: Defecto) */
  selectedTabIndex: number = 0;

  /** Lista de todos los tipos de actividad disponibles */
  activityTypes: AttendanceActivityType[] = [];

  /** Estado de carga de los tipos de actividad */
  isLoadingActivityTypes: boolean = false;

  // Tab information
  tabs = [
    {
      label: 'Tarifas por Docente',
      icon: 'person',
      description: 'Tarifas específicas para cada docente',
      color: 'primary'
    },
    {
      label: 'Tarifas por Modalidad',
      icon: 'school',
      description: 'Tarifas según modalidad educativa (Instituto/Escuela Superior)',
      color: 'accent'
    },
    {
      label: 'Tarifas por Defecto',
      icon: 'settings',
      description: 'Tarifas base para todos los tipos de actividad',
      color: 'warn'
    }
  ];

  ngOnInit(): void {
    this.loadActivityTypes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadActivityTypes(): void {
    this.isLoadingActivityTypes = true;

    this.rateService.getAllActivityTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (types) => {
          this.activityTypes = types;
          this.isLoadingActivityTypes = false;
        },
        error: (error) => {
          console.error('Error loading activity types:', error);
          this.snackBar.open(
            'Error al cargar tipos de actividad',
            'Cerrar',
            { duration: 3000 }
          );
          this.isLoadingActivityTypes = false;
        }
      });
  }

  /**
   * Maneja el cambio de tab
   * @param index Índice del nuevo tab seleccionado
   */
  onTabChange(index: number): void {
    this.selectedTabIndex = index;
  }

  getTabInfo(): any {
    return this.tabs[this.selectedTabIndex];
  }
}
