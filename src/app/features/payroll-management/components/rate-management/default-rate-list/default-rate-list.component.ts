// src/app/features/payroll-management/components/rate-management/default-rate-list/default-rate-list.component.ts

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, forkJoin } from 'rxjs';

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
import { RateManagementService } from '../../../services/rate-management.service';

// Models
import { DefaultRate, AttendanceActivityType } from '../../../models/payroll.models';

// Dialogs
import { DefaultRateFormDialogComponent } from '../default-rate-form-dialog/default-rate-form-dialog.component';

@Component({
  selector: 'app-default-rate-list',
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
  templateUrl: './default-rate-list.component.html',
  styleUrls: ['./default-rate-list.component.scss']
})
export class DefaultRateListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  displayedColumns: string[] = [
    'activityType',
    'amountPerHour',
    'validFrom',
    'validUntil',
    'status',
    'actions'
  ];

  dataSource = new MatTableDataSource<DefaultRate>([]);
  rates: DefaultRate[] = [];
  activityTypes: AttendanceActivityType[] = [];

  loading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private rateService: RateManagementService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.loading = true;

    forkJoin({
      rates: this.rateService.getAllDefaultRates(),
      activityTypes: this.rateService.getAllActivityTypes()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.rates = response.rates;
          this.activityTypes = response.activityTypes;
          this.dataSource.data = this.rates;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading data:', error);
          this.snackBar.open('Error al cargar las tarifas', 'Cerrar', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  openEditDialog(rate: DefaultRate): void {
    if (!this.canEdit(rate)) {
      this.snackBar.open('No se puede editar una tarifa vencida', 'Cerrar', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(DefaultRateFormDialogComponent, {
      width: '600px',
      data: { mode: 'edit', rate }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.loadData();
          this.snackBar.open('Tarifa actualizada exitosamente', 'Cerrar', { duration: 3000 });
        }
      });
  }

  createNewVersion(rate: DefaultRate): void {
    const dialogRef = this.dialog.open(DefaultRateFormDialogComponent, {
      width: '600px',
      data: { mode: 'new-version', rate }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.loadData();
          this.snackBar.open('Nueva versión creada exitosamente', 'Cerrar', { duration: 3000 });
        }
      });
  }

  closeRate(rate: DefaultRate): void {
    const today = new Date().toISOString().split('T')[0];
    const formattedDate = new Date(today).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (confirm(`¿Cerrar esta tarifa hoy (${formattedDate})? La tarifa dejará de estar vigente.`)) {
      this.rateService.closeDefaultRate(rate.uuid)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadData();
            this.snackBar.open('Tarifa cerrada exitosamente', 'Cerrar', { duration: 3000 });
          },
          error: (error) => {
            console.error('Error closing rate:', error);
            this.snackBar.open('Error al cerrar tarifa', 'Cerrar', { duration: 3000 });
          }
        });
    }
  }

  canEdit(rate: DefaultRate): boolean {
    const today = new Date().toISOString().split('T')[0];
    return this.rateService.isRateActiveOnDate(rate, today);
  }

  isRateActive(rate: DefaultRate): boolean {
    const today = new Date().toISOString().split('T')[0];
    return this.rateService.isRateActiveOnDate(rate, today);
  }

  getStatusClass(rate: DefaultRate): string {
    return this.isRateActive(rate) ? 'status-active' : 'status-expired';
  }

  getStatusLabel(rate: DefaultRate): string {
    return this.isRateActive(rate) ? 'Vigente' : 'Vencida';
  }

  getActivityIcon(code: string): string {
    const icons: Record<string, string> = {
      'REGULAR_CLASS': 'school',
      'MAKEUP_CLASS': 'history_edu',
      'WORKSHOP': 'construction',
      'EXAM_SUPERVISION': 'assignment',
      'SUBSTITUTE_EXAM': 'assignment',
      'EXTRA_HOURS': 'more_time',
      'OTHER': 'more_horiz'
    };
    return icons[code] || 'category';
  }

  getActivityColor(code: string): string {
    const colors: Record<string, string> = {
      'REGULAR_CLASS': 'primary',
      'MAKEUP_CLASS': 'accent',
      'WORKSHOP': 'warn',
      'EXAM_SUPERVISION': 'warn',
      'SUBSTITUTE_EXAM': 'warn',
      'EXTRA_HOURS': 'accent',
      'OTHER': ''
    };
    return colors[code] || '';
  }
}
