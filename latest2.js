const $ = id => document.getElementById(id);
const KEY = 'secd-v2';
const n = (v, d = 2) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const PRESETS = [
  ['Air Conditioner (1.5 ton)', 1500, 6], ['Ceiling Fan', 75, 10], ['Water Geyser', 2000, 1.5],
  ['Microwave Oven', 1200, 0.5], ['Washing Machine', 500, 1], ['Submersible Water Pump', 750, 1],
  ['Desert Air Cooler', 180, 8], ['Electric Iron', 1000, 0.5], ['Wi-Fi Router', 12, 24]
];

const SAMPLE = {
  tariff: 8, factor: 0.675, last: 420, budget: 250,
  setFrom: 22, setTo: 24, oldW: 60, ledW: 9, bulbs: 6, bulbH: 6,
  sbW: 3, sbN: 6, sbH: 18, solarKw: 2, solarYield: 4,
  items: [
    { name: 'Air Conditioner (1.5 ton)', w: 1500, h: 6, q: 1 },
    { name: 'Ceiling Fan', w: 75, h: 10, q: 3 },
    { name: 'Refrigerator', w: 150, h: 8, q: 1 },
    { name: 'LED Bulb', w: 9, h: 6, q: 6 },
    { name: 'Television', w: 100, h: 4, q: 1 },
    { name: 'Washing Machine', w: 500, h: 1, q: 1 },
    { name: 'Water Geyser', w: 2000, h: 0.5, q: 1 },
    { name: 'Wi-Fi Router', w: 12, h: 24, q: 1 }
  ]
};

const clone = o => JSON.parse(JSON.stringify(o));
let S = load();

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.items)) return Object.assign(clone(SAMPLE), d);
  } catch (e) {}
  return clone(SAMPLE);
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

function renderTable() {
  $('tbody').innerHTML = S.items.map((a, i) =>
    `<tr data-i="${i}">
      <td><input data-f="name" value="${esc(a.name)}"></td>
      <td><input data-f="w" type="number" min="0" value="${a.w}"></td>
      <td><input data-f="h" type="number" min="0" max="24" step="0.1" value="${a.h}"></td>
      <td><input data-f="q" type="number" min="0" value="${a.q}"></td>
      <td class="kd"></td><td class="km"></td><td class="kc"></td>
      <td><button class="x" data-del="${i}" aria-label="Remove appliance">✕</button></td>
    </tr>`).join('');
}

function calc() {
  const f = S.factor, t = S.tariff, rows = $('tbody').rows;

  const D = S.items.map((a, i) => {
    const d = a.w * a.h * a.q / 1000, m = d * 30, r = rows[i];
    r.querySelector('.kd').textContent = n(d);
    r.querySelector('.km').textContent = n(m);
    r.querySelector('.kc').textContent = n(m * f);
    return { name: a.name, d, m };
  });

  const kwh = D.reduce((s, a) => s + a.m, 0), co2 = kwh * f, bill = kwh * t;
  const ratio = S.budget > 0 ? co2 / S.budget : 2;

  $('tw').textContent = n(S.items.reduce((s, a) => s + a.w * a.q, 0), 0) + ' W';
  $('td').textContent = n(kwh / 30);
  $('tm').textContent = n(kwh);
  $('tc').textContent = n(co2);

  $('kwh').textContent = n(kwh);
  $('kwhNote').textContent = n(kwh / 30) + ' kWh daily average';
  $('bill').textContent = '₹' + n(bill);
  $('billNote').textContent = 'at ₹' + n(t) + ' per unit';
  $('co2').textContent = n(co2);
  $('co2Note').textContent = n(co2 * 12, 0) + ' kg a year, about ' + n(co2 * 12 / 22, 0) + ' trees to offset (~22 kg per tree per year)';

  const sc = Math.max(0, Math.min(100, Math.round(150 - 100 * ratio)));
  $('score').textContent = sc + ' / 100';
  $('scoreNote').textContent = sc >= 75 ? 'Excellent' : sc >= 50 ? 'Within budget' : sc >= 25 ? 'Over budget' : 'Very high';

  const pct = ratio * 100, fill = $('fill');
  fill.style.width = Math.min(100, pct) + '%';
  fill.className = pct <= 90 ? 'ok' : pct <= 100 ? 'warn' : 'bad';
  $('goalMsg').textContent = co2 <= S.budget
    ? `On track: ${n(co2)} kg of your ${n(S.budget)} kg budget used (${n(pct, 0)}%). ${n(S.budget - co2)} kg to spare.`
    : `Over budget by ${n(co2 - S.budget)} kg (${n(pct - 100, 0)}% above your ${n(S.budget)} kg target).`;
  const df = kwh - S.last;
  $('cmpMsg').textContent = S.last > 0
    ? `This month's estimate is ${n(Math.abs(df))} kWh (${n(Math.abs(df) / S.last * 100, 1)}%) ${df >= 0 ? 'higher' : 'lower'} than last month's ${n(S.last, 0)} kWh.` : '';

  const top = [...D].sort((a, b) => b.m - a.m);
  $('share').innerHTML = top.map(a => {
    const p = kwh ? a.m / kwh * 100 : 0;
    return `<div class="row"><span>${esc(a.name)}</span><div class="bar"><i style="width:${p}%"></i></div><b>${n(p, 1)}%</b></div>`;
  }).join('');

  const ac = D.filter(a => /\b(ac|a\/c)\b|air.?cond/i.test(a.name)).reduce((s, a) => s + a.m, 0);
  const acPct = Math.min(24, Math.max(0, (S.setTo - S.setFrom) * 6));
  const s1 = ac * acPct / 100;
  const s2 = Math.max(0, S.oldW - S.ledW) * S.bulbs * S.bulbH * 30 / 1000;
  const s3 = S.sbW * S.sbN * S.sbH * 30 / 1000;
  const line = s => `Saves ${n(s)} kWh, ₹${n(s * t)} and ${n(s * f)} kg CO₂ per month.`;
  $('t1').textContent = (ac ? `AC in your inventory: ${n(ac)} kWh a month. ` : 'No AC found in your inventory. ') + line(s1);
  $('t2').textContent = line(s2);
  $('t3').textContent = line(s3);
  const sv = s1 + s2 + s3;
  $('tipTotal').textContent = `First three tips together: ${line(sv)} That is ${n(kwh ? sv / kwh * 100 : 0, 1)}% of your footprint.`;

  const gen = S.solarKw * S.solarYield * 30, off = Math.min(gen, kwh);
  $('t4').textContent = `Generates about ${n(gen)} kWh a month, covering ${n(kwh ? gen / kwh * 100 : 0, 0)}% of your use. Avoids ${n(off * f)} kg CO₂ and saves ₹${n(off * t)} per month.`;

  const I = [];
  if (top.length && kwh) I.push(`Biggest load: ${top[0].name} uses ${n(top[0].m / kwh * 100, 0)}% of your energy (${n(top[0].m)} kWh a month). Start there.`);
  I.push(co2 > S.budget
    ? `To meet your CO₂ budget, cut about ${n((co2 - S.budget) / f, 0)} kWh a month.${sv * f >= co2 - S.budget ? ' The first three tips below can cover it.' : ''}`
    : 'You are within your carbon budget. Keep checking it every month.');
  I.push(`After the first three tips your footprint would be about ${n(Math.max(0, co2 - sv * f))} kg CO₂ a month.`);
  $('insights').innerHTML = I.map(x => `<li>${esc(x)}</li>`).join('');

  save();
}

document.addEventListener('input', e => {
  const el = e.target;
  if (el.classList.contains('f')) {
    S[el.id] = parseFloat(el.value) || 0;
    calc();
  } else if (el.dataset.f) {
    const i = el.closest('tr').dataset.i, k = el.dataset.f;
    S.items[i][k] = k === 'name' ? el.value : (parseFloat(el.value) || 0);
    calc();
  }
});

$('tbody').addEventListener('click', e => {
  const d = e.target.dataset.del;
  if (d !== undefined) { S.items.splice(+d, 1); renderTable(); calc(); }
});

$('add').onclick = () => {
  const p = PRESETS[$('preset').value];
  S.items.push(p ? { name: p[0], w: p[1], h: p[2], q: 1 } : { name: 'New appliance', w: 100, h: 1, q: 1 });
  renderTable(); calc();
};

$('reset').onclick = () => { S = clone(SAMPLE); init(); };

function init() {
  Object.keys(SAMPLE).forEach(k => { if (k !== 'items' && $(k)) $(k).value = S[k]; });
  $('preset').innerHTML = '<option value="">Custom appliance</option>' +
    PRESETS.map((p, i) => `<option value="${i}">${p[0]} (${p[1]} W, ${p[2]} h)</option>`).join('');
  renderTable();
  calc();
}
init();
