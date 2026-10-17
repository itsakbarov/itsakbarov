#!/usr/bin/env node
// Draws every day since the first contribution as one line, wound clockwise
// from the centre: one turn per calendar year (12 o'clock = 1 January), line
// weight = that day's contributions. Writes record-dark.svg and record-light.svg.
//
//   GITHUB_TOKEN=… node scripts/press.mjs --out dist
//   node scripts/press.mjs --data record.json --today 2026-10-17 --out dist
//
// Node 20+, no dependencies.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { values: opt } = parseArgs({
  options: {
    user: { type: 'string', default: 'itsakbarov' },
    name: { type: 'string', default: 'Sardor Akbarov' },
    role: { type: 'string', default: 'Software engineer, Tashkent' },
    tz: { type: 'string', default: 'Asia/Tashkent' },
    out: { type: 'string', default: 'dist' },
    data: { type: 'string' }, // read a saved record instead of calling the API
    save: { type: 'string' }, // keep the fetched record for offline renders
    today: { type: 'string' },
    smooth: { type: 'string', default: '1.8' }, // gaussian smoothing of daily weight, in days
  },
});

// Plate
const W = 880, H = 440, CX = W / 2, CY = H / 2;
const INSET = 24;
const R_START = 6; // radius of 1 January in the first year
const R_LIMIT = 182; // outer edge of the last turn, weight included
const HAIRLINE = 0.8; // weight of a day without contributions
const FULL = 0.62; // heaviest weight, as a share of the gap between turns
const HEAD = 4; // radius of the head, which rides just ahead of the line
const GAP = 3; // clear space between the end of the line and the head, px

// Timeline, seconds
const HOLD = 0.4; // needle drop
const CUT = 3.4; // first day → today
const END = HOLD + CUT;
const RING = 3.2; // period of the ring that marks today
const SAMPLES = 360;

const THEMES = {
  dark: { line: '#e6edf3', note: '#7d8590', strong: '#e6edf3', signal: '#39d353' },
  light: { line: '#1f2328', note: '#656d76', strong: '#1f2328', signal: '#216e39' },
};

const today = opt.today ?? new Intl.DateTimeFormat('en-CA', { timeZone: opt.tz }).format(new Date());
const record = opt.data ? JSON.parse(await readFile(opt.data, 'utf8')) : await fetchRecord(opt.user, today);
if (opt.save) await writeFile(opt.save, JSON.stringify(record));

const days = record.days.filter((d) => d.date <= today);
const firstActive = days.findIndex((d) => d.count > 0);
if (firstActive < 0) throw new Error(`No contributions found for ${opt.user}.`);
const line = days.slice(firstActive);

// Where each day sits, in turns since 1 January of the first year
const year0 = Number(line[0].date.slice(0, 4));
const turnsAt = (date) => {
  const y = Number(date.slice(0, 4));
  const from = Date.UTC(y, 0, 1), to = Date.UTC(y + 1, 0, 1);
  return y - year0 + (Date.parse(`${date}T12:00:00Z`) - from) / (to - from);
};
const turns = line.map((d) => turnsAt(d.date));
const first = turns[0], last = turns.at(-1);
const pitch = (R_LIMIT - R_START) / (last + FULL / 2);
const radius = (t) => R_START + pitch * t;
const point = (r, t) => [CX + r * Math.sin(2 * Math.PI * t), CY - r * Math.cos(2 * Math.PI * t)];

// Weight: square root of the day's count, full at the 98th percentile of active days
const counts = line.map((d) => d.count);
const active = counts.filter((c) => c > 0).sort((a, b) => a - b);
const cap = active[Math.min(active.length - 1, Math.floor(active.length * 0.98))];
const level = smooth(counts.map((c) => Math.sqrt(Math.min(c, cap) / cap)), Number(opt.smooth));
const weight = level.map((v) => HAIRLINE + (pitch * FULL - HAIRLINE) * v);

const outer = turns.map((t, i) => point(radius(t) + weight[i] / 2, t));
const inner = turns.map((t, i) => point(radius(t) - weight[i] / 2, t));
// The line ends in a round cap, like a pen lifting off the paper
const capR = weight.at(-1) / 2;
const ribbon = `${pathData(outer)}A${capR.toFixed(2)} ${capR.toFixed(2)} 0 0 1 ${pathData(inner.reverse()).slice(1)}z`;

// Spine: the line's centre, sampled every ~2.5px, for the reveal mask
const CAP = capR + 1.5;
const spineEnd = last + CAP / (2 * Math.PI * radius(last));
const spine = [];
for (let t = first - 2 / 365; t < spineEnd; t += 2.5 / (2 * Math.PI * radius(t))) spine.push(t);
spine.push(spineEnd);
const spinePts = spine.map((t) => quantize(point(radius(t), t)));
const spineLen = [0];
for (let i = 1; i < spinePts.length; i++) {
  spineLen.push(spineLen[i - 1] + Math.hypot(spinePts[i][0] - spinePts[i - 1][0], spinePts[i][1] - spinePts[i - 1][1]));
}
const total = spineLen.at(-1);
const lengthAt = (t) => {
  let lo = 0, hi = spine.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; spine[mid] <= t ? (lo = mid) : (hi = mid); }
  return spineLen[lo] + ((spineLen[hi] - spineLen[lo]) * (t - spine[lo])) / (spine[hi] - spine[lo]);
};
const turnAt = (len) => {
  if (len >= total) return spineEnd + (len - total) / (2 * Math.PI * radius(spineEnd));
  let lo = 0, hi = spine.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; spineLen[mid] <= len ? (lo = mid) : (hi = mid); }
  return spine[lo] + ((spine[hi] - spine[lo]) * (len - spineLen[lo])) / (spineLen[hi] - spineLen[lo]);
};
// Revealed length at a moment in the cut; the cap grows in so the needle drop starts clean
const front = (t) => Math.min(total, lengthAt(t) + (CAP * (t - first)) / (last - first));

// Motion: the head spins up, holds a constant angular speed (one year per
// revolution, like a lathe), then brakes into today.
const ease = velocityEase(0.1, 0.22);
const frames = [{ pct: 0, t: first }];
for (let i = 0; i <= SAMPLES; i++) {
  const s = i / SAMPLES;
  frames.push({ pct: ((HOLD + CUT * s) / END) * 100, t: first + (last - first) * ease(s) });
}
const timeOf = (t) => {
  const target = (t - first) / (last - first);
  let lo = 0, hi = 1;
  for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; ease(mid) < target ? (lo = mid) : (hi = mid); }
  return HOLD + CUT * lo;
};

// Year labels sit on the line at 12 o'clock, like contour labels on a map
const years = [];
for (let y = year0 + 1; y - year0 < last; y++) {
  if (y - year0 <= first) continue;
  const [x, yy] = point(radius(y - year0), y - year0);
  years.push({ label: String(y), x, y: yy, at: timeOf(y - year0) });
}

const sum = counts.reduce((a, b) => a + b, 0);
const share = record.restricted ? record.restricted / sum : 0;
const headAt = (len) => { const t = turnAt(len + GAP + HEAD); return point(radius(t), t); };
const [hx, hy] = headAt(total);
const facts = {
  since: line[0].date,
  today: line.at(-1).date,
  total: sum.toLocaleString('en-US'),
  private: share >= 0.5 ? `${Math.floor(share * 1000) / 10}% PRIVATE` : '',
};

await mkdir(opt.out, { recursive: true });
for (const [name, theme] of Object.entries(THEMES)) {
  await writeFile(join(opt.out, `record-${name}.svg`), plate(theme));
}
console.log(
  `pressed ${line.length} days (${facts.since} → ${facts.today}), ${facts.total} contributions,`,
  `pitch ${pitch.toFixed(1)}px, full weight at ${cap}/day → ${opt.out}/record-{dark,light}.svg`,
);

function plate(c) {
  const f = (n) => +n.toFixed(2);
  const cut = frames.map((k) => `${f(k.pct)}%{stroke-dashoffset:${f(total - front(k.t))}}`).join('');
  const head = frames
    .map((k) => { const [x, y] = headAt(front(k.t)); return `${f(k.pct)}%{transform:translate(${f(x)}px,${f(y)}px)}`; })
    .join('');
  const label = (x, y, text, cls, anchor = 'start', extra = '') =>
    `<text x="${f(x)}" y="${f(y)}" text-anchor="${anchor}" class="${cls}"${extra}>${escape(text.toUpperCase())}</text>`;
  const knock = years
    .map((y) => `<rect x="${f(y.x - 15)}" y="${f(y.y - 6)}" width="30" height="12" fill="#000"/>`)
    .join('');
  const marks = years
    .map((y) => label(y.x, y.y + 3.2, y.label, 'yr stamp', 'middle', ` style="animation-delay:${f(y.at)}s"`))
    .join('');
  const L = f(total);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title">
<title id="title">${escape(opt.name)}: every day since ${facts.since} as one line, one turn per year, weight = contributions that day. Drawn ${facts.today}.</title>
<!-- generated by scripts/press.mjs, do not edit -->
<style>
text{font:10px ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;letter-spacing:.08em;fill:${c.note}}
.strong{fill:${c.strong}}.yr{font-size:9px;letter-spacing:.04em}
.cut{stroke-dasharray:${L} ${L};animation:cut ${END}s linear both}
.head{animation:head ${END}s linear both}
.stamp{animation:stamp 1ms both}
.ring{opacity:0;transform-box:fill-box;transform-origin:center;animation:ring ${RING}s cubic-bezier(.2,.7,.3,1) ${END}s infinite}
@keyframes cut{${cut}}
@keyframes head{${head}}
@keyframes stamp{from{opacity:0}}
@keyframes ring{0%{opacity:.8;transform:scale(1)}45%,100%{opacity:0;transform:scale(4.6)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<mask id="reveal" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
<path class="cut" d="${pathData(spinePts)}" fill="none" stroke="#fff" stroke-width="${f(pitch)}"/>${knock}
</mask>
<path d="${ribbon}" fill="${c.line}" mask="url(#reveal)"/>
${marks}
${label(INSET, INSET + 8, opt.name, 'strong')}
${label(INSET, INSET + 22, opt.role)}
${label(W - INSET, INSET + 8, 'One line', '', 'end')}
${label(W - INSET, INSET + 22, `${facts.since} → today`, '', 'end')}
${label(INSET, H - INSET - 14, "One turn = one year, 12 o'clock = 1 Jan")}
${label(INSET, H - INSET, 'Weight = contributions that day')}
<text x="${W - INSET}" y="${H - INSET - 14}" text-anchor="end" class="stamp" style="animation-delay:${END}s"><tspan fill="${c.signal}">TODAY</tspan> ${facts.today}</text>
${label(W - INSET, H - INSET, [facts.total + ' contributions', facts.private].filter(Boolean).join(', '), '', 'end')}
<circle class="ring" cx="${f(hx)}" cy="${f(hy)}" r="${HEAD}" fill="none" stroke="${c.signal}" stroke-width="1" vector-effect="non-scaling-stroke"/>
<g class="head" transform="translate(${f(hx)} ${f(hy)})"><circle r="${HEAD}" fill="${c.signal}"/></g>
</svg>
`;
}

async function fetchRecord(login, until) {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!token) throw new Error('Set GITHUB_TOKEN, or pass --data record.json.');
  const gql = async (query, variables) => {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { authorization: `bearer ${token}`, 'content-type': 'application/json', 'user-agent': 'press.mjs' },
      body: JSON.stringify({ query, variables }),
    });
    const body = await res.json();
    if (!res.ok || body.errors) throw new Error(`GitHub GraphQL: ${JSON.stringify(body.errors ?? body)}`);
    return body.data.user.contributionsCollection;
  };

  const { contributionYears } = await gql(
    'query($login:String!){user(login:$login){contributionsCollection{contributionYears}}}',
    { login },
  );
  const days = [];
  let restricted = 0;
  for (const year of [...contributionYears].sort()) {
    const c = await gql(
      `query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){
        restrictedContributionsCount contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}`,
      { login, from: `${year}-01-01T00:00:00Z`, to: `${year}-12-31T23:59:59Z` },
    );
    restricted += c.restrictedContributionsCount;
    for (const week of c.contributionCalendar.weeks) {
      for (const d of week.contributionDays) {
        if (d.date.startsWith(`${year}-`) && d.date <= until) days.push({ date: d.date, count: d.contributionCount });
      }
    }
  }
  days.sort((a, b) => (a.date < b.date ? -1 : 1));
  return { days, restricted };
}

// Spin-up and brake with a flat top: integrates a trapezoidal velocity profile.
function velocityEase(rise, fall) {
  const n = 4000;
  const step = (x) => x * x * (3 - 2 * x);
  const v = (s) => (s < rise ? step(s / rise) : s > 1 - fall ? step((1 - s) / fall) : 1);
  const area = [0];
  for (let i = 1; i <= n; i++) area.push(area[i - 1] + v((i - 0.5) / n) / n);
  return (s) => {
    const x = Math.min(n, Math.max(0, s * n)), i = Math.min(n - 1, Math.floor(x));
    return (area[i] + (area[i + 1] - area[i]) * (x - i)) / area[n];
  };
}

function smooth(values, sigma) {
  if (!sigma) return values;
  const reach = Math.ceil(sigma * 3);
  const kernel = Array.from({ length: reach * 2 + 1 }, (_, i) => Math.exp(-((i - reach) ** 2) / (2 * sigma * sigma)));
  return values.map((_, i) => {
    let sum = 0, norm = 0;
    kernel.forEach((k, j) => {
      const v = values[i + j - reach];
      if (v !== undefined) { sum += v * k; norm += k; }
    });
    return sum / norm;
  });
}

function quantize([x, y]) {
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

// Compact path: absolute move, then relative lines on a 0.1px grid (no drift)
function pathData(points) {
  const n = (q) => (q / 10).toFixed(1).replace(/\.0$/, '').replace(/^(-?)0\./, '$1.');
  let d = '', px = 0, py = 0;
  points.forEach(([x, y], i) => {
    const qx = Math.round(x * 10), qy = Math.round(y * 10);
    if (i === 0) d += `M${n(qx)} ${n(qy)}`;
    else if (qx !== px || qy !== py) { const dy = n(qy - py); d += `l${n(qx - px)}${dy.startsWith('-') ? '' : ' '}${dy}`; }
    px = qx; py = qy;
  });
  return d;
}

function escape(s) {
  return s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
}
