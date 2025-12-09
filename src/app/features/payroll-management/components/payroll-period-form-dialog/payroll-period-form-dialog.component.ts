// src/app/features/payroll-management/components/payroll-period-form-dialog/payroll-period-form-dialog.component.ts

import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Services
import { PayrollPeriodService } from '../../services/payroll-period.service';

// Models
import { PayrollPeriod, PayrollPeriodRequest, PeriodType, PERIOD_TYPE_NAMES } from '../../models/payroll.models';

interface DialogData {
  mode: 'create' | 'edit';
  period?: PayrollPeriod;
}

@Component({
  selector: 'app-payroll-period-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './payroll-period-form-dialog.component.html',
  styleUrls: ['./payroll-period-form-dialog.component.scss']
})
export class PayrollPeriodFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private payrollPeriodService = inject(PayrollPeriodService);
  private dialogRef = inject(MatDialogRef<PayrollPeriodFormDialogComponent>);

  periodForm!: FormGroup;
  isSaving = false;

  periodTypes: { value: PeriodType; label: string }[] = [
    { value: 'WEEKLY', label: 'Semanal' },
    { value: 'BIWEEKLY', label: 'Quincenal' },
    { value: 'MONTHLY', label: 'Mensual' },
    { value: 'CUSTOM', label: 'Personalizado' }
  ];

  minDate = new Date(2020, 0, 1);
  maxDate = new Date(2030, 11, 31);

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  ngOnInit(): void {
    this.initForm();

    if (this.data.mode === 'edit' && this.data.period) {
      this.populateForm(this.data.period);
    }
  }

  private initForm(): void {
    this.periodForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      periodType: ['MONTHLY', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      description: ['']
    }, {
      validators: this.dateRangeValidator
    });

    // Auto-generar nombre basado en tipo y fechas
    this.periodForm.valueChanges.subscribe(() => {
      if (this.data.mode === 'create') {
        this.autoGenerateName();
      }
    });
  }

  private populateForm(period: PayrollPeriod): void {
    this.periodForm.patchValue({
      name: period.name,
      periodType: period.periodType,
      startDate: new Date(period.startDate),
      endDate: new Date(period.endDate),
      description: period.description || ''
    });
  }

  private dateRangeValidator(form: FormGroup): { [key: string]: boolean } | null {
    const startDate = form.get('startDate')?.value;
    const endDate = form.get('endDate')?.value;

    if (startDate && endDate && startDate >= endDate) {
      return { invalidDateRange: true };
    }

    return null;
  }

  private autoGenerateName(): void {
    const { periodType, startDate, endDate } = this.periodForm.value;

    if (periodType && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];

      const startMonth = monthNames[start.getMonth()];
      const endMonth = monthNames[end.getMonth()];
      const year = start.getFullYear();

      let generatedName = '';

      switch (periodType) {
        case 'WEEKLY':
          const weekNumber = Math.ceil(start.getDate() / 7);
          generatedName = `Semana ${weekNumber} de ${startMonth} ${year}`;
          break;
        case 'BIWEEKLY':
          const half = start.getDate() <= 15 ? 'Primera' : 'Segunda';
          generatedName = `${half} Quincena de ${startMonth} ${year}`;
          break;
        case 'MONTHLY':
          generatedName = `${startMonth} ${year}`;
          break;
        case 'CUSTOM':
          generatedName = `Período ${startMonth} - ${endMonth} ${year}`;
          break;
      }

      this.periodForm.patchValue({ name: generatedName }, { emitEvent: false });
    }
  }

  onSubmit(): void {
    if (this.periodForm.invalid) {
      Object.keys(this.periodForm.controls).forEach(key => {
        this.periodForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSaving = true;

    const formValue = this.periodForm.value;
    const request: PayrollPeriodRequest = {
      name: formValue.name,
      periodType: formValue.periodType,
      startDate: this.formatDate(formValue.startDate),
      endDate: this.formatDate(formValue.endDate),
      description: formValue.description || undefined
    };

    const operation = this.data.mode === 'create'
      ? this.payrollPeriodService.createPeriod(request)
      : this.payrollPeriodService.updatePeriod(this.data.period!.uuid, request);

    operation.subscribe({
      next: (period) => {
        this.dialogRef.close(period);
      },
      error: (error) => {
        console.error('Error saving period:', error);
        this.isSaving = false;
      }
    });
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getErrorMessage(field: string): string {
    const control = this.periodForm.get(field);
    if (!control || !control.touched) return '';

    if (control.hasError('required')) {
      return 'Este campo es requerido';
    }
    if (control.hasError('minlength')) {
      return `Mínimo ${control.errors?.['minlength'].requiredLength} caracteres`;
    }

    if (field === 'endDate' && this.periodForm.hasError('invalidDateRange')) {
      return 'La fecha final debe ser posterior a la inicial';
    }

    return '';
  }

  get title(): string {
    return this.data.mode === 'create' ? 'Crear Período de Nómina' : 'Editar Período de Nómina';
  }

  get submitButtonText(): string {
    return this.data.mode === 'create' ? 'Crear Período' : 'Guardar Cambios';
  }
}
