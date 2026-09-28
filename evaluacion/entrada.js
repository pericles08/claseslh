(() => {
  const url = window.LH_EXAM_URL;
  if (typeof url !== 'string' || !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) return;
  const button = document.getElementById('enter');
  button.href = url; button.hidden = false;
  document.getElementById('activation').textContent = 'El código se ingresa en el registro del examen. Las partes se habilitan el 28/09 a las 13:10.';
})();
