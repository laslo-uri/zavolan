export const ICONS = {
  panelClose: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 6l-6 6 6 6"/><path d="M11 6l-6 6 6 6"/></svg>`,

  panelOpen: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 6l6 6-6 6"/><path d="M13 6l6 6-6 6"/></svg>`,

  allTopics: `<span class="icon-emoji" aria-hidden="true">📋</span>`,

  hideEmptyChapters: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,

  eyeOn: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,

  eyeOff: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,

  navUp: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>`,
  navDown: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`,
  navPrev: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`,
  navNext: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`,

  categories: {
    1: `<span class="icon-emoji" aria-hidden="true">🛡️</span>`,
    2: `<span class="icon-emoji" aria-hidden="true">👤</span>`,
    3: `<span class="icon-emoji" aria-hidden="true">⚙️</span>`,
    4: `<span class="icon-emoji" aria-hidden="true">🛣️</span>`,
    5: `<span class="icon-emoji" aria-hidden="true">🚗</span>`,
    6: `<span class="icon-emoji" aria-hidden="true">🛑</span>`,
    7: `<span class="icon-emoji" aria-hidden="true">👥</span>`,
    8: `<span class="icon-emoji" aria-hidden="true">🚦</span>`,
    9: `<span class="icon-emoji" aria-hidden="true">🚚</span>`,
    10: `<span class="icon-emoji" aria-hidden="true">🪪</span>`,
    11: `<span class="icon-emoji" aria-hidden="true">🚨</span>`,
    12: `<span class="icon-emoji" aria-hidden="true">🔒</span>`,
    13: `<span class="icon-emoji" aria-hidden="true">🛞</span>`,
    14: `<span class="icon-emoji" aria-hidden="true">⚖️</span>`,
  },
};

export function getCategoryIcon(topicId) {
  return ICONS.categories[String(topicId)] ?? ICONS.categories['1'];
}
