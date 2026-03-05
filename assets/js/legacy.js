/* assets/js/legacy.js */
(() => {
  "use strict";

  // Gera o formato antigo: window.coursesData[unit][modality] = [{nome,turno}]
  // Sem quebrar o app novo.
  if (!window.COURSES) return;

  const { catalog, offers } = window.COURSES;
  const legacy = Object.create(null);

  for (const [unitKey, unitObj] of Object.entries(offers)) {
    legacy[unitKey] = Object.create(null);
    for (const [modalityKey, list] of Object.entries(unitObj)) {
      const rows = [];
      for (const item of list) {
        const name = catalog[item.id]?.name || item.id;
        for (const turno of item.turnos || []) rows.push({ nome: name, turno });
      }
      legacy[unitKey][modalityKey] = rows;
    }
  }

  window.coursesData = legacy;
})();
