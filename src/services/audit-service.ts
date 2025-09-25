export type TelemetryEvent = 
  | 'COMPOSER_AUTOSAVE'
  | 'TEMPLATE_SAVED'
  | 'TEMPLATE_APPLIED'
  | 'PREFS_APPLIED'
  | 'CAL_DND_BLOCKED_PAST'
  | 'CAL_DND_MOVED'
  | 'COMPOSER_DISCARD'
  | 'KEYBOARD_SHORTCUT_USED'
  | 'DAY_FOCUS_OPENED'
  | 'DEFAULT_DURATION_APPLIED'
  | 'passwordReset.requested'
  | 'passwordReset.started'
  | 'passwordReset.completed'
  | 'passwordReset.userChanged';

export interface TelemetryData {
  event: TelemetryEvent;
  userId: string;
  timestamp: string;
  metadata?: Record<string, any>;
  source?: string;
  sessionId?: string;
}

export class AuditService {
  private static sessionId: string = Math.random().toString(36).substr(2, 9);

  static track(
    event: TelemetryEvent, 
    userId: string, 
    metadata?: Record<string, any>,
    source?: string
  ): void {
    try {
      const telemetryData: TelemetryData = {
        event,
        userId,
        timestamp: new Date().toISOString(),
        metadata,
        source,
        sessionId: this.sessionId
      };

      // Store in localStorage for development
      const key = `telemetry_${this.sessionId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(telemetryData);
      
      // Keep only last 100 events
      if (existing.length > 100) {
        existing.splice(0, existing.length - 100);
      }
      
      localStorage.setItem(key, JSON.stringify(existing));

      // Development logging
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Telemetry:', telemetryData);
      }

    } catch (error) {
      console.error('Failed to track telemetry event:', error);
    }
  }

  // Convenience methods for common events
  static trackComposerAutosave(userId: string, metadata: { hasContent: boolean; fieldCount: number }) {
    this.track('COMPOSER_AUTOSAVE', userId, metadata, 'composer');
  }

  static trackTemplateSaved(userId: string, metadata: { templateName: string; postType: string }) {
    this.track('TEMPLATE_SAVED', userId, metadata, 'template-manager');
  }

  static trackTemplateApplied(userId: string, metadata: { templateId: string; templateName: string }) {
    this.track('TEMPLATE_APPLIED', userId, metadata, 'template-manager');
  }

  static trackPrefsApplied(userId: string, metadata: { postType: string; classId: string; source: string }) {
    this.track('PREFS_APPLIED', userId, metadata, 'preferences');
  }

  static trackDndBlocked(userId: string, metadata: { postType: string; targetDate: string; reason: string }) {
    this.track('CAL_DND_BLOCKED_PAST', userId, metadata, 'calendar-dnd');
  }

  static trackDndMoved(userId: string, metadata: { postType: string; fromDate: string; toDate: string; isPast: boolean }) {
    this.track('CAL_DND_MOVED', userId, metadata, 'calendar-dnd');
  }

  static trackComposerDiscard(userId: string, metadata: { hasUnsavedChanges: boolean; draftPresent: boolean }) {
    this.track('COMPOSER_DISCARD', userId, metadata, 'composer');
  }

  static trackKeyboardShortcut(userId: string, metadata: { key: string; action: string; context: string }) {
    this.track('KEYBOARD_SHORTCUT_USED', userId, metadata, 'keyboard');
  }

  static trackDayFocusOpened(userId: string, metadata: { date: string; source: string; hasItems: boolean }) {
    this.track('DAY_FOCUS_OPENED', userId, metadata, 'day-focus');
  }

  static trackDefaultDurationApplied(userId: string, metadata: { duration: number; eventType: string }) {
    this.track('DEFAULT_DURATION_APPLIED', userId, metadata, 'event-defaults');
  }
}