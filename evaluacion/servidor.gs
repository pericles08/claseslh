/* Google Apps Script. Las preguntas, claves y nómina viven en un archivo privado.
 * Todos los auxiliares terminan en _ para impedir su invocación desde el cliente.
 * Configurar DATA_FILE_ID en Propiedades del script antes de implementar. */
function data_() {
  const id = PropertiesService.getScriptProperties().getProperty('DATA_FILE_ID');
  if (!id) throw new Error('El docente todavía no activó el examen.');
  return JSON.parse(DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8'));
}
function doGet() {
  return HtmlService.createHtmlOutput(data_().html).setTitle('Evaluación · Laboratorio de Hardware')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function normal_(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}
function hash_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s).map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
}
function auth_(code, data) {
  const clean = String(code || '').toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-Z2-9]{12}$/.test(clean)) throw new Error('Código incorrecto. Revisá los doce caracteres.');
  const key = hash_(clean);
  const student = data.students[key];
  if (!student) throw new Error('Código incorrecto. Consultá al docente.');
  return { key: 'attempt:' + data.id + ':' + key, name: student };
}
function grade_(part, attempt) {
  const review = part.questions.map(q => {
    const answer = String(attempt.answers[q.id] || '');
    const ok = q.accept.some(a => normal_(a) === normal_(answer));
    return { id: q.id, topic: q.topic, prompt: q.prompt, answer, correct: q.accept[0], ok, feedback: q.feedback, source: q.source };
  });
  const points = review.filter(q => q.ok).length;
  return { points, max: review.length, percent: points * 100 / review.length, passed: points * 100 >= review.length * 70, review };
}
function expire_(state, data, now) {
  let changed = false;
  state.parts.forEach((attempt, i) => {
    if (attempt && !attempt.submittedAt && now >= attempt.deadline) {
      attempt.submittedAt = attempt.deadline;
      attempt.reason = 'tiempo'; changed = true;
    }
  });
  return changed;
}
function readState_(props, key, count) {
  return { parts: Array.from({ length: count }, (_, i) => JSON.parse(props.getProperty(key + ':p' + i) || 'null')) };
}
function writeState_(props, key, state) {
  state.parts.forEach((part, i) => {
    if (!part) return;
    const json = JSON.stringify(part), partKey = key + ':p' + i;
    if (props.getProperty(partKey) !== json) props.setProperty(partKey, json);
  });
}
function view_(state, data, name, now) {
  const parts = data.parts.map((part, i) => {
    const a = state.parts[i];
    const previousDone = i === 0 || Boolean(state.parts[i - 1] && state.parts[i - 1].submittedAt);
    const base = { title: part.title, minutes: part.minutes, count: part.questions.length,
      status: a ? (a.submittedAt ? 'submitted' : 'active') : (previousDone ? 'ready' : 'locked') };
    if (!a) return base;
    if (a.submittedAt) return Object.assign(base, { submittedAt: a.submittedAt, reason: a.reason, result: grade_(part, a) });
    return Object.assign(base, { startedAt: a.startedAt, deadline: a.deadline, revision: a.revision,
      answers: a.answers, questions: part.questions.map(q => ({ id: q.id, prompt: q.prompt, type: q.type, options: q.options || null })) });
  });
  const allDone = parts.every(p => p.status === 'submitted');
  const earned = parts.reduce((sum, p) => sum + (p.result ? p.result.points : 0), 0);
  const max = parts.reduce((sum, p) => sum + p.count, 0);
  return { name, examId: data.id, now, opens: Date.parse(data.opens), closes: Date.parse(data.closes), parts,
    total: { points: earned, max, percent: earned * 100 / max, complete: allDone,
      passed: allDone && earned * 100 >= max * 70 && parts.every(p => p.result.passed) },
    practical: allDone ? data.practical : null };
}
function exam(request) {
  if (!request || JSON.stringify(request).length > 16000) throw new Error('Solicitud no válida.');
  const data = data_();
  const student = auth_(request.code, data);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('El registro está ocupado. Reintentá en unos segundos.');
  try {
    const props = PropertiesService.getScriptProperties();
    const state = readState_(props, student.key, data.parts.length);
    const now = Date.now();
    if (expire_(state, data, now)) writeState_(props, student.key, state);
    const action = request.action || 'status';
    if (!['status', 'start', 'save', 'submit'].includes(action)) throw new Error('Acción no válida.');
    if (action !== 'status') {
      const i = request.part;
      if (!Number.isInteger(i) || i < 0 || i >= data.parts.length) throw new Error('Parte no válida.');
      let a = state.parts[i];
      if (action === 'start' && !a) {
        if (now < Date.parse(data.opens)) throw new Error('Se habilita el 28/09 a las 18:00 (Argentina).');
        if (now >= Date.parse(data.closes)) throw new Error('El horario de evaluación terminó a las 22:00.');
        if (i > 0 && (!state.parts[i - 1] || !state.parts[i - 1].submittedAt)) throw new Error('Primero entregá la parte anterior.');
        a = { startedAt: now, deadline: Math.min(now + data.parts[i].minutes * 60000, Date.parse(data.closes)), answers: {}, revision: 0 };
        state.parts[i] = a;
      } else if (action === 'save' || action === 'submit') {
        if (!a) throw new Error('Primero iniciá esta parte.');
        if (!a.submittedAt) {
          if (request.revision !== a.revision) throw new Error('CONFLICT: Hay una versión más reciente. Volvé a ingresar para recuperarla. Usá una sola pestaña.');
          const answers = request.answers;
          if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new Error('Respuestas no válidas.');
          const clean = {};
          data.parts[i].questions.forEach(q => {
            const v = answers[q.id];
            if (typeof v === 'string' && v.length <= 120 && (q.type === 'short' || (q.options || []).includes(v))) clean[q.id] = v;
          });
          a.answers = clean; a.revision++;
          if (action === 'submit') { a.submittedAt = now; a.reason = 'entrega'; }
        }
      }
      writeState_(props, student.key, state);
    }
    return view_(state, data, student.name, now);
  } finally { lock.releaseLock(); }
}
// El PIN se verifica en el servidor y nunca forma parte de la página pública.
function teacherReport(pin) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Registro ocupado. Reintentá.');
  try {
    const props = PropertiesService.getScriptProperties(), now = Date.now();
    let guard = JSON.parse(props.getProperty('teacherGuard') || '{}');
    if (guard.failures >= 5 && guard.until > now) throw new Error('Acceso temporalmente bloqueado. Reintentá en 15 minutos.');
    if (!guard.until || guard.until <= now) guard = { failures: 0, until: now + 900000 };
    const data = data_();
    if (!data.teacherHash || hash_(String(pin || '')) !== data.teacherHash) {
      guard.failures++;
      props.setProperty('teacherGuard', JSON.stringify(guard));
      throw new Error('Código docente incorrecto.');
    }
    props.setProperty('teacherGuard', '{}');
    return { generatedAt: now, students: Object.keys(data.students).map(hash => {
      const key = 'attempt:' + data.id + ':' + hash;
      const state = readState_(props, key, data.parts.length);
      expire_(state, data, now); writeState_(props, key, state);
      const v = view_(state, data, data.students[hash], now);
      return { name: v.name, parts: v.parts.map(p => ({ title: p.title, status: p.status, result: p.result || null })), total: v.total };
    }) };
  } finally { lock.releaseLock(); }
}
// Ejecutar solo desde el editor: genera un informe privado sin publicar códigos.
function informeDocente_() {
  const data = data_(), props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
  const rows = [['Estudiante','M1','M2','M3','M4','Total','Estado']];
  Object.keys(data.students).forEach(hash => {
    const key = 'attempt:' + data.id + ':' + hash;
    const state = readState_(props, key, data.parts.length);
    expire_(state, data, Date.now()); writeState_(props, key, state);
    const v = view_(state, data, data.students[hash], Date.now());
    rows.push([v.name].concat(v.parts.map(p => p.result ? p.result.percent.toFixed(2) + '% ' + (p.result.passed ? 'Aprobado' : 'No aprobado') : p.status))
      .concat([v.total.percent.toFixed(2) + '%', v.total.passed ? 'Aprobado integral' : (v.total.complete ? 'No aprobado integral' : 'Incompleto')]));
  });
  const text = rows.map(r => r.join('\t')).join('\n');
  const file = DriveApp.createFile('Resultados privados LH 28-09-2026.txt', text, MimeType.PLAIN_TEXT);
  console.log(file.getUrl());
  } finally { lock.releaseLock(); }
}
