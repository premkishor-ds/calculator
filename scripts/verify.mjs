/**
 * Smoke-test core functionality after responsive/refactor changes.
 * Run: node scripts/verify.mjs [baseUrl]
 */

const BASE = process.argv[2] || 'http://localhost:3000';
let passed = 0;
let failed = 0;

function ok(label) {
  passed++;
  console.log(`  ✓ ${label}`);
}

function fail(label, err) {
  failed++;
  console.error(`  ✗ ${label}: ${err}`);
}

function assert(cond, label, detail = '') {
  if (cond) ok(label);
  else fail(label, detail || 'assertion failed');
}

// ── 1. Calculator logic (mirrors src/utils/calculations.ts) ───
console.log('\n[Calculator]');
try {
  function calculateScenario(initialLumpsum, startSip, stepUpPct, cagrPct, years, inflationPct = 6) {
    const months = years * 12;
    const monthlyRate = Math.pow(1 + cagrPct, 1 / 12) - 1;
    const monthlyInflation = Math.pow(1 + inflationPct / 100, 1 / 12) - 1;
    let balance = initialLumpsum;
    let currentSip = startSip;
    const results = [];
    for (let m = 1; m <= months; m++) {
      if (m > 1 && (m - 1) % 12 === 0) currentSip = currentSip * (1 + stepUpPct);
      const openingBalance = balance;
      const interest = (openingBalance + currentSip) * monthlyRate;
      balance = openingBalance + currentSip + interest;
      const inflationFactor = Math.pow(1 + monthlyInflation, m);
      results.push({ month: m, sip: currentSip, closingBalance: balance, inflationAdjusted: balance / inflationFactor });
    }
    return results;
  }

  function getSummary(results, totalInvested) {
    const finalCorpus = results[results.length - 1]?.closingBalance || 0;
    const inflationAdjustedFinal = results[results.length - 1]?.inflationAdjusted || 0;
    const gains = Math.max(0, finalCorpus - totalInvested);
    return { finalCorpus, inflationAdjustedFinal, postTaxCorpus: finalCorpus - gains * 0.125 };
  }

  const ledger = calculateScenario(0, 30000, 0.2, 0.25, 12, 6);
  assert(ledger.length === 144, '12 years => 144 months', `got ${ledger.length}`);
  assert(ledger[0].sip === 30000, 'first month SIP is start amount');
  assert(ledger[11].sip === 30000, 'month 12 SIP unchanged before step-up');
  assert(ledger[12].sip === 36000, 'month 13 SIP stepped up 20%', `got ${ledger[12].sip}`);
  assert(ledger[143].closingBalance > ledger[0].closingBalance, 'corpus grows over time');

  const invested = ledger.reduce((a, r) => a + r.sip, 0);
  const summary = getSummary(ledger, invested);
  assert(summary.finalCorpus > invested, 'final corpus exceeds invested');
  assert(summary.postTaxCorpus < summary.finalCorpus, 'post-tax below nominal');
  assert(summary.inflationAdjustedFinal < summary.finalCorpus, 'inflation-adjusted below nominal');
  assert(new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(100000).includes('₹'), 'INR formatter works');
} catch (e) {
  fail('calculator suite', e.message);
}

// ── 2. HTTP routes ────────────────────────────────────────────
console.log('\n[Routes]');
const pages = ['/', '/about', '/faq', '/blog', '/watchlist', '/chart', '/watchlist/INFY.NS'];
for (const path of pages) {
  try {
    const res = await fetch(`${BASE}${path}`, { redirect: 'follow' });
    assert(res.status === 200, `GET ${path} => 200`, `got ${res.status}`);
    const html = await res.text();
    assert(html.includes('<!DOCTYPE html') || html.includes('<html'), `${path} returns HTML`);
  } catch (e) {
    fail(`GET ${path}`, e.message);
  }
}

// ── 3. Watchlist API ──────────────────────────────────────────
console.log('\n[Watchlist API]');
try {
  const res = await fetch(`${BASE}/api/watchlist?symbols=INFY.NS,TCS.NS`);
  assert(res.status === 200, 'batch quotes => 200');
  const data = await res.json();
  assert(Array.isArray(data), 'returns array');
  assert(data.length >= 1, 'at least one quote', `length=${data.length}`);
  const q = data[0];
  assert(typeof q.symbol === 'string' && q.symbol.length > 0, 'quote has symbol');
  assert(typeof q.price === 'number' && q.price > 0, 'quote has price', JSON.stringify(q));
  assert(typeof q.name === 'string', 'quote has name');
  assert(typeof q.changePercent === 'number', 'quote has changePercent');
} catch (e) {
  fail('watchlist batch API', e.message);
}

// ── 4. Stock detail API ───────────────────────────────────────
console.log('\n[Stock Detail API]');
try {
  const res = await fetch(`${BASE}/api/watchlist/INFY.NS`);
  assert(res.status === 200, 'detail => 200');
  const data = await res.json();
  assert(data.ratios?.symbol === 'INFY.NS', 'ratios.symbol correct', data.ratios?.symbol);
  assert(Array.isArray(data.profitLoss), 'has profitLoss array');
  assert(Array.isArray(data.peers), 'has peers array');
  assert(Array.isArray(data.chartData), 'has chartData array');
  assert(Array.isArray(data.pros) && Array.isArray(data.cons), 'has pros/cons');
} catch (e) {
  fail('stock detail API', e.message);
}

// ── 5. Chart API ──────────────────────────────────────────────
console.log('\n[Chart API]');
for (const range of ['1d', '1w', '1m', '1y']) {
  try {
    const res = await fetch(`${BASE}/api/watchlist/CGPOWER.NS/chart?range=${range}`);
    assert(res.status === 200, `chart range=${range} => 200`, `got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.points), `chart ${range} has points`);
    if (data.points.length > 0) {
      const p = data.points[0];
      assert(typeof p.close === 'number', `chart ${range} point has close`);
      assert(typeof p.time === 'number', `chart ${range} point has time`);
    }
  } catch (e) {
    fail(`chart range=${range}`, e.message);
  }
}

// ── 6. Invalid symbol graceful handling ───────────────────────
console.log('\n[Edge cases]');
try {
  const res = await fetch(`${BASE}/api/watchlist?symbols=INVALIDTICKER999.NS`);
  assert(res.status === 200, 'invalid symbol => 200 empty (not 500)');
  const data = await res.json();
  assert(Array.isArray(data) && data.length === 0, 'invalid symbol => empty array');
} catch (e) {
  fail('invalid symbol handling', e.message);
}

// ── Summary ───────────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`);
console.log(`Passed: ${passed}  Failed: ${failed}`);
if (failed > 0) process.exit(1);
console.log('All functionality checks passed.\n');
