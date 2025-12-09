// src/app/features/payroll-management/components/rate-management/teacher-rate-form-dialog/teacher-rate-form-dialog.component.ts

import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, Observable, map, startWith } from 'rxjs';

// Angular Material
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Services
import { RateManagementService } from '../../../services/rate-management.service';
import { DocenteService } from '../../../../teachers/services/docente.service';

// Models
import { TeacherRate, TeacherRateRequest, AttendanceActivityType } from '../../../models/payroll.models';
import { TeacherResponse } from '../../../../schedule-assignment/models/class-session.model';

export interface TeacherRateFormDialogData {
  mode: 'create' | 'edit' | 'new-version';
  rate?: TeacherRate;
}

@Component({
  selector: 'app-teacher-rate-form-dialog',
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
    MatAutocompleteModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './teacher-rate-form-dialog.component.html',
  styleUrls: ['./teacher-rate-form-dialog.component.scss']
})
export class TeacherRateFormDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  form!: FormGroup;
  loading = false;
  teachers: TeacherResponse[] = [];
  activityTypes: AttendanceActivityType[] = [];
  filteredTeachers$!: Observable<TeacherResponse[]>;

  minDate = new Date(2020, 0, 1);
  maxDate = new Date(2030, 11, 31);

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TeacherRateFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TeacherRateFormDialogData,
    private rateService: RateManagementService,
    private docenteService: DocenteService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadData();
    this.setupTeacherAutocomplete();
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
      teacherUuid: [
        { value: rate?.teacher.uuid || '', disabled: isEdit || isNewVersion },
        Validators.required
      ],
      teacherSearch: [''], // Para el autocomplete
      activityTypeUuid: [
        { value: rate?.activityType.uuid || '', disabled: isEdit || isNewVersion },
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

    // Si es editar, prellenar el campo de búsqueda con el nombre del docente
    if ((isEdit || isNewVersion) && rate) {
      this.form.patchValue({
        teacherSearch: rate.teacher.fullName
      });
    }

    // Si es nueva versión, establecer la fecha desde hoy
    if (isNewVersion) {
      this.form.patchValue({
        effectiveFrom: new Date()
      });
    }
  }

  private loadData(): void {
    this.loading = true;

    // Cargar docentes y tipos de actividad
    this.docenteService.getAllTeachers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.teachers = response.data || [];
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading teachers:', error);
          this.loading = false;
        }
      });

    this.rateService.getAllActivityTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (types) => {
          this.activityTypes = types;
        },
        error: (error) => {
          console.error('Error loading activity types:', error);
        }
      });
  }

  private setupTeacherAutocomplete(): void {
    this.filteredTeachers$ = this.form.get('teacherSearch')!.valueChanges.pipe(
      startWith(''),
      map(value => this.filterTeachers(value || ''))
    );
  }

  private filterTeachers(value: string): TeacherResponse[] {
    const filterValue = value.toLowerCase();
    return this.teachers.filter(teacher =>
      teacher.fullName.toLowerCase().includes(filterValue) ||
      (teacher.email && teacher.email.toLowerCase().includes(filterValue))
    );
  }

  onTeacherSelected(teacher: TeacherResponse): void {
    this.form.patchValue({
      teacherUuid: teacher.uuid,
      teacherSearch: teacher.fullName
    });
  }

  displayTeacher(teacher: TeacherResponse): string {
    return teacher ? teacher.fullName : '';
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
        return 'Nueva Tarifa de Docente';
      case 'edit':
        return 'Editar Tarifa de Docente';
      case 'new-version':
        return 'Nueva Versión de Tarifa';
      default:
        return 'Tarifa de Docente';
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

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const formValue = this.form.getRawValue();
    const request: TeacherRateRequest = {
      teacherUuid: formValue.teacherUuid,
      activityTypeUuid: formValue.activityTypeUuid,
      ratePerHour: formValue.ratePerHour,
      effectiveFrom: this.formatDate(formValue.effectiveFrom),
      effectiveTo: formValue.effectiveTo ? this.formatDate(formValue.effectiveTo) : undefined
    };

    let operation$: Observable<TeacherRate>;

    switch (this.data.mode) {
      case 'create':
        operation$ = this.rateService.createTeacherRate(request);
        break;
      case 'edit':
        operation$ = this.rateService.updateTeacherRate(this.data.rate!.uuid, request);
        break;
      case 'new-version':
        operation$ = this.rateService.createNewTeacherRateVersion(
          formValue.teacherUuid,
          formValue.activityTypeUuid,
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
        // El error se mostrará en el componente padre
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
  get teacherUuid() {
    return this.form.get('teacherUuid');
  }

  get activityTypeUuid() {
    return this.form.get('activityTypeUuid');
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
}
