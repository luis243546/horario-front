// src/app/features/payroll-management/components/rate-management/modality-rate-list/modality-rate-list.component.ts

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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';

// Services
import { RateManagementService } from '../../../services/rate-management.service';
import { ModalidadService } from '../../../../modalities/services/modalidad.service';

// Models
import { ModalityRate } from '../../../models/payroll.models';
import { EducationalModalityResponse } from '../../../../modalities/models/modalidad.model';

// Dialogs
import { ModalityRateFormDialogComponent } from '../modality-rate-form-dialog/modality-rate-form-dialog.component';

@Component({
  selector: 'app-modality-rate-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDividerModule
  ],
  templateUrl: './modality-rate-list.component.html',
  styleUrls: ['./modality-rate-list.component.scss']
})
export class ModalityRateListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  displayedColumns: string[] = [
    'modality',
    'amountPerHour',
    'validFrom',
    'validUntil',
    'status',
    'actions'
  ];

  dataSource = new MatTableDataSource<ModalityRate>([]);
  rates: ModalityRate[] = [];
  modalities: EducationalModalityResponse[] = [];

  loading = false;
  searchTerm = '';
  selectedModality = 'all';
  showActiveOnly = true;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private rateService: RateManagementService,
    private modalidadService: ModalidadService,
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
      rates: this.rateService.getAllModalityRates(),
      modalities: this.modalidadService.getAllModalidades()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.rates = response.rates;
          this.modalities = response.modalities.data || [];
          this.applyFilters();
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

  applyFilters(): void {
    let filteredRates = [...this.rates];

    // Filter by modality
    if (this.selectedModality !== 'all') {
      filteredRates = filteredRates.filter(
        rate => rate.modality.uuid === this.selectedModality
      );
    }

    // Filter by active status
    if (this.showActiveOnly) {
      const today = new Date().toISOString().split('T')[0];
      filteredRates = filteredRates.filter(
        rate => this.rateService.isRateActiveOnDate(rate, today)
      );
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filteredRates = filteredRates.filter(rate =>
        rate.modality.name.toLowerCase().includes(term)
      );
    }

    this.dataSource.data = filteredRates;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onModalityChange(): void {
    this.applyFilters();
  }

  toggleActiveFilter(): void {
    this.showActiveOnly = !this.showActiveOnly;
    this.applyFilters();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(ModalityRateFormDialogComponent, {
      width: '600px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.loadData();
          this.snackBar.open('Tarifa creada exitosamente', 'Cerrar', { duration: 3000 });
        }
      });
  }

  openEditDialog(rate: ModalityRate): void {
    if (!this.canEdit(rate)) {
      this.snackBar.open('No se puede editar una tarifa vencida', 'Cerrar', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(ModalityRateFormDialogComponent, {
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

  createNewVersion(rate: ModalityRate): void {
    const dialogRef = this.dialog.open(ModalityRateFormDialogComponent, {
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

  closeRate(rate: ModalityRate): void {
    const today = new Date().toISOString().split('T')[0];
    const formattedDate = new Date(today).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (confirm(`¿Cerrar esta tarifa hoy (${formattedDate})? La tarifa dejará de estar vigente.`)) {
      this.rateService.closeModalityRate(rate.uuid)
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

  deleteRate(rate: ModalityRate): void {
    if (!this.canDelete(rate)) {
      this.snackBar.open(
        'No se puede eliminar una tarifa que ya está en uso',
        'Cerrar',
        { duration: 3000 }
      );
      return;
    }

    if (confirm(`¿Eliminar la tarifa de ${rate.modality.name}?`)) {
      this.rateService.deleteModalityRate(rate.uuid)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadData();
            this.snackBar.open('Tarifa eliminada exitosamente', 'Cerrar', { duration: 3000 });
          },
          error: (error) => {
            console.error('Error deleting rate:', error);
            this.snackBar.open('Error al eliminar tarifa', 'Cerrar', { duration: 3000 });
          }
        });
    }
  }

  canEdit(rate: ModalityRate): boolean {
    const today = new Date().toISOString().split('T')[0];
    return this.rateService.isRateActiveOnDate(rate, today);
  }

  canDelete(rate: ModalityRate): boolean {
    // Solo se puede eliminar si aún no ha iniciado su vigencia
    const today = new Date().toISOString().split('T')[0];
    return rate.effectiveFrom > today;
  }

  isRateActive(rate: ModalityRate): boolean {
    const today = new Date().toISOString().split('T')[0];
    return this.rateService.isRateActiveOnDate(rate, today);
  }

  getStatusClass(rate: ModalityRate): string {
    return this.isRateActive(rate) ? 'status-active' : 'status-expired';
  }

  getStatusLabel(rate: ModalityRate): string {
    return this.isRateActive(rate) ? 'Vigente' : 'Vencida';
  }

  getModalityIcon(modalityName: string): string {
    // ILP (Instituto) = 3 años, ELP (Escuela) = 5 años
    if (modalityName.toLowerCase().includes('instituto') || modalityName.includes('ILP')) {
      return 'school';
    } else if (modalityName.toLowerCase().includes('escuela') || modalityName.includes('ELP')) {
      return 'account_balance';
    }
    return 'business';
  }

  getModalityColor(modalityName: string): string {
    if (modalityName.toLowerCase().includes('instituto') || modalityName.includes('ILP')) {
      return 'primary';
    } else if (modalityName.toLowerCase().includes('escuela') || modalityName.includes('ELP')) {
      return 'accent';
    }
    return 'warn';
  }
}
