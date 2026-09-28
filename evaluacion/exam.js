/* La clave de corrección nunca se descarga antes de entregar cada parte. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let code = '', state = null, active = -1, answers = {}, revision = 0, offset = 0;
  let busy = false, dirty = false, autoRetryAt = 0, saveDelay;
  const el = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };
  const message = text => { $('message').textContent = text; };
  function confirmAction(text) {
    const dialog = $('confirm-dialog'); $('confirm-text').textContent = text; dialog.returnValue = 'cancel';
    return new Promise(resolve => { dialog.addEventListener('close', () => resolve(dialog.returnValue === 'accept'), { once: true }); dialog.showModal(); });
  }
  const cacheKey = () => 'lh-exam-20260928:' + code + ':' + active;
  function localSave() {
    try { localStorage.setItem(cacheKey(), JSON.stringify({ answers, revision, dirty })); }
    catch { message('No se pudo guardar la copia local. Mantené esta página abierta y verificá el guardado en el registro.'); }
  }
  function call(action, payload = {}) {
    return new Promise((resolve, reject) => {
      if (!(window.google && google.script && google.script.run)) {
        reject(new Error('Entrá desde el acceso habilitado al examen. Esta página es la interfaz de instalación.')); return;
      }
      google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).exam({ code, action, ...payload });
    });
  }
  function syncTime(s) { offset = s.now - Date.now(); }
  function remaining() { return Math.max(0, (state?.parts[active]?.deadline || 0) - Date.now() - offset); }
  function percent(n) { return n.toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' %'; }
  function render(s) {
    state = s; syncTime(s); $('login').hidden = true; $('dashboard').hidden = false;
    $('student-name').textContent = s.name; $('parts').replaceChildren();
    s.parts.forEach((p, i) => {
      const card = el('article', null, 'card'); card.append(el('h3', p.title), el('p', `${p.count} preguntas · ${p.minutes} minutos`));
      if (p.result) { card.append(el('p', `${percent(p.result.percent)} · ${p.result.passed ? 'Aprobado' : 'No aprobado'}`, p.result.passed ? 'good' : 'bad')); }
      const labels = { ready: 'Comenzar', locked: 'Parte anterior pendiente', active: 'Continuar', submitted: 'Ver devolución' };
      const b = el('button', labels[p.status]);
      b.disabled = p.status === 'locked' || (p.status === 'ready' && (s.now < s.opens || s.now >= s.closes));
      b.onclick = () => p.status === 'submitted' ? showReview(i) : begin(i); card.append(b); $('parts').append(card);
    });
    $('overall').replaceChildren(el('h2', s.total.complete ? 'Resultado integral' : 'Tu recorrido'));
    $('overall').append(el('p', s.total.complete ? `${s.total.points}/${s.total.max} puntos · ${percent(s.total.percent)} · ${s.total.passed ? 'Aprobado integral' : 'No aprobado integral'}` : 'Avanzá en orden. Cada parte requiere al menos 70 %; una parte desaprobada no se compensa con otra.'));
    if (s.total.complete && !s.total.passed) $('overall').append(el('p', 'Revisá las devoluciones de las partes pendientes de aprobación. Podés realizar igualmente el trabajo práctico, que tendrá otra nota.'));
    if (s.now < s.opens) message('El examen se habilita el 28/09/2026 a las 13:10, hora argentina. Volvé a ingresar a partir de ese horario.');
    if (s.now >= s.closes && !s.total.complete) message('El horario del examen terminó. Las partes no iniciadas quedan pendientes; consultá al docente.');
    const current = s.parts.findIndex(p => p.status === 'active');
    if (current >= 0) showQuestions(current); else { active = -1; $('exam').hidden = true; }
    $('practical').hidden = !s.practical;
    if (s.practical) {
      $('practical').replaceChildren(el('h2', s.practical.title), el('p', s.practical.intro), el('p', s.practical.deadline, 'deadline'));
      s.practical.sections.forEach(section => { $('practical').append(el('h3', section.title)); const list = el('ol'); section.items.forEach(item => list.append(el('li', item))); $('practical').append(list); });
      const b = el('button', 'Descargar consigna y resultados'); b.onclick = download; $('practical').append(b);
    }
  }
  function showQuestions(i) {
    active = i; const p = state.parts[i]; answers = { ...p.answers }; revision = p.revision; dirty = false;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey()) || 'null');
      if (cached?.dirty && cached.revision === revision) { answers = cached.answers; dirty = true; }
    } catch { /* La copia central sigue disponible. */ }
    $('exam').hidden = false; $('part-title').textContent = p.title; $('questions').replaceChildren();
    p.questions.forEach((q, index) => {
      const field = el('fieldset'); field.append(el('legend', `${index + 1}. ${q.prompt}`), el('p', q.topic, 'topic'));
      if (q.type === 'short') {
        const label = el('label', 'Respuesta breve'); const input = el('input'); input.type = 'text'; input.id = q.id; input.maxLength = 120; input.autocomplete = 'off'; input.spellcheck = false;
        input.value = answers[q.id] || ''; label.htmlFor = q.id;
        input.oninput = () => change(q.id, input.value); field.append(label, input);
      } else q.options.forEach(option => {
        const label = el('label', null, 'option'), input = el('input'); input.type = 'radio'; input.name = q.id; input.value = option; input.checked = answers[q.id] === option;
        input.onchange = () => change(q.id, option); label.append(input, el('span', option)); field.append(label);
      });
      $('questions').append(field);
    });
    $('save-status').textContent = dirty ? 'Recuperamos respuestas locales pendientes de guardar.' : 'Respuestas recuperadas del registro.'; tick();
  }
  function change(id, value) { answers[id] = value; dirty = true; localSave(); $('save-status').textContent = 'Cambios pendientes de guardar…'; clearTimeout(saveDelay); saveDelay = setTimeout(() => save(), 700); }
  async function begin(i) {
    if (busy) return;
    if (state.parts[i].status === 'ready' && !await confirmAction(`Vas a comenzar ${state.parts[i].title}. Tendrás hasta ${state.parts[i].minutes} minutos, con cierre máximo a las 17:20. El reloj no se detiene al salir. ¿Comenzar?`)) return;
    busy = true; message('');
    try { render(await call('start', { part: i })); $('exam').scrollIntoView({ behavior: 'smooth' }); }
    catch (err) { message(err.message || String(err)); } finally { busy = false; }
  }
  async function save(submit = false) {
    if (busy || active < 0 || (!dirty && !submit)) return;
    busy = true; const i = active, sentAnswers = { ...answers }, sentRevision = revision;
    try {
      const s = await call(submit ? 'submit' : 'save', { part: i, answers: sentAnswers, revision: sentRevision });
      syncTime(s);
      if (s.parts[i].status === 'submitted') {
        try { localStorage.removeItem(cacheKey()); } catch { /* Sin almacenamiento local. */ }
        dirty = false; render(s); showReview(i); message('Parte entregada y corregida.');
      } else {
        state = s; revision = s.parts[i].revision; dirty = JSON.stringify(answers) !== JSON.stringify(sentAnswers); localSave();
        $('save-status').textContent = dirty ? 'Hay cambios nuevos por guardar…' : 'Guardado en el registro · ' + new Date().toLocaleTimeString('es-AR');
      }
    } catch (err) {
      const text = err.message || String(err);
      message(text.includes('CONFLICT:') ? text : 'No llegó la confirmación del registro. Tu copia local sigue disponible. Reconectate antes del vencimiento y reintentá.');
      $('save-status').textContent = 'Guardado central pendiente.';
      if (text.includes('CONFLICT:')) { $('questions').querySelectorAll('input').forEach(e => { e.disabled = true; }); active = -1; }
      autoRetryAt = Date.now() + 10000;
    } finally { busy = false; }
  }
  function showReview(i) {
    const p = state.parts[i]; $('review').hidden = false; $('review').replaceChildren(el('h2', 'Devolución · ' + p.title));
    $('review').append(el('p', `${p.result.points}/${p.result.max} puntos · ${percent(p.result.percent)} · ${p.result.passed ? 'Aprobado' : 'No aprobado'}`));
    p.result.review.forEach(q => {
      const item = el('article', null, 'review-item'); item.append(el('h3', q.prompt), el('p', q.ok ? 'Correcta' : 'A revisar', q.ok ? 'good' : 'bad'), el('p', 'Tu respuesta: ' + (q.answer || 'Sin responder')), el('p', 'Respuesta esperada: ' + q.correct), el('p', q.feedback));
      const a = el('a', 'Volver a la clase'); a.href = q.source; a.target = '_blank'; a.rel = 'noopener'; item.append(a); $('review').append(item);
    }); $('review').scrollIntoView({ behavior: 'smooth' });
  }
  function tick() {
    if (active < 0) return;
    const ms = remaining(), seconds = Math.ceil(ms / 1000);
    $('timer').textContent = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    if (!ms) { $('questions').querySelectorAll('input').forEach(e => { e.disabled = true; }); $('submit').disabled = true; if (Date.now() >= autoRetryAt) save(true); }
    else $('submit').disabled = busy;
  }
  function download() {
    const lines = [state.name, 'Evaluación integradora · 28/09/2026'];
    state.parts.forEach(p => { lines.push('', p.title, `${p.result.points}/${p.result.max} · ${percent(p.result.percent)} · ${p.result.passed ? 'Aprobado' : 'No aprobado'}`); p.result.review.filter(q => !q.ok).forEach(q => lines.push('Revisar: ' + q.topic + ' — ' + q.feedback)); });
    lines.push('', 'Total: ' + percent(state.total.percent), state.total.passed ? 'Aprobado integral' : 'No aprobado integral', '', state.practical.title, state.practical.intro, state.practical.deadline);
    state.practical.sections.forEach(s => lines.push('', s.title, ...s.items));
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })); const a = el('a'); a.href = url; a.download = 'consigna_y_resultados_lh.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('login-form').onsubmit = async e => {
    e.preventDefault(); if (busy) return; busy = true;
    code = $('code').value.toUpperCase().replace(/[\s-]/g, '');
    try { message(''); render(await call('status')); }
    catch (err) { message(err.message || String(err)); } finally { busy = false; }
  };
  $('logout').onclick = async () => {
    if (busy) return; if (dirty) await save(); if (dirty && !await confirmAction('Hay respuestas sin confirmar en el registro. ¿Salir de todos modos?')) return;
    code = ''; state = null; active = -1; answers = {}; dirty = false; $('code').value = ''; $('login').hidden = false;
    ['dashboard','exam','review','practical'].forEach(id => { $(id).hidden = true; $(id).querySelectorAll('input').forEach(e => { e.value = ''; }); }); message('');
  };
  $('submit').onclick = async () => { if (!busy && await confirmAction('¿Entregar esta parte? Después no podrás cambiar sus respuestas.')) save(true); };
  ['copy','cut','paste','contextmenu','drop'].forEach(event => $('questions').addEventListener(event, e => e.preventDefault()));
  window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.addEventListener('online', () => save(remaining() === 0 && active >= 0));
  setInterval(tick, 1000); setInterval(() => { if (Date.now() >= autoRetryAt) save(); }, 5000);
})();
