// src/app/features/payroll-management/components/payroll-period-list/payroll-period-list.component.ts

import { Component, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

// Services
import { PayrollPeriodService } from '../../services/payroll-period.service';

// Models
import { PayrollPeriod, PERIOD_TYPE_NAMES } from '../../models/payroll.models';

// Components
import { PayrollPeriodFormDialogComponent } from '../payroll-period-form-dialog/payroll-period-form-dialog.component';

@Component({
  selector: 'app-payroll-period-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './payroll-period-list.component.html',
  styleUrls: ['./payroll-period-list.component.scss']
})
export class PayrollPeriodListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private router = inject(Router);
  private payrollPeriodService = inject(PayrollPeriodService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Table
  displayedColumns: string[] = [
    'name',
    'periodType',
    'dateRange',
    'duration',
    'status',
    'calculatedAt',
    'actions'
  ];
  dataSource = new MatTableDataSource<PayrollPeriod>();

  // State
  isLoading = false;
  periods: PayrollPeriod[] = [];
  selectedYear = new Date().getFullYear();
  availableYears: number[] = [];

  // Constants
  readonly periodTypeNames = PERIOD_TYPE_NAMES;

  ngOnInit(): void {
    this.loadPeriods();
    this.generateAvailableYears();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadPeriods(): void {
    this.isLoading = true;

    this.payrollPeriodService.getAllPeriods()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (periods) => {
          this.periods = periods.sort((a, b) =>
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          );
          this.dataSource.data = this.periods;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading periods:', error);
          this.snackBar.open('Error al cargar períodos', 'Cerrar', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  filterByYear(year: number): void {
    this.selectedYear = year;
    this.isLoading = true;

    this.payrollPeriodService.getPeriodsByYear(year)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (periods) => {
          this.periods = periods;
          this.dataSource.data = periods;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error filtering periods:', error);
          this.snackBar.open('Error al filtrar períodos', 'Cerrar', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(PayrollPeriodFormDialogComponent, {
      width: '600px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.loadPeriods();
          this.snackBar.open('Período creado exitosamente', 'Cerrar', { duration: 3000 });
        }
      });
  }

  openEditDialog(period: PayrollPeriod): void {
    if (period.isCalculated) {
      this.snackBar.open(
        'No se puede editar un período ya calculado',
        'Cerrar',
        { duration: 3000 }
      );
      return;
    }

    const dialogRef = this.dialog.open(PayrollPeriodFormDialogComponent, {
      width: '600px',
      data: { mode: 'edit', period }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.loadPeriods();
          this.snackBar.open('Período actualizado exitosamente', 'Cerrar', { duration: 3000 });
        }
      });
  }

  deletePeriod(period: PayrollPeriod): void {
    if (period.isCalculated) {
      this.snackBar.open(
        'No se puede eliminar un período ya calculado',
        'Cerrar',
        { duration: 3000 }
      );
      return;
    }

    if (confirm(`¿Está seguro de eliminar el período "${period.name}"?`)) {
      this.payrollPeriodService.deletePeriod(period.uuid)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadPeriods();
            this.snackBar.open('Período eliminado exitosamente', 'Cerrar', { duration: 3000 });
          },
          error: (error) => {
            console.error('Error deleting period:', error);
            this.snackBar.open('Error al eliminar período', 'Cerrar', { duration: 3000 });
          }
        });
    }
  }

  closePeriod(period: PayrollPeriod): void {
    if (period.isCalculated) {
      this.snackBar.open(
        'Este período ya está cerrado',
        'Cerrar',
        { duration: 3000 }
      );
      return;
    }

    if (confirm(`¿Está seguro de cerrar el período "${period.name}"? Esta acción no se puede deshacer.`)) {
      this.payrollPeriodService.closePeriod(period.uuid)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadPeriods();
            this.snackBar.open('Período cerrado exitosamente', 'Cerrar', { duration: 3000 });
          },
          error: (error) => {
            console.error('Error closing period:', error);
            this.snackBar.open('Error al cerrar período', 'Cerrar', { duration: 3000 });
          }
        });
    }
  }

  viewPeriodDetails(period: PayrollPeriod): void {
    this.router.navigate(['/dashboard/nomina/calculation'], {
      queryParams: { periodUuid: period.uuid }
    });
  }

  private generateAvailableYears(): void {
    const currentYear = new Date().getFullYear();
    this.availableYears = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      this.availableYears.push(i);
    }
  }

  formatDateRange(period: PayrollPeriod): string {
    return this.payrollPeriodService.formatPeriodRange(period);
  }

  getPeriodDuration(period: PayrollPeriod): string {
    const days = this.payrollPeriodService.getPeriodDuration(period);
    return `${days} días`;
  }

  getStatusColor(period: PayrollPeriod): string {
    return period.isCalculated ? 'primary' : 'accent';
  }

  getStatusText(period: PayrollPeriod): string {
    return period.isCalculated ? 'Calculado' : 'Activo';
  }

  getStatusIcon(period: PayrollPeriod): string {
    return period.isCalculated ? 'check_circle' : 'pending';
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  getPeriodTypeName(period: PayrollPeriod): string {
    return this.periodTypeNames[period.periodType as keyof typeof this.periodTypeNames] || period.periodType;
  }
}
