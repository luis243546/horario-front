// src/app/features/payroll-management/components/rate-management/default-rate-form-dialog/default-rate-form-dialog.component.ts

import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, Observable } from 'rxjs';

// Angular Material
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Services
import { RateManagementService } from '../../../services/rate-management.service';

// Models
import { DefaultRate, DefaultRateRequest } from '../../../models/payroll.models';

export interface DefaultRateFormDialogData {
  mode: 'edit' | 'new-version';
  rate: DefaultRate;
}

@Component({
  selector: 'app-default-rate-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './default-rate-form-dialog.component.html',
  styleUrls: ['./default-rate-form-dialog.component.scss']
})
export class DefaultRateFormDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  form!: FormGroup;
  loading = false;

  minDate = new Date(2020, 0, 1);
  maxDate = new Date(2030, 11, 31);

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DefaultRateFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DefaultRateFormDialogData,
    private rateService: RateManagementService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    const isNewVersion = this.data.mode === 'new-version';
    const rate = this.data.rate;

    this.form = this.fb.group({
      ratePerHour: [
        rate.ratePerHour,
        [Validators.required, Validators.min(0.01)]
      ],
      effectiveFrom: [
        rate.effectiveFrom ? new Date(rate.effectiveFrom) : new Date(),
        Validators.required
      ],
      effectiveTo: [
        rate.effectiveTo ? new Date(rate.effectiveTo) : null
      ]
    }, { validators: this.dateRangeValidator });

    // Si es nueva versión, establecer la fecha desde hoy
    if (isNewVersion) {
      this.form.patchValue({
        effectiveFrom: new Date()
      });
    }
  }

  private dateRangeValidator(group: FormGroup): { [key: string]: boolean } | null {
    const from = group.get('effectiveFrom')?.value;
    const to = group.get('effectiveTo')?.value;

    if (from && to && new Date(from) >= new Date(to)) {
      return { invalidDateRange: true };
    }

    return null;
  }

  getTitle(): string {
    const activityTypeName = this.data.rate.activityType.name;
    switch (this.data.mode) {
      case 'edit':
        return `Editar Tarifa: ${activityTypeName}`;
      case 'new-version':
        return `Nueva Versión: ${activityTypeName}`;
      default:
        return 'Tarifa Por Defecto';
    }
  }

  getSubmitButtonText(): string {
    return this.data.mode === 'edit' ? 'Actualizar Tarifa' : 'Crear Nueva Versión';
  }

  getActivityIcon(): string {
    const code = this.data.rate.activityType.code;
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

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const formValue = this.form.value;
    const request: DefaultRateRequest = {
      activityTypeUuid: this.data.rate.activityType.uuid,
      ratePerHour: formValue.ratePerHour,
      effectiveFrom: this.formatDate(formValue.effectiveFrom),
      effectiveTo: formValue.effectiveTo ? this.formatDate(formValue.effectiveTo) : undefined
    };

    let operation$: Observable<DefaultRate>;

    if (this.data.mode === 'edit') {
      operation$ = this.rateService.updateDefaultRate(this.data.rate.uuid, request);
    } else {
      operation$ = this.rateService.createNewDefaultRateVersion(
        this.data.rate.activityType.uuid,
        formValue.ratePerHour,
        this.formatDate(formValue.effectiveFrom)
      );
    }

    operation$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.loading = false;
        this.dialogRef.close(result);
      },
      error: (error) => {
        console.error('Error saving rate:', error);
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private formatDate(date: Date): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Getters para validación en template
  get ratePerHour() {
    return this.form.get('ratePerHour');
  }

  get effectiveFrom() {
    return this.form.get('effectiveFrom');
  }

  get effectiveTo() {
    return this.form.get('effectiveTo');
  }

  get hasDateRangeError(): false | undefined | boolean {
    return this.form.hasError('invalidDateRange') &&
      this.effectiveFrom?.touched &&
      this.effectiveTo?.touched;
  }
}
