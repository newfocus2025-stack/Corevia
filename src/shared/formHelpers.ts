import type React from 'react';

function focusField(inputs: HTMLElement[], idx: number, dir: 1 | -1) {
  const next = inputs[idx + dir];
  if (next) { next.focus(); if (next instanceof HTMLInputElement && next.type !== 'date') next.select(); }
}

export function focusNextInput(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== 'Enter' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const target = e.currentTarget as HTMLElement;
  // <select> uses native ENTER to open/close dropdown; auto-advance happens via initSelectAutoAdvance
  if (target instanceof HTMLSelectElement) return;
  const container = target.closest('form, main');
  if (!container) return;
  const inputs = Array.from(container.querySelectorAll<HTMLElement>('input, select, button'));
  const idx = inputs.indexOf(target);
  if (idx < 0) return;

  if (e.key === 'Enter') {
    if (target instanceof HTMLButtonElement) return;
    e.preventDefault();
    if (idx < inputs.length - 1) {
      focusField(inputs, idx, 1);
    } else {
      const submitBtn = container.querySelector<HTMLElement>('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    }
  } else {
    e.preventDefault();
    if (e.key === 'ArrowDown' && idx < inputs.length - 1) focusField(inputs, idx, 1);
    if (e.key === 'ArrowUp' && idx > 0) focusField(inputs, idx, -1);
  }
}

export function clearZeroOnFocus(e: React.FocusEvent<HTMLInputElement>) {
  if (Number(e.target.value) === 0) e.target.value = '';
}

export function initSelectAutoAdvance() {
  document.addEventListener('change', (e) => {
    const sel = e.target;
    if (!(sel instanceof HTMLSelectElement)) return;
    const container = sel.closest('.expense-form, form, main');
    if (!container) return;
    const inputs = Array.from(container.querySelectorAll<HTMLElement>('input, select, button'));
    const idx = inputs.indexOf(sel);
    if (idx < 0 || idx >= inputs.length - 1) return;
    requestAnimationFrame(() => {
      const next = inputs[idx + 1];
      if (next && next !== document.activeElement) {
        next.focus();
        if (next instanceof HTMLInputElement && next.type !== 'date') next.select();
      }
    });
  }, true);
}
