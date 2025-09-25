export interface SchoolSettings {
  schoolSlug: string;
  weightsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolSettingsStore {
  settings: Record<string, SchoolSettings>;
  getSchoolSettings: (schoolSlug: string) => SchoolSettings;
  updateSchoolSettings: (schoolSlug: string, updates: Partial<SchoolSettings>) => void;
  isWeightsEnabled: (schoolSlug: string) => boolean;
  getCurrentSchoolSettings: () => SchoolSettings | null;
  updateCurrentSchoolSettings: (updates: Partial<SchoolSettings>) => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
}