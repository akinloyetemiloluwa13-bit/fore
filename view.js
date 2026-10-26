(function () {
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function renderHeader(eyebrow, title, description, action = '') {
  return `
    <div class="page-heading">
      <div>
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="page-description">${escapeHtml(description)}</p>
      </div>
      ${action}
    </div>`;
}

function renderEmpty(title, description) {
  return `<div class="empty-state"><span class="empty-mark" aria-hidden="true">＋</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(description)}</p></div>`;
}

function renderDashboard() {
  const futureExams = ForeModel.getState().exams
    .filter(exam => exam.date >= ForeModel.localDateString())
    .sort((first, second) => `${first.date}${first.startTime}`.localeCompare(`${second.date}${second.startTime}`))
    .slice(0, 4);

  return `
    ${renderHeader('MONITOR YOUR CAMPUS', 'Examination overview', 'A clear view of student enrollment and exam-day activity.',
      '<button class="button button-primary" type="button" data-view="desk"><span aria-hidden="true">＋</span> Open exam desk</button>')}
    <section class="welcome-banner">
      <div><span class="banner-kicker">EXAM MANAGEMENT, MADE SIMPLE</span><h2>Good day, Administrator</h2><p>Manage your student roster, schedule examinations, and record attendance from one place.</p></div>
      <span class="banner-art" aria-hidden="true"><span>✓</span></span>
    </section>
    <section class="stats-grid" aria-label="Campus summary">
      <article class="stat-card"><span class="stat-icon students-icon" aria-hidden="true">♙</span><span class="stat-label">Enrolled students</span><strong>${ForeModel.getState().students.length}</strong><small>In your local roster</small></article>
      <article class="stat-card"><span class="stat-icon exams-icon" aria-hidden="true">▤</span><span class="stat-label">Examinations</span><strong>${ForeModel.getState().exams.length}</strong><small>Scheduled in this workspace</small></article>
      <article class="stat-card"><span class="stat-icon attendance-icon" aria-hidden="true">✓</span><span class="stat-label">Checked in today</span><strong>${ForeModel.getTodayAttendance().length}</strong><small>Attendance records today</small></article>
    </section>
    <section class="dashboard-grid">
      <article class="panel schedule-panel">
        <div class="panel-heading"><div><h2>Upcoming examinations</h2><p>Your next scheduled exam sessions</p></div><button class="text-button" type="button" data-view="exams">View all <span aria-hidden="true">→</span></button></div>
        ${futureExams.length ? `<div class="exam-list">${futureExams.map(exam => `
          <div class="exam-list-item">
            <span class="date-tile"><strong>${escapeHtml(new Intl.DateTimeFormat(undefined, { day: '2-digit' }).format(new Date(`${exam.date}T12:00:00`)))}</strong><small>${escapeHtml(new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(`${exam.date}T12:00:00`)))}</small></span>
            <span class="exam-summary"><strong>${escapeHtml(exam.name)}</strong><small>${escapeHtml(exam.course)} · ${escapeHtml(exam.venue)}</small></span>
            <span class="exam-time">${escapeHtml(ForeModel.formatTime(exam.startTime))}</span>
          </div>`).join('')}</div>` : renderEmpty('No upcoming examinations', 'Create an examination to see it listed here.')}
      </article>
      <article class="panel actions-panel">
        <div class="panel-heading"><div><h2>Quick actions</h2><p>Get started with a common task</p></div></div>
        <button class="quick-action" type="button" data-view="students"><span class="quick-icon">♙</span><span><strong>Enroll a student</strong><small>Add a student to the roster</small></span><span class="quick-arrow">→</span></button>
        <button class="quick-action" type="button" data-view="exams"><span class="quick-icon violet">▤</span><span><strong>Schedule an exam</strong><small>Set up an examination session</small></span><span class="quick-arrow">→</span></button>
        <button class="quick-action" type="button" data-view="desk"><span class="quick-icon green">✓</span><span><strong>Record attendance</strong><small>Check a student in or out</small></span><span class="quick-arrow">→</span></button>
      </article>
    </section>
    <p class="demo-disclaimer"><span aria-hidden="true">ⓘ</span> Prototype only: biometric scanning, authentication, and SIS connectivity are not active.</p>`;
}

function renderStudents() {
  const students = [...ForeModel.getState().students].sort((first, second) => first.name.localeCompare(second.name));
  return `
    ${renderHeader('STUDENT DIRECTORY', 'Students', 'Enroll and manage the students eligible to sit examinations.',
      '<button class="button button-secondary" type="button" data-action="export-students" ' + (students.length ? '' : 'disabled') + '>↓ Export roster</button>')}
    <section class="panel form-panel">
      <div class="panel-heading"><div><h2>Enroll a student</h2><p>Enter the student’s campus details to add them to this roster.</p></div><span class="form-step">NEW RECORD</span></div>
      <form id="student-form" class="form-grid">
        <label>Student ID<input name="studentId" type="text" maxlength="32" placeholder="e.g. STU-1042" required autocomplete="off" /></label>
        <label>Full name<input name="name" type="text" maxlength="100" placeholder="Student’s full name" required autocomplete="name" /></label>
        <label>Faculty or department<input name="department" type="text" maxlength="80" placeholder="e.g. Computer Science" required /></label>
        <div class="form-submit"><button class="button button-primary" type="submit">Add student <span aria-hidden="true">→</span></button></div>
      </form>
      <p class="form-note"><span aria-hidden="true">ⓘ</span> This prototype records student details only; it does not capture or store fingerprints or face data.</p>
    </section>
    <section class="panel table-panel">
      <div class="panel-heading"><div><h2>Student roster <span class="count-pill">${students.length}</span></h2><p>Students available for examination check-in</p></div><label class="search-box"><span aria-hidden="true">⌕</span><input id="student-search" type="search" placeholder="Search students" aria-label="Search students" /></label></div>
      ${students.length ? `<div class="table-scroll"><table><thead><tr><th>STUDENT</th><th>STUDENT ID</th><th>FACULTY / DEPARTMENT</th><th>STATUS</th></tr></thead><tbody id="student-rows">${students.map(student => `
        <tr data-search="${escapeHtml(`${student.name} ${student.id} ${student.department}`.toLowerCase())}">
          <td><span class="table-person"><span class="avatar student-avatar">${escapeHtml(student.name.trim().charAt(0).toUpperCase())}</span><strong>${escapeHtml(student.name)}</strong></span></td>
          <td><span class="id-label">${escapeHtml(student.id)}</span></td><td>${escapeHtml(student.department)}</td><td><span class="status-badge">Enrolled</span></td>
        </tr>`).join('')}</tbody></table></div>` : renderEmpty('Your roster is empty', 'Use the form above to enroll your first student.')}
    </section>`;
}

function renderExams() {
  const exams = [...ForeModel.getState().exams].sort((first, second) => `${first.date}${first.startTime}`.localeCompare(`${second.date}${second.startTime}`));
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `
    ${renderHeader('EXAM PLANNING', 'Examinations', 'Create and review examination sessions for your campus.',
      '<button class="button button-primary" type="button" data-action="focus-exam-form"><span aria-hidden="true">＋</span> Schedule examination</button>')}
    <section class="panel form-panel">
      <div class="panel-heading"><div><h2>Schedule an examination</h2><p>Set the session time and add questions for students to answer.</p></div><span class="form-step">NEW SESSION</span></div>
      <form id="exam-form" class="form-grid exam-form-grid">
        <label>Examination name<input name="name" type="text" maxlength="100" placeholder="e.g. Introduction to Biology" required /></label>
        <label>Course or class<input name="course" type="text" maxlength="80" placeholder="e.g. BIO 101" required /></label>
        <label>Exam date<input name="date" type="date" min="${ForeModel.localDateString()}" required /></label>
        <label>Venue<input name="venue" type="text" maxlength="80" placeholder="e.g. Hall A" required /></label>
        <label>Start time<input name="startTime" type="time" required /></label>
        <label>End time<input name="endTime" type="time" required /></label>
        <div class="question-builder">
          <div class="question-builder-heading"><div><h3>Exam questions</h3><p>Set multiple-choice questions and choose the correct answer.</p></div><span class="timezone-label">Times use ${escapeHtml(timezone)} local time</span></div>
          <div id="question-list">${renderQuestionFields(0)}</div>
          <button class="button button-secondary add-question-button" type="button" data-action="add-question">＋ Add another question</button>
        </div>
        <div class="form-submit exam-submit"><button class="button button-primary" type="submit">Create examination <span aria-hidden="true">→</span></button></div>
      </form>
    </section>
    <section class="panel table-panel">
      <div class="panel-heading"><div><h2>Exam schedule <span class="count-pill">${exams.length}</span></h2><p>Students are automatically submitted at each scheduled end time.</p></div></div>
      ${exams.length ? `<div class="table-scroll"><table><thead><tr><th>EXAMINATION</th><th>DATE &amp; TIME</th><th>VENUE</th><th>ATTENDANCE</th><th>SUBMISSIONS</th></tr></thead><tbody>${exams.map(exam => {
        const count = ForeModel.getState().attendance.filter(record => record.examId === exam.id).length;
        const submissions = ForeModel.getState().attempts.filter(attempt => attempt.examId === exam.id && attempt.status === 'submitted').length;
        const examStatus = ForeModel.getExamStatus(exam).status;
        return `<tr><td><strong>${escapeHtml(exam.name)}</strong><small class="table-subtext">${escapeHtml(exam.course)} · ${exam.questions?.length || 0} questions</small></td><td>${escapeHtml(ForeModel.formatDate(exam.date))}<small class="table-subtext">${escapeHtml(ForeModel.formatTime(exam.startTime))} – ${escapeHtml(ForeModel.formatTime(exam.endTime))} · ${escapeHtml(examStatus)}</small></td><td>${escapeHtml(exam.venue)}</td><td><span class="count-pill">${count} checked in</span></td><td><span class="count-pill">${submissions} submitted</span></td></tr>`;
      }).join('')}</tbody></table></div>` : renderEmpty('No examinations scheduled', 'Use the form above to create your first exam session.')}
    </section>`;
}

function renderQuestionFields(index) {
  return `<fieldset class="question-card">
    <legend>Question ${index + 1}</legend>
    <label class="question-prompt">Question<input name="question_${index}" type="text" maxlength="500" placeholder="Enter the question" required /></label>
    <div class="choice-grid">${[0, 1, 2, 3].map(option => `<label class="choice-field"><span>Option ${String.fromCharCode(65 + option)}</span><input name="option_${index}_${option}" type="text" maxlength="200" placeholder="Answer choice" required /></label>`).join('')}</div>
    <fieldset class="correct-answer"><legend>Correct answer</legend>${[0, 1, 2, 3].map(option => `<label><input type="radio" name="correct_${index}" value="${option}" required /> ${String.fromCharCode(65 + option)}</label>`).join('')}</fieldset>
  </fieldset>`;
}

function renderTakeExam() {
  if (window.ForeUI.selectedSubmissionId) {
    const submittedAttempt = ForeModel.getState().attempts.find(attempt => attempt.id === window.ForeUI.selectedSubmissionId && attempt.status === 'submitted');
    if (submittedAttempt) return renderSubmissionReceipt(submittedAttempt);
    window.ForeUI.selectedSubmissionId = '';
  }
  const activeAttempt = ForeModel.getState().attempts.find(attempt => attempt.id === window.ForeUI.activeAttemptId && attempt.status === 'active');
  if (activeAttempt) return renderActiveAttempt(activeAttempt);

  const student = ForeModel.getState().students.find(item => item.id.toLowerCase() === window.ForeUI.takeExamStudentId.toLowerCase());
  const exams = [...ForeModel.getState().exams].sort((first, second) => `${first.date}${first.startTime}`.localeCompare(`${second.date}${second.startTime}`));
  return `
    ${renderHeader('STUDENT EXAM PORTAL', 'Take an examination', 'Enter your student ID to access your scheduled exam papers.')}
    <section class="panel candidate-panel">
      <form id="candidate-form" class="candidate-form">
        <label>Student ID<input name="candidateId" type="text" maxlength="32" placeholder="Enter your enrolled student ID" value="${escapeHtml(window.ForeUI.takeExamStudentId)}" required autocomplete="off" /></label>
        <button class="button button-primary" type="submit">Find my examinations <span aria-hidden="true">→</span></button>
      </form>
      ${student ? `<p class="candidate-greeting"><span class="status-dot"></span> Signed in for this demo as <strong>${escapeHtml(student.name)}</strong> · ${escapeHtml(student.id)}</p>` : window.ForeUI.takeExamStudentId ? '<p class="candidate-error">Student ID not found in this browser’s roster. Enroll with the administrator first.</p>' : '<p class="form-note"><span aria-hidden="true">ⓘ</span> Use the student ID recorded by your institution. This demo checks the local roster only.</p>'}
    </section>
    <section class="exam-availability-list">
      <div class="section-intro"><div><h2>Scheduled examinations</h2><p>Exam access follows the start and end times shown in your local time zone.</p></div><span class="timezone-label">${escapeHtml(Intl.DateTimeFormat().resolvedOptions().timeZone)}</span></div>
      ${exams.length ? exams.map(exam => {
        const timing = ForeModel.getExamStatus(exam);
        const attempt = student && ForeModel.getState().attempts.find(item => item.examId === exam.id && item.studentId === student.id);
        const canTake = !!student && !!exam.questions?.length && (timing.status === 'open' || attempt?.status === 'active');
        let label = timing.status === 'upcoming'
          ? `Starts in ${ForeModel.formatCountdown(timing.startsAt - Date.now())}`
          : timing.status === 'ended' ? 'Exam ended' : `Ends in ${ForeModel.formatCountdown(timing.endsAt - Date.now())}`;
        if (!exam.questions?.length) label = 'Exam paper not configured';
        if (attempt?.status === 'submitted') label = attempt.submissionType === 'automatic' ? 'Auto-submitted' : 'Submitted';
        const buttonLabel = attempt?.status === 'submitted'
          ? 'View submission'
          : attempt?.status === 'active' ? 'Resume exam' : timing.status === 'open' ? 'Start exam' : 'Not available';
        return `<article class="panel availability-card">
          <span class="exam-date-mark"><strong>${escapeHtml(new Intl.DateTimeFormat(undefined, { day: '2-digit' }).format(new Date(`${exam.date}T12:00:00`)))}</strong><small>${escapeHtml(new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(`${exam.date}T12:00:00`)))}</small></span>
          <div class="availability-details"><h3>${escapeHtml(exam.name)}</h3><p>${escapeHtml(exam.course)} · ${escapeHtml(exam.venue)}</p><small>${escapeHtml(ForeModel.formatTime(exam.startTime))} – ${escapeHtml(ForeModel.formatTime(exam.endTime))} · ${exam.questions?.length || 0} questions</small></div>
          <div class="availability-actions"><span class="countdown-label ${timing.status === 'ended' || attempt?.status === 'submitted' ? 'countdown-ended' : ''}" data-exam-countdown data-exam-id="${escapeHtml(exam.id)}">${escapeHtml(label)}</span>
          ${attempt?.status === 'submitted' ? `<button class="text-button" type="button" data-action="view-submission" data-attempt-id="${escapeHtml(attempt.id)}">${escapeHtml(buttonLabel)} →</button>` : `<button class="button button-primary" type="button" data-action="take-exam" data-exam-id="${escapeHtml(exam.id)}" ${canTake ? '' : 'disabled'}>${escapeHtml(buttonLabel)}</button>`}</div>
        </article>`;
      }).join('') : renderEmpty('No examinations scheduled', 'Your exam papers will appear here when they are scheduled.')}
      <p class="exam-timing-note"><strong>Automatic submission:</strong> an open attempt in this browser is submitted when the scheduled end time arrives. This local demo cannot submit attempts on other students’ devices.</p>
    </section>`;
}

function renderSubmissionReceipt(attempt) {
  const exam = ForeModel.getState().exams.find(item => item.id === attempt.examId);
  return `
    ${renderHeader('EXAM SUBMITTED', exam?.name || 'Exam submission', `${ForeModel.fullName(attempt.studentId)} · ${attempt.studentId}`)}
    <section class="panel submission-receipt">
      <span class="receipt-mark" aria-hidden="true">✓</span>
      <h2>Your exam has been ${attempt.submissionType === 'automatic' ? 'automatically submitted' : 'submitted'}.</h2>
      <p>${attempt.submissionType === 'automatic' ? 'The scheduled end time was reached and your saved answers were submitted.' : 'Your answers have been recorded successfully.'}</p>
      <dl>
        <div><dt>Questions answered</dt><dd>${Object.keys(attempt.answers || {}).length} / ${exam?.questions?.length || 0}</dd></div>
        <div><dt>Submitted at</dt><dd>${escapeHtml(new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(attempt.submittedAt)))}</dd></div>
        <div><dt>Submission type</dt><dd>${attempt.submissionType === 'automatic' ? 'Automatic at deadline' : 'Submitted by student'}</dd></div>
      </dl>
      <button class="button button-secondary" type="button" data-action="back-to-exams">Back to examinations</button>
    </section>`;
}

function renderActiveAttempt(attempt) {
  const exam = ForeModel.getState().exams.find(item => item.id === attempt.examId);
  if (!exam || !exam.questions?.length) {
    window.ForeUI.activeAttemptId = '';
    return renderTakeExam();
  }
  const answeredCount = Object.keys(attempt.answers || {}).length;
  return `
    ${renderHeader('EXAM IN PROGRESS', exam.name, `${exam.course} · ${ForeModel.fullName(attempt.studentId)} · ${attempt.studentId}`,
      '<div class="exam-clock" role="timer"><span>TIME REMAINING</span><strong id="attempt-countdown">--:--:--</strong></div>')}
    <div class="attempt-progress"><span id="answered-progress">${answeredCount} of ${exam.questions.length} answered</span><span>Ends ${escapeHtml(ForeModel.formatTime(exam.endTime))} (${escapeHtml(Intl.DateTimeFormat().resolvedOptions().timeZone)})</span></div>
    <form id="take-exam-form" class="question-paper" data-attempt-id="${escapeHtml(attempt.id)}">
      ${exam.questions.map((question, questionIndex) => `<fieldset class="panel answer-card">
        <legend><span class="question-number">QUESTION ${questionIndex + 1}</span><strong>${escapeHtml(question.prompt)}</strong></legend>
        <div class="answer-options">${question.options.map((option, optionIndex) => `<label class="answer-option"><input type="radio" name="answer_${questionIndex}" value="${optionIndex}" data-question-index="${questionIndex}" ${Number(attempt.answers?.[questionIndex]) === optionIndex ? 'checked' : ''} /><span class="answer-letter">${String.fromCharCode(65 + optionIndex)}</span><span>${escapeHtml(option)}</span></label>`).join('')}</div>
      </fieldset>`).join('')}
      <div class="submit-paper-bar"><p>Answers save automatically in this browser. The exam will submit when the clock reaches zero.</p><button class="button button-primary" type="submit">Submit exam now <span aria-hidden="true">→</span></button></div>
    </form>`;
}

function renderDesk() {
  const activeExamId = window.ForeUI.selectedExamId;
  const records = ForeModel.getState().attendance
    .filter(record => !window.ForeUI.attendanceFilterId || record.examId === window.ForeUI.attendanceFilterId)
    .slice()
    .sort((first, second) => second.checkIn.localeCompare(first.checkIn));
  return `
    ${renderHeader('EXAM-DAY OPERATIONS', 'Exam check-in', 'Verify a student’s roster record and keep a clear attendance log.',
      '<span class="desk-open"><span class="status-dot"></span> Desk ready</span>')}
    <section class="desk-layout">
      <article class="panel checkin-panel">
        <div class="panel-heading"><div><h2>Student check-in</h2><p>Select an exam and enter the student’s ID.</p></div><span class="desk-check" aria-hidden="true">✓</span></div>
        ${ForeModel.getState().exams.length && ForeModel.getState().students.length ? `<form id="attendance-form">
          <label class="full-label">Examination<select name="examId" id="exam-select" required><option value="">Choose an examination</option>${ForeModel.getState().exams.map(exam => `<option value="${escapeHtml(exam.id)}" ${exam.id === activeExamId ? 'selected' : ''}>${escapeHtml(exam.name)} · ${escapeHtml(ForeModel.formatDate(exam.date))}</option>`).join('')}</select></label>
          <label class="full-label student-id-field">Student ID<input name="studentId" type="text" maxlength="32" placeholder="Scan or type a student ID" required autocomplete="off" /><small>In this prototype, IDs are matched against the enrolled roster. No biometric reader is connected.</small></label>
          <div class="attendance-actions"><button class="button button-primary" type="submit" name="attendanceAction" value="check-in">Check in student</button><button class="button button-secondary" type="submit" name="attendanceAction" value="check-out">Check out</button></div>
        </form>` : renderEmpty('Ready when you are', !ForeModel.getState().students.length && !ForeModel.getState().exams.length ? 'Add students and schedule an examination before recording attendance.' : !ForeModel.getState().students.length ? 'Enroll at least one student before opening the exam desk.' : 'Schedule an examination before opening the exam desk.')}
      </article>
      <article class="panel desk-info"><span class="info-icon" aria-hidden="true">i</span><h2>How the exam desk works</h2><ol><li>Select the examination session.</li><li>Enter the ID of an enrolled student.</li><li>Record check-in at arrival and check-out when they leave.</li></ol><p>Each student can be checked in once per exam. All records stay in this browser.</p></article>
    </section>
    <section class="panel table-panel attendance-panel">
      <div class="panel-heading"><div><h2>Attendance log <span class="count-pill">${records.length}</span></h2><p>Check-in and check-out activity for the selected exam</p></div>${ForeModel.getState().exams.length ? `<label class="filter-select"><span class="visually-hidden">Filter attendance by exam</span><select id="attendance-filter"><option value="">All examinations</option>${ForeModel.getState().exams.map(exam => `<option value="${escapeHtml(exam.id)}" ${exam.id === window.ForeUI.attendanceFilterId ? 'selected' : ''}>${escapeHtml(exam.name)}</option>`).join('')}</select></label>` : ''}</div>
      ${records.length ? `<div class="table-scroll"><table><thead><tr><th>STUDENT</th><th>EXAMINATION</th><th>CHECKED IN</th><th>CHECKED OUT</th><th>STATUS</th></tr></thead><tbody>${records.map(record => `<tr><td><strong>${escapeHtml(ForeModel.fullName(record.studentId))}</strong><small class="table-subtext">${escapeHtml(record.studentId)}</small></td><td>${escapeHtml(ForeModel.examName(record.examId))}</td><td>${escapeHtml(new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(record.checkIn)))}</td><td>${record.checkOut ? escapeHtml(new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(record.checkOut))) : '—'}</td><td><span class="status-badge ${record.checkOut ? 'status-complete' : ''}">${record.checkOut ? 'Checked out' : 'On campus'}</span></td></tr>`).join('')}</tbody></table></div>` : renderEmpty('No attendance recorded yet', 'Check in the first student to start the attendance log.')}
    </section>`;
}

function renderSecurity() {
  return `
    ${renderHeader('CONNECTED CAMPUS', 'Integration & security', 'Review the current demo capabilities and what is needed for a real deployment.')}
    <section class="integration-grid">
      <article class="panel integration-card"><span class="integration-icon">↔</span><p class="eyebrow">STUDENT INFORMATION SYSTEM</p><h2>SIS / API integration</h2><p>This standalone demo does not connect to a student information system. A production integration needs your institution’s API details and an authenticated server-side connection.</p><span class="integration-status"><span class="status-dot muted-dot"></span> Not connected</span></article>
      <article class="panel integration-card"><span class="integration-icon violet">▣</span><p class="eyebrow">BIOMETRIC HARDWARE</p><h2>Device connection</h2><p>No fingerprint or face-recognition device is connected. The exam desk currently matches typed student IDs against the local roster.</p><span class="integration-status"><span class="status-dot muted-dot"></span> Not connected</span></article>
      <article class="panel security-card"><span class="integration-icon green">◇</span><p class="eyebrow">DATA &amp; PRIVACY</p><h2>Prototype security status</h2><ul><li>Students, questions, answer keys, and attempts are stored in this browser’s local storage.</li><li>Automatic submission runs in the open student’s browser; this standalone demo cannot reach or force-submit attempts on other devices.</li><li>There is no sign-in, server, encryption service, or role-based access control. Do not enter real student or exam data.</li></ul><p class="security-warning"><strong>Before production:</strong> add a secure server-authoritative exam timer and submission endpoint, authentication, protected answer keys, access controls, audit logging, and institution-approved biometric hardware and consent procedures.</p></article>
    </section>`;
}

function render() {
  const renderers = {
    dashboard: renderDashboard,
    students: renderStudents,
    exams: renderExams,
    take: renderTakeExam,
    desk: renderDesk,
    security: renderSecurity
  };
  document.getElementById('app').innerHTML = renderers[window.ForeUI.currentView]();
}


window.ForeView = Object.freeze({ render, renderQuestionFields });
})();
