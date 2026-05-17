import { escapeHtml } from '../../utils/dom.js';
import { getQuizHistory } from '../../lib/progress.js';

export function renderHistoryPage(detail) {
  const items = getQuizHistory();
  if (!items.length) {
    detail.innerHTML = `
      <article class="page page-history-empty page--history-mode">
        <div class="history-empty">
          <h2 class="page-title">Istorija pokušaja</h2>
          <p class="page-meta">Još nema sačuvanih rezultata. Završite vežbu u nekoj podoblasti — poslednji rezultat se čuva lokalno na ovom uređaju.</p>
          <p class="history-empty__action"><a href="/" class="soft-empty__link">Na početnu</a></p>
        </div>
      </article>`;
    return;
  }

  const rows = items
    .map((e) => {
      const when = new Date(e.ts).toLocaleString('sr-Latn-RS', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
      const sub = escapeHtml(e.subtopicName || e.subtopicId || '');
      const top = escapeHtml(e.topicName || '');
      return `<tr class="history-table__row">
        <td class="history-table__cell history-table__cell--time">${escapeHtml(when)}</td>
        <td class="history-table__cell">${top}</td>
        <td class="history-table__cell">${sub}</td>
        <td class="history-table__cell history-table__cell--score"><span class="history-pct${e.pct >= 80 ? ' history-pct--pass' : ''}">${e.pct}%</span></td>
        <td class="history-table__cell history-table__cell--detail">${e.correct}/${e.total}</td>
      </tr>`;
    })
    .join('');

  detail.innerHTML = `
    <article class="page page-history page--history-mode">
      <h2 class="page-title">Istorija pokušaja</h2>
      <p class="page-meta">Poslednjih ${items.length} pokušaja (samo na ovom uređaju).</p>
      <div class="history-table-wrap">
        <table class="history-table">
          <thead>
            <tr>
              <th scope="col">Vreme</th>
              <th scope="col">Tema</th>
              <th scope="col">Podoblast</th>
              <th scope="col">Rezultat</th>
              <th scope="col">Tačno / ukupno</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </article>`;
}
