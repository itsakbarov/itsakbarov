import test from 'node:test';
import assert from 'node:assert/strict';
import { renderCalendarGuides } from './calendar.mjs';

test('month guide positions use calendar dates, including leap years', () => {
  for (const year of [2024, 2026]) {
    const svg = renderCalendarGuides(`${year}-10-17`, { note: '#7d8590' });
    const april = /<text x="([\d.]+)" y="([\d.]+)"[^>]*>APR<\/text>/.exec(svg);
    const phase = (Date.UTC(year, 3, 1) - Date.UTC(year, 0, 1)) / (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1));
    assert.ok(Math.abs(Number(april[1]) - (440 + 213 * Math.sin(phase * Math.PI * 2))) < .01);
    assert.ok(Math.abs(Number(april[2]) - (223 - 213 * Math.cos(phase * Math.PI * 2))) < .01);
  }
});

test('guide adds twelve ticks and four labels without animation or spiral masks', () => {
  const svg = renderCalendarGuides('2026-10-17', { note: '#656d76' });
  assert.equal((svg.match(/<path /g) ?? []).length, 12);
  assert.equal((svg.match(/class="calendar-label"/g) ?? []).length, 4);
  assert.match(svg, /aria-hidden="true"/);
  assert.doesNotMatch(svg, /<mask|@keyframes|class="head"/);
});
