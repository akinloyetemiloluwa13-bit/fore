(function () {
const views = {
  dashboard: 'Overview',
  students: 'Students',
  exams: 'Examinations',
  take: 'Take exam',
  desk: 'Exam check-in',
  security: 'Integration & security'
};

const app = document.getElementById('app');
const toast = document.getElementById('toast');
const pageName = document.getElementById('page-name');
const ForeUI = window.ForeUI = {
  currentView: 'dashboard',
  selectedExamId: '',
  attendanceFilterId: '',
  takeExamStudentId: '',
  activeAttemptId: '',
  selectedSubmissionId: ''
};
let toastTimer;

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle('is-error', isError);
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 4200);
}

function setView(view) {
  if (!Object.hasOwn(views, view)) return;
  ForeUI.currentView = view;
  pageName.textContent = views[view];
  document.querySelectorAll('[data-view]').forEach(button => {
    button.classList.toggle('is-active', button.dataset.view === view);
    if (button.matches('.nav-link')) {
      button.setAttribute('aria-current', button.dataset.view === view ? 'page' : 'false');
    }
  });
  renderApp();
  app.focus({ preventScroll: true });
}

function handleStudentSubmit(form) {
  const formData = new FormData(form);
  const id = String(formData.get('studentId')).trim();
  const student = {
    id,
    name: String(formData.get('name')).trim(),
    department: String(formData.get('department')).trim()
  };
  if (ForeModel.getState().students.some(existing => existing.id.toLowerCase() === id.toLowerCase())) {
    showToast('A student with this ID is already enrolled.', true);
    return;
  }
  if (ForeModel.saveState({ ...ForeModel.getState(), students: [...ForeModel.getState().students, student] })) {
    renderApp();
    showToast(`${student.name} was added to the student roster.`);
  }
}

function handleExamSubmit(form) {
  const formData = new FormData(form);
  const questionCards = [...form.querySelectorAll('.question-card')];
  const exam = {
    id: ForeModel.makeId(),
    name: String(formData.get('name')).trim(),
    course: String(formData.get('course')).trim(),
    date: String(formData.get('date')),
    venue: String(formData.get('venue')).trim(),
    startTime: String(formData.get('startTime')),
    endTime: String(formData.get('endTime')),
    questions: questionCards.map((card, index) => ({
      prompt: String(formData.get(`question_${index}`) || '').trim(),
      options: [0, 1, 2, 3].map(optionIndex => String(formData.get(`option_${index}_${optionIndex}`) || '').trim()),
      correctIndex: Number(formData.get(`correct_${index}`))
    }))
  };
  const startsAt = ForeModel.examTimestamp(exam.date, exam.startTime);
  const endsAt = ForeModel.examTimestamp(exam.date, exam.endTime);
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) {
    showToast('The exam end time must be later than its start time on the same date.', true);
    form.elements.endTime.focus();
    return;
  }
  if (startsAt <= Date.now()) {
    showToast('Choose a future start date and time so students can begin when the exam opens.', true);
    form.elements.date.focus();
    return;
  }
  if (ForeModel.saveState({ ...ForeModel.getState(), exams: [...ForeModel.getState().exams, exam] })) {
    renderApp();
    showToast(`${exam.name} was added to the exam schedule.`);
  }
}

function handleCandidateSubmit(form) {
  ForeUI.takeExamStudentId = String(new FormData(form).get('candidateId')).trim();
  ForeUI.activeAttemptId = '';
  ForeUI.selectedSubmissionId = '';
  const student = ForeModel.getState().students.find(item => item.id.toLowerCase() === ForeUI.takeExamStudentId.toLowerCase());
  if (!student) {
    renderApp();
    showToast('Student ID not found in this browser’s roster.', true);
    return;
  }
  ForeUI.takeExamStudentId = student.id;
  renderApp();
  showToast(`Examinations found for ${student.name}.`);
}

function startOrResumeExam(examId) {
  const student = ForeModel.getState().students.find(item => item.id.toLowerCase() === ForeUI.takeExamStudentId.toLowerCase());
  const exam = ForeModel.getState().exams.find(item => item.id === examId);
  if (!student) {
    showToast('Enter a valid enrolled student ID first.', true);
    return;
  }
  if (!exam?.questions?.length) {
    showToast('This examination does not have a question paper configured.', true);
    return;
  }

  const existingAttempt = ForeModel.getState().attempts.find(attempt => attempt.examId === exam.id && attempt.studentId === student.id);
  if (existingAttempt?.status === 'submitted') {
    showToast('This examination has already been submitted for this student.', true);
    return;
  }
  if (existingAttempt?.status === 'active') {
    if (ForeModel.getExamStatus(exam).status === 'ended') {
      autoSubmitExpiredAttempts();
      return;
    }
    ForeUI.activeAttemptId = existingAttempt.id;
    ForeUI.selectedSubmissionId = '';
    renderApp();
    return;
  }
  if (ForeModel.getExamStatus(exam).status !== 'open') {
    showToast('You can start this examination only between its scheduled start and end times.', true);
    return;
  }

  const attempt = {
    id: ForeModel.makeId(),
    examId: exam.id,
    studentId: student.id,
    answers: {},
    status: 'active',
    startedAt: new Date().toISOString()
  };
  if (ForeModel.saveState({ ...ForeModel.getState(), attempts: [...ForeModel.getState().attempts, attempt] })) {
    ForeUI.activeAttemptId = attempt.id;
    ForeUI.selectedSubmissionId = '';
    renderApp();
    showToast('Your exam has started. It will submit automatically at the scheduled end time.');
  }
}

function submitAttempt(attemptId, submissionType) {
  const attempt = ForeModel.getState().attempts.find(item => item.id === attemptId && item.status === 'active');
  if (!attempt) return;
  const exam = ForeModel.getState().exams.find(item => item.id === attempt.examId);
  if (!exam) {
    showToast('The scheduled examination for this attempt could not be found.', true);
    return;
  }
  const attempts = ForeModel.getState().attempts.map(item => item.id === attemptId
    ? { ...item, status: 'submitted', submittedAt: new Date().toISOString(), submissionType }
    : item);
  if (ForeModel.saveState({ ...ForeModel.getState(), attempts })) {
    if (ForeUI.activeAttemptId === attemptId) ForeUI.activeAttemptId = '';
    ForeUI.selectedSubmissionId = attemptId;
    renderApp();
    showToast(submissionType === 'automatic' ? `${exam.name} was automatically submitted at the deadline.` : `${exam.name} was submitted.`);
  }
}

function autoSubmitExpiredAttempts() {
  const now = Date.now();
  const expiredAttempts = ForeModel.getState().attempts.filter(attempt => {
    if (attempt.status !== 'active') return false;
    const exam = ForeModel.getState().exams.find(item => item.id === attempt.examId);
    return exam && now >= ForeModel.examTimestamp(exam.date, exam.endTime);
  });
  if (!expiredAttempts.length) return;

  const expiredIds = new Set(expiredAttempts.map(attempt => attempt.id));
  const attempts = ForeModel.getState().attempts.map(attempt => expiredIds.has(attempt.id)
    ? { ...attempt, status: 'submitted', submittedAt: new Date().toISOString(), submissionType: 'automatic' }
    : attempt);
  if (ForeModel.saveState({ ...ForeModel.getState(), attempts })) {
    const receiptAttempt = expiredAttempts.find(attempt => attempt.id === ForeUI.activeAttemptId)
      || expiredAttempts.find(attempt => attempt.studentId === ForeUI.takeExamStudentId)
      || expiredAttempts[0];
    if (expiredIds.has(ForeUI.activeAttemptId)) ForeUI.activeAttemptId = '';
    if (ForeUI.currentView === 'take') {
      ForeUI.selectedSubmissionId = receiptAttempt.id;
      renderApp();
    }
    showToast(`${expiredAttempts.length} open exam ${expiredAttempts.length === 1 ? 'attempt was' : 'attempts were'} automatically submitted at the scheduled deadline.`);
  }
}

function updateExamClocks() {
  const now = Date.now();
  document.querySelectorAll('[data-exam-countdown]').forEach(clock => {
    const exam = ForeModel.getState().exams.find(item => item.id === clock.dataset.examId);
    if (!exam) return;
    const timing = ForeModel.getExamStatus(exam, now);
    clock.textContent = timing.status === 'upcoming'
      ? `Starts in ${ForeModel.formatCountdown(timing.startsAt - now)}`
      : timing.status === 'ended' ? 'Exam ended' : `Ends in ${ForeModel.formatCountdown(timing.endsAt - now)}`;
    clock.classList.toggle('countdown-ended', timing.status === 'ended');

    const card = clock.closest('.availability-card');
    const button = card?.querySelector('[data-action="take-exam"]');
    const attempt = ForeModel.getState().attempts.find(item => item.examId === exam.id && item.studentId === ForeUI.takeExamStudentId);
    if (button) {
      button.disabled = !(ForeUI.takeExamStudentId && exam.questions?.length && (timing.status === 'open' || attempt?.status === 'active'));
      button.textContent = attempt?.status === 'active' ? 'Resume exam' : timing.status === 'open' ? 'Start exam' : 'Not available';
    }
  });

  const activeAttempt = ForeModel.getState().attempts.find(attempt => attempt.id === ForeUI.activeAttemptId && attempt.status === 'active');
  const countdown = document.getElementById('attempt-countdown');
  if (activeAttempt && countdown) {
    const exam = ForeModel.getState().exams.find(item => item.id === activeAttempt.examId);
    if (exam) countdown.textContent = ForeModel.formatCountdown(ForeModel.examTimestamp(exam.date, exam.endTime) - now);
  }
}

function handleAttendanceSubmit(form, submitter) {
  const formData = new FormData(form);
  const examId = String(formData.get('examId'));
  const studentId = String(formData.get('studentId')).trim();
  const action = submitter?.value;
  const student = ForeModel.getState().students.find(item => item.id.toLowerCase() === studentId.toLowerCase());
  if (!ForeModel.getState().exams.some(exam => exam.id === examId)) {
    showToast('Choose an examination before recording attendance.', true);
    return;
  }
  if (!student) {
    showToast('Student ID not found. Enroll the student before checking them in.', true);
    return;
  }
  const recordIndex = ForeModel.getState().attendance.findIndex(record => record.examId === examId && record.studentId === student.id);
  const records = [...ForeModel.getState().attendance];
  if (action === 'check-in') {
    if (recordIndex !== -1) {
      showToast('This student already has an attendance record for this examination.', true);
      return;
    }
    records.unshift({ examId, studentId: student.id, checkIn: new Date().toISOString(), checkOut: null });
  } else if (action === 'check-out') {
    if (recordIndex === -1) {
      showToast('This student has not been checked in for this examination.', true);
      return;
    }
    if (records[recordIndex].checkOut) {
      showToast('This student has already been checked out.', true);
      return;
    }
    records[recordIndex] = { ...records[recordIndex], checkOut: new Date().toISOString() };
  } else {
    showToast('Choose check-in or check-out to record attendance.', true);
    return;
  }
  if (ForeModel.saveState({ ...ForeModel.getState(), attendance: records })) {
    ForeUI.selectedExamId = examId;
    renderApp();
    showToast(`${student.name} ${action === 'check-in' ? 'checked in' : 'checked out'} successfully.`);
    document.querySelector('[name="studentId"]')?.focus();
  }
}

function exportStudents() {
  const quote = value => {
    const safeValue = String(value).replace(/^[=+\-@]/, "'$&");
    return `"${safeValue.replace(/"/g, '""')}"`;
  };
  const rows = [
    ['Student ID', 'Full name', 'Faculty or department'],
    ...ForeModel.getState().students.map(student => [student.id, student.name, student.department])
  ];
  const csv = rows.map(row => row.map(quote).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'student-roster.csv';
  link.click();
  URL.revokeObjectURL(url);
  showToast('Student roster exported as CSV.');
}

function renderApp() {
  ForeView.render();
  updateExamClocks();
}

ForeModel.setErrorHandler(message => showToast(message, true));
if (!ForeModel.isStorageReady()) {
  showToast('Saved data could not be read. This session is read-only; check browser storage before continuing.', true);
}

document.addEventListener('click', event => {
  const target = event.target.closest('[data-view], [data-action]');
  if (!target) return;
  if (target.dataset.view) {
    event.preventDefault();
    setView(target.dataset.view);
  }
  if (target.dataset.action === 'export-students') exportStudents();
  if (target.dataset.action === 'focus-exam-form') {
    document.getElementById('exam-form')?.elements.name.focus();
  }
  if (target.dataset.action === 'add-question') {
    const list = document.getElementById('question-list');
    if (list) list.insertAdjacentHTML('beforeend', ForeView.renderQuestionFields(list.querySelectorAll('.question-card').length));
  }
  if (target.dataset.action === 'take-exam') startOrResumeExam(target.dataset.examId);
  if (target.dataset.action === 'view-submission') {
    ForeUI.selectedSubmissionId = target.dataset.attemptId;
    renderApp();
  }
  if (target.dataset.action === 'back-to-exams') {
    ForeUI.selectedSubmissionId = '';
    renderApp();
  }
});

document.addEventListener('submit', event => {
  if (event.target.id === 'student-form') {
    event.preventDefault();
    handleStudentSubmit(event.target);
  } else if (event.target.id === 'exam-form') {
    event.preventDefault();
    handleExamSubmit(event.target);
  } else if (event.target.id === 'attendance-form') {
    event.preventDefault();
    handleAttendanceSubmit(event.target, event.submitter);
  } else if (event.target.id === 'candidate-form') {
    event.preventDefault();
    handleCandidateSubmit(event.target);
  } else if (event.target.id === 'take-exam-form') {
    event.preventDefault();
    const activeAttempt = ForeModel.getState().attempts.find(attempt => attempt.id === ForeUI.activeAttemptId && attempt.status === 'active');
    const exam = activeAttempt && ForeModel.getState().exams.find(item => item.id === activeAttempt.examId);
    if (!activeAttempt || !exam) {
      showToast('This exam attempt is no longer active.', true);
      renderApp();
      return;
    }
    if (Date.now() >= ForeModel.examTimestamp(exam.date, exam.endTime)) {
      autoSubmitExpiredAttempts();
      return;
    }
    if (window.confirm('Submit this examination now? You will not be able to change your answers after submission.')) {
      submitAttempt(ForeUI.activeAttemptId, 'student');
    }
  }
});

document.addEventListener('input', event => {
  if (event.target.id !== 'student-search') return;
  const query = event.target.value.trim().toLowerCase();
  document.querySelectorAll('#student-rows tr').forEach(row => {
    row.hidden = !row.dataset.search.includes(query);
  });
});

document.addEventListener('change', event => {
  if (event.target.id === 'exam-select') {
    ForeUI.selectedExamId = event.target.value;
  } else if (event.target.id === 'attendance-filter') {
    ForeUI.attendanceFilterId = event.target.value;
    renderApp();
  } else if (event.target.matches('#take-exam-form input[type="radio"][data-question-index]')) {
    const attempt = ForeModel.getState().attempts.find(item => item.id === ForeUI.activeAttemptId && item.status === 'active');
    if (!attempt) return;
    const exam = ForeModel.getState().exams.find(item => item.id === attempt.examId);
    if (!exam) {
      showToast('The scheduled examination for this attempt could not be found.', true);
      return;
    }
    if (Date.now() >= ForeModel.examTimestamp(exam.date, exam.endTime)) {
      autoSubmitExpiredAttempts();
      return;
    }
    const answers = { ...(attempt.answers || {}), [event.target.dataset.questionIndex]: Number(event.target.value) };
    const attempts = ForeModel.getState().attempts.map(item => item.id === attempt.id ? { ...item, answers } : item);
    if (ForeModel.saveState({ ...ForeModel.getState(), attempts })) {
      const progress = document.getElementById('answered-progress');
      if (progress && exam) progress.textContent = `${Object.keys(answers).length} of ${exam.questions.length} answered`;
    }
  }
});

window.addEventListener('focus', autoSubmitExpiredAttempts);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) autoSubmitExpiredAttempts();
});

autoSubmitExpiredAttempts();
renderApp();
window.setInterval(() => {
  autoSubmitExpiredAttempts();
  updateExamClocks();
}, 1000);
})();
