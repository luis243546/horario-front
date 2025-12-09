// // src/app/features/payroll-management/components/rate-management/teacher-rate-list/teacher-rate-list.component.ts
//
// import { Component, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { Subject, takeUntil, forkJoin } from 'rxjs';
//
// // Angular Material
// import { MatCardModule } from '@angular/material/card';
// import { MatButtonModule } from '@angular/material/button';
// import { MatIconModule } from '@angular/material/icon';
// import { MatTableModule, MatTableDataSource } from '@angular/material/table';
// import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
// import { MatSortModule, MatSort } from '@angular/material/sort';
// import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
// import { MatTooltipModule } from '@angular/material/tooltip';
// import { MatChipsModule } from '@angular/material/chips';
// import { MatDialog, MatDialogModule } from '@angular/material/dialog';
// import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
// import { MatMenuModule } from '@angular/material/menu';
// import { MatFormFieldModule } from '@angular/material/form-field';
// import { MatInputModule } from '@angular/material/input';
// import { MatSelectModule } from '@angular/material/select';
// import { MatDividerModule } from '@angular/material/divider';
// import { FormsModule } from '@angular/forms';
//
// // Services
// import { RateManagementService } from '../../../services/rate-management.service';
//
// // Models
// import { TeacherRate, AttendanceActivityType } from '../../../models/payroll.models';
//
// // Dialogs
// //import { TeacherRateFormDialogComponent } from '../teacher-rate-form-dialog/teacher-rate-form-dialog.component';
//
// @Component({
//   selector: 'app-teacher-rate-list',
//   standalone: true,
//   imports: [
//     CommonModule,
//     FormsModule,
//     MatCardModule,
//     MatButtonModule,
//     MatIconModule,
//     MatTableModule,
//     MatPaginatorModule,
//     MatSortModule,
//     MatProgressSpinnerModule,
//     MatTooltipModule,
//     MatChipsModule,
//     MatDialogModule,
//     MatSnackBarModule,
//     MatMenuModule,
//     MatFormFieldModule,
//     MatInputModule,
//     MatSelectModule,
//     MatDividerModule
//   ],
//   templateUrl: './teacher-rate-list.component.html',
//   styleUrls: ['./teacher-rate-list.component.scss']
// })
// export class TeacherRateListComponent implements OnInit, OnDestroy {
//   private destroy$ = new Subject<void>();
//   private rateService = inject(RateManagementService);
//   private dialog = inject(MatDialog);
//   private snackBar = inject(MatSnackBar);
//
//   @ViewChild(MatPaginator) paginator!: MatPaginator;
//   @ViewChild(MatSort) sort!: MatSort;
//
//   // Table
//   displayedColumns: string[] = [
//     'teacher',
//     'activityType',
//     'amountPerHour',
//     'validFrom',
//     'validUntil',
//     'status',
//     'actions'
//   ];
//   dataSource = new MatTableDataSource<TeacherRate>();
//
//   // State
//   isLoading = false;
//   rates: TeacherRate[] = [];
//   activityTypes: AttendanceActivityType[] = [];
//
//   // Filters
//   selectedActivityType = 'all';
//   showActiveOnly = true;
//
//   ngOnInit(): void {
//     this.loadData();
//   }
//
//   ngOnDestroy(): void {
//     this.destroy$.next();
//     this.destroy$.complete();
//   }
//
//   ngAfterViewInit(): void {
//     this.dataSource.paginator = this.paginator;
//     this.dataSource.sort = this.sort;
//   }
//
//   private loadData(): void {
//     this.isLoading = true;
//
//     forkJoin({
//       rates: this.rateService.getAllTeacherRates(),
//       activityTypes: this.rateService.getAllActivityTypes()
//     }).pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: ({ rates, activityTypes }) => {
//           this.rates = rates;
//           this.activityTypes = activityTypes;
//           this.applyFilters();
//           this.isLoading = false;
//         },
//         error: (error) => {
//           console.error('Error loading data:', error);
//           this.snackBar.open('Error al cargar tarifas', 'Cerrar', { duration: 3000 });
//           this.isLoading = false;
//         }
//       });
//   }
//
//   applyFilters(): void {
//     let filteredRates = [...this.rates];
//
//     // Filter by activity type
//     if (this.selectedActivityType !== 'all') {
//       filteredRates = filteredRates.filter(
//         rate => rate.activityType.code === this.selectedActivityType
//       );
//     }
//
//     // Filter by active status
//     if (this.showActiveOnly) {
//       const today = new Date().toISOString().split('T')[0];
//       filteredRates = filteredRates.filter(
//         rate => this.rateService.isRateActiveOnDate(rate, today)
//       );
//     }
//
//     this.dataSource.data = filteredRates;
//   }
//
//   // openCreateDialog(): void {
//   //   const dialogRef = this.dialog.open(TeacherRateFormDialogComponent, {
//   //     width: '600px',
//   //     data: { mode: 'create' }
//   //   });
//   //
//   //   dialogRef.afterClosed()
//   //     .pipe(takeUntil(this.destroy$))
//   //     .subscribe(result => {
//   //       if (result) {
//   //         this.loadData();
//   //         this.snackBar.open('Tarifa creada exitosamente', 'Cerrar', { duration: 3000 });
//   //       }
//   //     });
//   // }
//   //
//   // openEditDialog(rate: TeacherRate): void {
//   //   if (!this.canEdit(rate)) {
//   //     this.snackBar.open('No se puede editar una tarifa vencida', 'Cerrar', { duration: 3000 });
//   //     return;
//   //   }
//   //
//   //   const dialogRef = this.dialog.open(TeacherRateFormDialogComponent, {
//   //     width: '600px',
//   //     data: { mode: 'edit', rate }
//   //   });
//   //
//   //   dialogRef.afterClosed()
//   //     .pipe(takeUntil(this.destroy$))
//   //     .subscribe(result => {
//   //       if (result) {
//   //         this.loadData();
//   //         this.snackBar.open('Tarifa actualizada exitosamente', 'Cerrar', { duration: 3000 });
//   //       }
//   //     });
//   // }
//   //
//   // createNewVersion(rate: TeacherRate): void {
//   //   const dialogRef = this.dialog.open(TeacherRateFormDialogComponent, {
//   //     width: '600px',
//   //     data: { mode: 'new-version', rate }
//   //   });
//   //
//   //   dialogRef.afterClosed()
//   //     .pipe(takeUntil(this.destroy$))
//   //     .subscribe(result => {
//   //       if (result) {
//   //         this.loadData();
//   //         this.snackBar.open('Nueva versión creada exitosamente', 'Cerrar', { duration: 3000 });
//   //       }
//   //     });
//   // }
//
//   // closeRate(rate: TeacherRate): void {
//   //   const today = new Date().toISOString().split('T')[0];
//   //
//   //   if (confirm(`¿Cerrar esta tarifa hoy (${today})? La tarifa dejará de estar vigente.`)) {
//   //     this.rateService.closeTeacherRate(rate.uuid, today)
//   //       .pipe(takeUntil(this.destroy$))
//   //       .subscribe({
//   //         next: () => {
//   //           this.loadData();
//   //           this.snackBar.open('Tarifa cerrada exitosamente', 'Cerrar', { duration: 3000 });
//   //         },
//   //         error: (error) => {
//   //           console.error('Error closing rate:', error);
//   //           this.snackBar.open('Error al cerrar tarifa', 'Cerrar', { duration: 3000 });
//   //         }
//   //       });
//   //   }
//   // }
//
//   deleteRate(rate: TeacherRate): void {
//     if (!this.canDelete(rate)) {
//       this.snackBar.open(
//         'No se puede eliminar una tarifa que ya está en uso',
//         'Cerrar',
//         { duration: 3000 }
//       );
//       return;
//     }
//
//     if (confirm(`¿Eliminar la tarifa de ${rate.teacher.fullName} para ${rate.activityType.name}?`)) {
//       this.rateService.deleteTeacherRate(rate.uuid)
//         .pipe(takeUntil(this.destroy$))
//         .subscribe({
//           next: () => {
//             this.loadData();
//             this.snackBar.open('Tarifa eliminada exitosamente', 'Cerrar', { duration: 3000 });
//           },
//           error: (error) => {
//             console.error('Error deleting rate:', error);
//             this.snackBar.open('Error al eliminar tarifa', 'Cerrar', { duration: 3000 });
//           }
//         });
//     }
//   }
//
//   getStatusText(rate: TeacherRate): string {
//     const today = new Date().toISOString().split('T')[0];
//     return this.rateService.isRateActiveOnDate(rate, today) ? 'Vigente' : 'Vencida';
//   }
//
//   getStatusColor(rate: TeacherRate): string {
//     const today = new Date().toISOString().split('T')[0];
//     return this.rateService.isRateActiveOnDate(rate, today) ? 'primary' : 'warn';
//   }
//
//   canEdit(rate: TeacherRate): boolean {
//     const today = new Date().toISOString().split('T')[0];
//     return this.rateService.isRateActiveOnDate(rate, today);
//   }
//
//   canDelete(rate: TeacherRate): boolean {
//     // Solo se puede eliminar si aún no ha iniciado su vigencia
//     const today = new Date().toISOString().split('T')[0];
//     return rate.effectiveFrom > today;
//   }
//
//   applySearch(event: Event): void {
//     const filterValue = (event.target as HTMLInputElement).value;
//     this.dataSource.filter = filterValue.trim().toLowerCase();
//
//     if (this.dataSource.paginator) {
//       this.dataSource.paginator.firstPage();
//     }
//   }
// }


// src/app/features/payroll-management/components/rate-management/teacher-rate-list/teacher-rate-list.component.ts

import { Component, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
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

// Models
import { TeacherRate, AttendanceActivityType } from '../../../models/payroll.models';
import {TeacherRateFormDialogComponent} from '../teacher-rate-form-dialog/teacher-rate-form-dialog.component';

// Dialogs
// TODO: Descomentar cuando se cree el componente
// import { TeacherRateFormDialogComponent } from '../teacher-rate-form-dialog/teacher-rate-form-dialog.component';

@Component({
  selector: 'app-teacher-rate-list',
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
  templateUrl: './teacher-rate-list.component.html',
  styleUrls: ['./teacher-rate-list.component.scss']
})
export class TeacherRateListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private rateService = inject(RateManagementService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Table
  displayedColumns: string[] = [
    'teacher',
    'activityType',
    'amountPerHour',
    'validFrom',
    'validUntil',
    'status',
    'actions'
  ];
  dataSource = new MatTableDataSource<TeacherRate>();

  // State
  isLoading = false;
  rates: TeacherRate[] = [];
  activityTypes: AttendanceActivityType[] = [];

  // Filters
  selectedActivityType = 'all';
  showActiveOnly = true;

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private loadData(): void {
    this.isLoading = true;

    forkJoin({
      rates: this.rateService.getAllTeacherRates(),
      activityTypes: this.rateService.getAllActivityTypes()
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ rates, activityTypes }) => {
          this.rates = rates;
          this.activityTypes = activityTypes;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading data:', error);
          this.snackBar.open('Error al cargar tarifas', 'Cerrar', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  applyFilters(): void {
    let filteredRates = [...this.rates];

    // Filter by activity type
    if (this.selectedActivityType !== 'all') {
      filteredRates = filteredRates.filter(
        rate => rate.activityType.code === this.selectedActivityType
      );
    }

    // Filter by active status
    if (this.showActiveOnly) {
      const today = new Date().toISOString().split('T')[0];
      filteredRates = filteredRates.filter(
        rate => this.rateService.isRateActiveOnDate(rate, today)
      );
    }

    this.dataSource.data = filteredRates;
  }

  openCreateDialog(): void {
    // TODO: Descomentar cuando se cree TeacherRateFormDialogComponent
    this.snackBar.open(
      'Funcionalidad en desarrollo. Dialog pendiente de implementar.',
      'Cerrar',
      { duration: 3000 }
    );


    const dialogRef = this.dialog.open(TeacherRateFormDialogComponent, {
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

  openEditDialog(rate: TeacherRate): void {
    if (!this.canEdit(rate)) {
      this.snackBar.open('No se puede editar una tarifa vencida', 'Cerrar', { duration: 3000 });
      return;
    }

    // TODO: Descomentar cuando se cree TeacherRateFormDialogComponent
    this.snackBar.open(
      'Funcionalidad en desarrollo. Dialog pendiente de implementar.',
      'Cerrar',
      { duration: 3000 }
    );


    const dialogRef = this.dialog.open(TeacherRateFormDialogComponent, {
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

  createNewVersion(rate: TeacherRate): void {
    // TODO: Descomentar cuando se cree TeacherRateFormDialogComponent
    this.snackBar.open(
      'Funcionalidad en desarrollo. Dialog pendiente de implementar.',
      'Cerrar',
      { duration: 3000 }
    );


    const dialogRef = this.dialog.open(TeacherRateFormDialogComponent, {
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

  closeRate(rate: TeacherRate): void {
    const today = new Date().toISOString().split('T')[0];

    if (confirm(`¿Cerrar esta tarifa hoy (${today})? La tarifa dejará de estar vigente.`)) {
      this.rateService.closeTeacherRate(rate.uuid)
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

  deleteRate(rate: TeacherRate): void {
    if (!this.canDelete(rate)) {
      this.snackBar.open(
        'No se puede eliminar una tarifa que ya está en uso',
        'Cerrar',
        { duration: 3000 }
      );
      return;
    }

    if (confirm(`¿Eliminar la tarifa de ${rate.teacher.fullName} para ${rate.activityType.name}?`)) {
      this.rateService.deleteTeacherRate(rate.uuid)
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

  getStatusText(rate: TeacherRate): string {
    const today = new Date().toISOString().split('T')[0];
    return this.rateService.isRateActiveOnDate(rate, today) ? 'Vigente' : 'Vencida';
  }

  getStatusColor(rate: TeacherRate): string {
    const today = new Date().toISOString().split('T')[0];
    return this.rateService.isRateActiveOnDate(rate, today) ? 'primary' : 'warn';
  }

  canEdit(rate: TeacherRate): boolean {
    const today = new Date().toISOString().split('T')[0];
    return this.rateService.isRateActiveOnDate(rate, today);
  }

  canDelete(rate: TeacherRate): boolean {
    // Solo se puede eliminar si aún no ha iniciado su vigencia
    const today = new Date().toISOString().split('T')[0];
    return rate.effectiveFrom > today;
  }

  applySearch(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
}
