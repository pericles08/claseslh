(() => {
  const url = window.LH_EXAM_URL;
  if (typeof url !== 'string' || !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) return;
  const button = document.getElementById('enter');
  button.href = url; button.hidden = false;
  document.getElementById('activation').textContent = 'Ingresá con el código entregado por el docente. Las respuestas se habilitan dentro del horario de evaluación indicado.';
})();
