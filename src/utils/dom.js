export function getTopicDisplayName(topic, compact = true) {
  if (!topic) return '';
  return compact && topic.nameShort ? topic.nameShort : topic.name;
}

export function escapeHtml(s) {
  const el = document.createElement('div');
  el.textContent = s ?? '';
  return el.innerHTML;
}

const RAW = Symbol('html-raw');

export function html(strings, ...values) {
  return strings.reduce((acc, str, i) => {
    if (i >= values.length) return acc + str;
    const v = values[i];
    if (v != null && typeof v === 'object' && RAW in v) return acc + str + v[RAW];
    return acc + str + escapeHtml(v != null ? String(v) : '');
  }, '');
}

html.raw = (x) => ({ [RAW]: x });
