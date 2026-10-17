import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateYears, renderArchive } from './archive.mjs';

const theme = { line: '#e6edf3', note: '#7d8590', strong: '#e6edf3', signal: '#39d353' };

test('annual totals count active days once and sort years newest first without mutating input', () => {
  const days = [
    { date: '2025-12-31', count: 3 },
    { date: '2026-01-02', count: 0 },
    { date: '2025-01-01', count: 12 },
    { date: '2026-01-01', count: 7 },
  ];
  const original = structuredClone(days);
  assert.deepEqual(aggregateYears(days, '2026-10-17'), [
    { year: 2026, contributions: 7, activeDays: 1, partial: true },
    { year: 2025, contributions: 15, activeDays: 2, partial: false },
  ]);
  assert.deepEqual(days, original);
});

test('the cutoff includes today and excludes later days and years', () => {
  assert.deepEqual(aggregateYears([
    { date: '2026-10-17', count: 9 },
    { date: '2026-10-18', count: 500 },
    { date: '2027-01-01', count: 1000 },
  ], '2026-10-17'), [
    { year: 2026, contributions: 9, activeDays: 1, partial: true },
  ]);
});

test('December 31 completes the current calendar year and zero days stay inactive', () => {
  assert.deepEqual(aggregateYears([
    { date: '2024-02-29', count: 2 },
    { date: '2024-12-31', count: 0 },
  ], '2024-12-31'), [
    { year: 2024, contributions: 2, activeDays: 1, partial: false },
  ]);
});

test('the SVG exposes the exact cutoff, partial year, and totals as accessible text', () => {
  const svg = renderArchive([
    { date: '2025-12-31', count: 1000 },
    { date: '2026-10-17', count: 234 },
  ], '2026-10-17', theme);
  assert.match(svg, /aria-labelledby="archive-title archive-desc"/);
  assert.match(svg, /Annual record through 2026-10-17: 1,234 contributions across 2 active days\./);
  assert.match(svg, /2026: 234 contributions, 1 active days, through 2026-10-17\./);
  assert.match(svg, /class="current">2026\*/);
  assert.match(svg, /class="year">2025<\/text>/);
  assert.match(svg, /THROUGH 2026-10-17<\/text>/);
});

test('an empty record renders a valid empty state with zero accessible totals', () => {
  assert.deepEqual(aggregateYears([], '2026-10-17'), []);
  const svg = renderArchive([], '2026-10-17', theme);
  assert.match(svg, /viewBox="0 0 640 128"/);
  assert.match(svg, /0 contributions across 0 active days/);
  assert.match(svg, /No contribution data\./);
  assert.doesNotMatch(svg, /NaN|Infinity/);
});
