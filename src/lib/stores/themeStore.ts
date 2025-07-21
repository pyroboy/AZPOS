import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function createThemeStore() {
  const { subscribe, set } = writable<'light' | 'dark' | 'system'>('system');

  function applyTheme(theme: 'light' | 'dark' | 'system') {
    if (!browser) return;

    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
      localStorage.removeItem('theme');
    } else {
      root.classList.add(theme);
      localStorage.setItem('theme', theme);
    }
    set(theme);
  }

  if (browser) {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    applyTheme(savedTheme || 'system');
  }

  return {
    subscribe,
    set: applyTheme,
  };
}

export const theme = createThemeStore();
