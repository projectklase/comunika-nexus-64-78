const KEY = 'comunika_last_seen';

export function getLastSeen(role: 'SECRETARIA' | 'PROFESSOR' | 'ALUNO') {
  try {
    const raw = localStorage.getItem(KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj[role] ? new Date(obj[role]) : null;
  } catch (error) {
    console.error('Error getting last seen:', error);
    return null;
  }
}

export function setLastSeen(role: 'SECRETARIA' | 'PROFESSOR' | 'ALUNO') {
  try {
    const raw = localStorage.getItem(KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[role] = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(obj));
  } catch (error) {
    console.error('Error setting last seen:', error);
  }
}