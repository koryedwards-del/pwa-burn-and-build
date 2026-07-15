const mealSources = document.querySelectorAll('[data-meal-source]');
const dropZones = document.querySelectorAll('[data-drop-zone]');

mealSources.forEach((card) => {
  card.addEventListener('dragstart', (event) => {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/x-meal-html', card.innerHTML);
    card.classList.add('card--dragging');
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('card--dragging');
  });
});

dropZones.forEach((zone) => {
  zone.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    zone.classList.add('drop-zone--over');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('drop-zone--over');
  });

  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    zone.classList.remove('drop-zone--over');

    const html = event.dataTransfer.getData('application/x-meal-html');
    if (!html) return;

    zone.classList.remove('card--empty');
    zone.classList.add('card--meal');
    zone.innerHTML = html;
    zone.removeAttribute('data-drop-zone');
  });
});
