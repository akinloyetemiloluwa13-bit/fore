(function () {
const STORAGE_KEY = 'examly-demo-data-v1';
let storageReady = true;
let notifyModelError = () => {};

function setModelErrorHandler(handler) {
  notifyModelError = handler;
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { students: [], exams: [], attendance: [], attempts: [] };

    const parsed = JSON.parse(saved);
    if (
      !parsed ||
      !Array.isArray(parsed.students) ||
      !Array.isArray(parsed.exams) ||
      !Array.isArray(parsed.attendance)
    ) {
      throw new Error('Saved data has an unexpected format.');
    }
    return {
      ...parsed,
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : []
    };
  } catch (error) {
    storageReady = false;
    console.error('Could not load saved Examly data:', error);
    return { students: [], exams: [], attendance: [], attempts: [] };
  }
}

let state = loadState();

function saveState(nextState) {
  if (!storageReady) {
    notifyModelError('Changes cannot be saved until the browser storage issue is resolved.');
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    state = nextState;
    return true;
  } catch (error) {
    console.error('Could not save Examly data:', error);
    notifyModelError('Could not save your changes in this browser. Check available storage and try again.');
    return false;
  }
}

function formatDate(dateValue, options = { dateStyle: 'medium' }) {
  if (!dateValue) return '—';
  const date = new Date(`${dateValue}T12:00:00`);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, options).format(date);
}

function localDateString(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatTime(timeValue) {
  if (!timeValue) return '';
  const [hour, minute] = timeValue.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

function examTimestamp(dateValue, timeValue) {
  return new Date(`${dateValue}T${timeValue}:00`).getTime();
}

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const clock = [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
  return days ? `${days}d ${clock}` : clock;
}

function getExamStatus(exam, now = Date.now()) {
  const startsAt = examTimestamp(exam.date, exam.startTime);
  const endsAt = examTimestamp(exam.date, exam.endTime);
  if (now < startsAt) return { status: 'upcoming', startsAt, endsAt };
  if (now >= endsAt) return { status: 'ended', startsAt, endsAt };
  return { status: 'open', startsAt, endsAt };
}

function fullName(studentId) {
  return state.students.find(student => student.id === studentId)?.name || 'Unknown student';
}

function examName(examId) {
  return state.exams.find(exam => exam.id === examId)?.name || 'Unknown examination';
}

function getTodayAttendance() {
  const today = localDateString();
  return state.attendance.filter(record => record.checkIn?.slice(0, 10) === today);
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

window.ForeModel = Object.freeze({
  isStorageReady: () => storageReady,
  getState: () => state,
  saveState,
  setErrorHandler: setModelErrorHandler,
  formatDate,
  localDateString,
  formatTime,
  examTimestamp,
  formatCountdown,
  getExamStatus,
  fullName,
  examName,
  getTodayAttendance,
  makeId
});
})();
