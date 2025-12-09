// src/app/features/payroll-management/components/rate-management/modality-rate-form-dialog/modality-rate-form-dialog.component.ts

import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, Observable } from 'rxjs';

// Angular Material
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Services
import { RateManagementService } from '../../../services/rate-management.service';
import { ModalidadService } from '../../../../modalities/services/modalidad.service';

// Models
import { ModalityRate, ModalityRateRequest } from '../../../models/payroll.models';
import { EducationalModalityResponse } from '../../../../modalities/models/modalidad.model';

export interface ModalityRateFormDialogData {
  mode: 'create' | 'edit' | 'new-version';
  rate?: ModalityRate;
}

@Component({
  selector: 'app-modality-rate-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './modality-rate-form-dialog.component.html',
  styleUrls: ['./modality-rate-form-dialog.component.scss']
})
export class ModalityRateFormDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  form!: FormGroup;
  loading = false;
  modalities: EducationalModalityResponse[] = [];

  minDate = new Date(2020, 0, 1);
  maxDate = new Date(2030, 11, 31);

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ModalityRateFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ModalityRateFormDialogData,
    private rateService: RateManagementService,
    private modalidadService: ModalidadService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadModalities();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    const isEdit = this.data.mode === 'edit';
    const isNewVersion = this.data.mode === 'new-version';
    const rate = this.data.rate;

    this.form = this.fb.group({
      modalityUuid: [
        { value: rate?.modality.uuid || '', disabled: isEdit || isNewVersion },
        Validators.required
      ],
      ratePerHour: [
        rate?.ratePerHour || null,
        [Validators.required, Validators.min(0.01)]
      ],
      effectiveFrom: [
        rate?.effectiveFrom ? new Date(rate.effectiveFrom) : new Date(),
        Validators.required
      ],
      effectiveTo: [
        rate?.effectiveTo ? new Date(rate.effectiveTo) : null
      ]
    }, { validators: this.dateRangeValidator });

    // Si es nueva versión, establecer la fecha desde hoy
    if (isNewVersion) {
      this.form.patchValue({
        effectiveFrom: new Date()
      });
    }
  }

  private loadModalities(): void {
    this.loading = true;

    this.modalidadService.getAllModalidades()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.modalities = response.data || [];
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading modalities:', error);
          this.loading = false;
        }
      });
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
    switch (this.data.mode) {
      case 'create':
        return 'Nueva Tarifa por Modalidad';
      case 'edit':
        return 'Editar Tarifa por Modalidad';
      case 'new-version':
        return 'Nueva Versión de Tarifa';
      default:
        return 'Tarifa por Modalidad';
    }
  }

  getSubmitButtonText(): string {
    switch (this.data.mode) {
      case 'create':
        return 'Crear Tarifa';
      case 'edit':
        return 'Actualizar Tarifa';
      case 'new-version':
        return 'Crear Nueva Versión';
      default:
        return 'Guardar';
    }
  }

  getModalityIcon(modality: EducationalModalityResponse): string {
    if (modality.name.toLowerCase().includes('instituto') || modality.name.includes('ILP')) {
      return 'school';
    } else if (modality.name.toLowerCase().includes('escuela') || modality.name.includes('ELP')) {
      return 'account_balance';
    }
    return 'business';
  }

  getModalityColor(modality: EducationalModalityResponse): string {
    if (modality.name.toLowerCase().includes('instituto') || modality.name.includes('ILP')) {
      return 'primary';
    } else if (modality.name.toLowerCase().includes('escuela') || modality.name.includes('ELP')) {
      return 'accent';
    }
    return 'warn';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const formValue = this.form.getRawValue();
    const request: ModalityRateRequest = {
      modalityUuid: formValue.modalityUuid,
      activityTypeUuid: '', // Se establecerá en el servicio para REGULAR_CLASS
      ratePerHour: formValue.ratePerHour,
      effectiveFrom: this.formatDate(formValue.effectiveFrom),
      effectiveTo: formValue.effectiveTo ? this.formatDate(formValue.effectiveTo) : undefined
    };

    let operation$: Observable<ModalityRate>;

    switch (this.data.mode) {
      case 'create':
        operation$ = this.rateService.createModalityRate(request);
        break;
      case 'edit':
        operation$ = this.rateService.updateModalityRate(this.data.rate!.uuid, request);
        break;
      case 'new-version':
        operation$ = this.rateService.createNewModalityRateVersion(
          formValue.modalityUuid,
          formValue.ratePerHour,
          this.formatDate(formValue.effectiveFrom)
        );
        break;
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
  get modalityUuid() {
    return this.form.get('modalityUuid');
  }

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
