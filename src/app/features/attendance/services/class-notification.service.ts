// src/app/features/attendance/services/class-notification.service.ts
import { Injectable, inject } from '@angular/core';
import { interval, Subject, takeUntil, switchMap } from 'rxjs';
import { ClassSessionService } from '../../schedule-assignment/services/class-session.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { ClassSessionResponse } from '../../schedule-assignment/models/class-session.model';

export interface ClassNotification {
  classSession: ClassSessionResponse;
  minutesUntilStart: number;
  message: string;
  type: 'warning' | 'info' | 'urgent';
}

@Injectable({
  providedIn: 'root'
})
export class ClassNotificationService {
  private classSessionService = inject(ClassSessionService);
  private notificationService = inject(NotificationService);

  private notificationsSubject = new Subject<ClassNotification>();
  public notifications$ = this.notificationsSubject.asObservable();

  private destroy$ = new Subject<void>();
  private teacherUuid: string = '';

  // Configuración
  private readonly CHECK_INTERVAL = 60000; // 1 minuto
  private readonly NOTIFY_MINUTES_BEFORE = [15, 10, 5];
  private notifiedSessions = new Set<string>();

  startMonitoring(teacherUuid: string): void {
    this.teacherUuid = teacherUuid;
    this.notifiedSessions.clear();

    console.log('🔔 Iniciando monitoreo de clases para:', teacherUuid);

    this.checkUpcomingClasses();

    interval(this.CHECK_INTERVAL)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.classSessionService.getSessionsByTeacher(this.teacherUuid))
      )
      .subscribe({
        next: (response) => {
          const sessions = Array.isArray(response.data) ? response.data : [response.data];
          this.checkUpcomingClasses(sessions);
        },
        error: (error) => console.error('❌ Error monitore ando clases:', error)
      });

    interval(300000).pipe(takeUntil(this.destroy$))
      .subscribe(() => this.notificationService.clearOldClassNotifications());
  }

  private checkUpcomingClasses(sessions?: ClassSessionResponse[]): void {
    if (!sessions) {
      this.classSessionService.getSessionsByTeacher(this.teacherUuid).subscribe({
        next: (response) => {
          const allSessions = Array.isArray(response.data) ? response.data : [response.data];
          this.processUpcomingSessions(allSessions);
        }
      });
    } else {
      this.processUpcomingSessions(sessions);
    }
  }

  private processUpcomingSessions(sessions: ClassSessionResponse[]): void {
    const now = new Date();
    const currentDay = this.getDayOfWeekName(now);
    const currentTime = now.toTimeString().split(' ')[0];

    const todaySessions = sessions.filter(s => s.dayOfWeek === currentDay);

    todaySessions.forEach(session => {
      if (!session.teachingHours || session.teachingHours.length === 0) return;

      const firstHour = session.teachingHours[0];
      const scheduledStart = firstHour.startTime;
      const minutesUntilStart = this.calculateMinutesUntil(currentTime, scheduledStart);

      if (this.shouldNotify(session.uuid, minutesUntilStart)) {
        this.sendNotification(session, minutesUntilStart);
      }
    });
  }

  private shouldNotify(sessionUuid: string, minutesUntilStart: number): boolean {
    if (minutesUntilStart < 0 || minutesUntilStart > 15) return false;

    const notificationKey = `${sessionUuid}-${Math.floor(minutesUntilStart / 5)}`;
    if (this.notifiedSessions.has(notificationKey)) return false;

    const shouldNotify = this.NOTIFY_MINUTES_BEFORE.some(minutes => {
      return Math.abs(minutesUntilStart - minutes) <= 1;
    });

    if (shouldNotify) {
      this.notifiedSessions.add(notificationKey);
      return true;
    }

    return false;
  }

  private sendNotification(session: ClassSessionResponse, minutesUntilStart: number): void {
    const courseName = session.course?.name || 'Clase';
    const groupName = session.studentGroup?.name || '';
    const spaceName = session.learningSpace?.name || '';
    const startTime = session.teachingHours[0]?.startTime?.substring(0, 5) || '';

    let severity: 'high' | 'medium' | 'low' = 'low';

    if (minutesUntilStart <= 5) {
      severity = 'high';
    } else if (minutesUntilStart <= 10) {
      severity = 'medium';
    }

    const icon = minutesUntilStart <= 5 ? '🚨' : minutesUntilStart <= 10 ? '⚠️' : '🔔';

    // ✅ AGREGAR A LA CAMPANITA
    this.notificationService.addClassNotification({
      id: `class-${session.uuid}-${Date.now()}`,
      type: 'CLASS_REMINDER',
      severity: severity,
      title: `${icon} Clase en ${minutesUntilStart} minutos`,
      message: `${courseName} - ${groupName}`,
      groupUuid: session.studentGroup.uuid,
      groupName: groupName,
      cycleNumber: 0,
      careerName: spaceName,
      data: {
        courseName: courseName,
        spaceName: spaceName,
        startTime: startTime,
        minutesUntilStart: minutesUntilStart
      },
      timestamp: new Date(),
      actionUrl: '/dashboard/asistencia/mi-asistencia'
    });

    console.log(`🔔 ${courseName} en ${minutesUntilStart} min`);
  }

  private calculateMinutesUntil(currentTime: string, targetTime: string): number {
    const [currentH, currentM] = currentTime.split(':').map(Number);
    const [targetH, targetM] = targetTime.split(':').map(Number);
    return (targetH * 60 + targetM) - (currentH * 60 + currentM);
  }

  private getDayOfWeekName(date: Date): string {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getDay()];
  }

  stopMonitoring(): void {
    this.destroy$.next();
    this.notifiedSessions.clear();
    console.log('🔔 Monitoreo detenido');
  }
}
