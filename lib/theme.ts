'use client';
import { useSyncExternalStore } from 'react';
export type Theme = 'light' | 'dark';
const changeEvent = 'fly-em-theme-change';
const storageKey = 'fly-em-theme';
export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.classList.toggle('light', theme === 'light');
  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    /* Preference still works without storage. */
  }
  window.dispatchEvent(new Event(changeEvent));
}
function subscribe(notify: () => void) {
  const sync = (e: StorageEvent) => {
    if (
      e.key === storageKey &&
      (e.newValue === 'light' || e.newValue === 'dark')
    )
      setTheme(e.newValue);
  };
  window.addEventListener(changeEvent, notify);
  window.addEventListener('storage', sync);
  return () => {
    window.removeEventListener(changeEvent, notify);
    window.removeEventListener('storage', sync);
  };
}
const snapshot = (): Theme =>
  document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
const serverSnapshot = (): Theme => 'light';
export const useTheme = () =>
  useSyncExternalStore(subscribe, snapshot, serverSnapshot);
const lightColors: Record<string, string> = {
  '#bee780': '#477032',
  '#80d1ce': '#187875',
  '#edae7c': '#a85f32',
  '#b8bcff': '#6656a3',
  '#e7bbde': '#9e518b',
  '#f6d783': '#956b15',
  '#e9d99b': '#8d7427',
  '#d1a5de': '#8b5096',
  '#d9eccc': '#526f3b',
  '#c2e699': '#477032',
  '#304136': '#d5cebc',
  '#314535': '#d5cebc',
  '#586c5e': '#9b9e89',
  '#6e8775': '#7d886f',
  '#c1cda7': '#57673c',
  '#e5f5bc': '#466725',
  '#879d8f': '#6b7b69',
  '#8eae91': '#658264',
  '#18271d': '#e9ead8',
  '#172729': '#e3ebe3',
  '#e0f8ad': '#436726',
  '#f5f8e9': '#233b2a',
  '#ffffed': '#233b2a',
  '#8fa096': '#657260',
  '#b6c8bc': '#4b634c',
  '#819b86': '#667b57',
  '#8da696': '#6a805b',
  '#6e907c': '#667b57',
  '#f2f6e7': '#384b45',
  '#f1f5d7': '#384b45',
  '#ffffff': '#263c2b',
  '#fff': '#263c2b',
};
export function themeColor(color: string, theme: Theme) {
  if (theme === 'dark') return color;
  const base = color.slice(0, 7).toLowerCase(),
    alpha = color.length === 9 ? color.slice(7) : '';
  return (lightColors[base] ?? base) + alpha;
}
