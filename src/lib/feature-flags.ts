// Feature flags for blocking backend-dependent features
export const FEATURE_FLAGS = {
  NOTIF_EMAIL_ENABLED: false,
  NOTIF_PUSH_ENABLED: false,
  THEME_SWITCH_ENABLED: true,
  I18N_ENABLED: false,
  NEXUS_PREFS_ENABLED: true,
  REMEMBER_EMAIL_ENABLED: true,
  REDUCE_MOTION_ENABLED: true,
  CALENDAR_DENSITY_ENABLED: true,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}

export function withFeatureGuard<T>(flag: FeatureFlag, callback: () => T): T | null {
  if (isFeatureEnabled(flag)) {
    return callback();
  }
  return null;
}

// Telemetry for blocked features
export function trackBlockedFeatureView(feature: string) {
  console.log(`[Telemetry] Blocked feature viewed: ${feature}`);
  // Future: Send to analytics service
}