// Current-year month positions around the existing spiral, without changing it.
export function renderCalendarGuides(today, theme) {
  const year = Number(today.slice(0, 4));
  const start = Date.UTC(year, 0, 1), end = Date.UTC(year + 1, 0, 1);
  const names = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const guides = [
    '<!-- calendar-guides:start -->',
    `<style>.calendar-label{font-size:8px;letter-spacing:.13em;fill:${theme.note}}</style>`,
    `<g aria-hidden="true" fill="none" stroke="${theme.note}" stroke-width=".6">`,
    '<circle cx="440" cy="220" r="195" stroke-opacity=".16"/>',
  ];
  names.forEach((name, month) => {
    const angle = ((Date.UTC(year, month, 1) - start) / (end - start)) * Math.PI * 2;
    const major = month % 3 === 0;
    const point = (radius) => [440 + radius * Math.sin(angle), 220 - radius * Math.cos(angle)];
    const [x1, y1] = point(195), [x2, y2] = point(major ? 202 : 199);
    guides.push(`<path d="M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}" stroke-opacity="${major ? '.68' : '.35'}"/>`);
    if (major) {
      const [x, y] = point(213);
      guides.push(`<text x="${x.toFixed(2)}" y="${(y + 3).toFixed(2)}" text-anchor="middle" stroke="none" class="calendar-label">${name}</text>`);
    }
  });
  guides.push('</g>', '<!-- calendar-guides:end -->');
  return guides.join('\n');
}
