/* Comportamiento compartido. Sin dependencias y sin estilos embebidos. */
(() => {
  'use strict';

  const settings = {
    clase5: { prefix: 'clase5-lan-v1:', title: 'SESIÓN 5 - INTRODUCCIÓN A LAS ESPECIFICACIONES LAN', filename: 'respuestas_clase5_lan.txt' },
    clase6: { prefix: 'clase6-osi-v1:', title: 'CLASE 6 - EL MODELO OSI Y LAS REDES LAN', filename: 'respuestas_clase6_osi.txt' },
    clase7: { prefix: 'clase7-lan-v1:', title: 'CLASE 7 - PROFUNDIZACIÓN, COMPARACIÓN Y APLICACIONES LAN', filename: 'respuestas_clase7_lan.txt' },
    clase11: { prefix: 'cmd-redes-windows-v1:', title: 'COMANDOS DE RED, DIAGNÓSTICO Y MANTENIMIENTO EN WINDOWS', filename: 'respuestas_cmd_redes.txt' },
    clase12: { prefix: 'clase12-ip-v2:', title: 'CLASE 12 - DIRECCIONAMIENTO IP, SUBREDES Y ENRUTAMIENTO', filename: 'respuestas_clase12_ip.txt' },
    clase13: { prefix: 'clase13-dispositivos-v1:', title: 'CLASE 13 - DISPOSITIVOS DE RED: HUB, SWITCH Y ROUTER', filename: 'respuestas_clase13_dispositivos_red.txt' },
    clase14: { prefix: 'clase14-dominios-v1:', title: 'CLASE 14 - DOMINIO DE COLISIÓN Y DOMINIO DE BROADCAST', filename: 'respuestas_clase14_dominios.txt' },
    clase15: { prefix: 'clase15-segmentacion-v1:', title: 'CLASE 15 - SEGMENTACIÓN DE REDES', filename: 'respuestas_clase15_segmentacion.txt' }
  };
  const config = settings[document.body.dataset.page];
  if (!config) return;

  const tasks = Array.from(document.querySelectorAll('[data-task]'));
  const responses = Array.from(document.querySelectorAll('[data-response]'));
  const modules = Array.from(document.querySelectorAll('.module'));
  const progress = document.getElementById('progressFill');
  const progressLabel = document.getElementById('progressLabel');
  const search = document.getElementById('searchInput');
  const noResults = document.getElementById('noResults');
  let storageWarning = null;

  // El navegador puede bloquear el almacenamiento o agotar su cuota.
  // La edición, búsqueda y exportación siguen funcionando en ese caso.
  function storage(method, key, value) {
    try {
      return window.localStorage[method](config.prefix + key, value);
    } catch {
      if (!storageWarning) {
        storageWarning = document.createElement('p');
        storageWarning.className = 'storage-warning';
        storageWarning.setAttribute('role', 'status');
        storageWarning.textContent = 'No se pudo guardar en este navegador. Exportá tus respuestas antes de cerrar la página.';
        document.querySelector('.toolbar-wrap')?.append(storageWarning);
      }
      return null;
    }
  }

  function updateProgress() {
    const completed = tasks.filter(task => task.checked).length;
    if (progress) progress.value = tasks.length ? completed / tasks.length * 100 : 0;
    if (progressLabel) progressLabel.textContent = `${completed} de ${tasks.length} actividades completadas`;
  }

  tasks.forEach(task => {
    task.checked = storage('getItem', `task:${task.id}`) === 'true';
    task.addEventListener('change', () => {
      storage('setItem', `task:${task.id}`, String(task.checked));
      updateProgress();
    });
  });
  responses.forEach(area => {
    const key = `response:${area.dataset.response}`;
    const saved = storage('getItem', key);
    if (saved !== null) area.value = saved;
    area.addEventListener('input', () => storage('setItem', key, area.value));
  });

  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  const searchable = modules.map(module => ({ module, text: normalize(`${module.dataset.search || ''} ${module.textContent}`) }));
  function filterModules() {
    const query = normalize(search?.value.trim() || '');
    let visible = 0;
    searchable.forEach(({ module, text }) => {
      module.hidden = Boolean(query) && !text.includes(query);
      if (!module.hidden) visible++;
    });
    if (noResults) noResults.hidden = visible > 0;
  }
  search?.addEventListener('input', filterModules);
  // Un enlace del índice lateral nunca debe apuntar a una sección filtrada.
  document.querySelectorAll('.sidebar a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => {
      if (search) search.value = '';
      filterModules();
    });
  });

  document.getElementById('printBtn')?.addEventListener('click', () => window.print());
  document.getElementById('resetBtn')?.addEventListener('click', () => {
    if (!window.confirm('¿Querés borrar el progreso y las respuestas guardadas en este navegador?')) return;
    tasks.forEach(task => {
      task.checked = false;
      storage('removeItem', `task:${task.id}`);
    });
    responses.forEach(area => {
      area.value = '';
      storage('removeItem', `response:${area.dataset.response}`);
    });
    updateProgress();
  });

  document.getElementById('exportBtn')?.addEventListener('click', () => {
    const lines = [config.title, 'Respuestas y registro de actividades', `Fecha: ${new Date().toLocaleString('es-AR')}`, ''];
    responses.forEach(area => {
      const activity = area.closest('.activity');
      const title = activity?.querySelector('label')?.innerText || area.dataset.response;
      const completed = activity?.querySelector('[data-task]')?.checked;
      lines.push(title, `Estado: ${completed ? 'Completada' : 'Pendiente'}`, area.value.trim() || '[Sin respuesta]', '', '------------------------------------------------------------', '');
    });
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = config.filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  document.querySelectorAll('.command-block').forEach(block => {
    const code = block.querySelector('code');
    if (!code) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-btn';
    button.textContent = 'Copiar';
    button.setAttribute('aria-label', 'Copiar comando');
    button.setAttribute('aria-live', 'polite');
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.innerText);
        button.textContent = 'Copiado';
      } catch {
        const range = document.createRange();
        range.selectNodeContents(code);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        button.textContent = 'Seleccionado: Ctrl+C';
      }
      window.setTimeout(() => { button.textContent = 'Copiar'; }, 1800);
    });
    block.append(button);
  });

  // Imprimir incluye módulos filtrados, soluciones desplegables y respuestas completas.
  let printDetails = [];
  let printing = false;
  window.addEventListener('beforeprint', () => {
    if (printing) return;
    printing = true;
    printDetails = Array.from(document.querySelectorAll('details:not([open])'));
    printDetails.forEach(detail => { detail.open = true; });
    responses.forEach(area => {
      const output = document.createElement('div');
      output.className = 'print-response';
      output.textContent = area.value || area.placeholder;
      area.after(output);
      area.classList.add('print-replaced');
    });
  });
  window.addEventListener('afterprint', () => {
    printing = false;
    printDetails.forEach(detail => { detail.open = false; });
    document.querySelectorAll('.print-response').forEach(output => output.remove());
    responses.forEach(area => area.classList.remove('print-replaced'));
  });
  updateProgress();
})();
