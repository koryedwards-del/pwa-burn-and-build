/** Focus Flow — pin action dock to visible viewport (keyboard + browser chrome). */

let initialized = false;

function updateDock() {
  const vv = window.visualViewport;
  let bottom = 0;
  let height = window.innerHeight;

  if (vv) {
    bottom = Math.max(0, window.innerHeight - vv.offsetTop - vv.height);
    height = vv.height;
  }

  document.documentElement.style.setProperty('--dock-bottom', `${Math.round(bottom)}px`);
  document.documentElement.style.setProperty('--flow-height', `${Math.round(height)}px`);
}

function scrollFieldIntoView(input) {
  const stage = input.closest('.ob-stage, .focus-unlock-scroll');
  if (!stage) {
    input.scrollIntoView({ block: 'center', inline: 'nearest' });
    return;
  }

  const dock = document.querySelector('.start-site .ob-chrome-dock');
  const dockRect = dock?.getBoundingClientRect();
  const dockTop = dockRect ? dockRect.top : window.innerHeight - 80;
  const inputRect = input.getBoundingClientRect();
  const padding = 16;

  if (inputRect.bottom > dockTop - padding) {
    stage.scrollTop += inputRect.bottom - dockTop + padding;
  } else if (inputRect.top < (stage.getBoundingClientRect().top + padding)) {
    stage.scrollTop -= stage.getBoundingClientRect().top + padding - inputRect.top;
  }
}

export function syncFocusFlow() {
  updateDock();
}

export function initFocusFlow() {
  if (initialized) return;
  initialized = true;

  updateDock();
  window.visualViewport?.addEventListener('resize', updateDock);
  window.visualViewport?.addEventListener('scroll', updateDock);
  window.addEventListener('resize', updateDock);
  window.addEventListener('orientationchange', () => window.setTimeout(updateDock, 100));

  document.addEventListener('focusin', (e) => {
    const input = e.target.closest?.('input, select, textarea');
    if (!input?.closest('.start-site')) return;
    window.setTimeout(() => {
      updateDock();
      scrollFieldIntoView(input);
    }, 280);
  });
}
