/* js/dashboard.js — Dashboard rendering, charts, summaries */

const Dashboard = {
  charts: {},
  period: 'all',

  /* ── Init ───────────────────────────────── */
  init() {
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.period = btn.dataset.period;
        this.renderStats();
      });
    });
  },

  /* ── Full render (called after data load) ─ */
  render() {
    this.renderStats();
    this.renderEquityCurve();
    this.renderSummaries();
    this.renderPairChart();
    this.renderSessionChart();
    this.renderDirectionChart();
    this.updateHeaderBalance();
  },

  /* ── Stat Cards ─────────────────────────── */
  renderStats() {
    const filtered = Utils.filterByPeriod(STATE.trades, this.period);
    const s = Utils.calcStats(filtered);

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    const setClass = (id, cls) => {
      const el = document.getElementById(id);
      if (el) { el.className = 'stat-value'; if (cls) el.classList.add(cls); }
    };

    if (!s) {
      ['stat-winrate','stat-pf','stat-pnl','stat-trades','stat-avgrr','stat-best'].forEach(id => set(id, '—'));
      ['stat-winrate-sub','stat-pf-sub','stat-pnl-sub','stat-trades-sub','stat-avgrr-sub','stat-best-sub'].forEach(id => set(id, ''));
      return;
    }

    set('stat-winrate', Utils.fmtPct(s.winRate));
    set('stat-winrate-sub', `${s.wins}W / ${s.losses}L`);

    set('stat-pf', s.pf === Infinity ? '∞' : s.pf.toFixed(2));
    set('stat-pf-sub', `GW ${Utils.fmtUSD(s.grossWin, false)} / GL ${Utils.fmtUSD(s.grossLoss, false)}`);

    setClass('stat-pnl', s.netPnL >= 0 ? 'green' : 'red');
    set('stat-pnl', Utils.fmtUSD(s.netPnL));
    set('stat-pnl-sub', s.netPnL >= 0 ? 'Profitable period' : 'Negative period');

    set('stat-trades', s.total);
    set('stat-trades-sub', this.period === 'all' ? 'All time' : this.period);

    set('stat-avgrr', s.avgRR > 0 ? s.avgRR.toFixed(2) + 'R' : '—');
    set('stat-avgrr-sub', 'On winning trades');

    set('stat-best', s.bestTrade > 0 ? '+$' + s.bestTrade.toFixed(2) : '—');
    set('stat-best-sub', s.worstTrade < 0 ? 'Worst: $' + s.worstTrade.toFixed(2) : '');
  },

  /* ── Equity Curve ───────────────────────── */
  renderEquityCurve() {
    const canvas = document.getElementById('chart-equity');
    if (!canvas) return;

    // Build chronological event list: trades + account transactions
    const trades  = [...STATE.trades].sort((a, b) =>
      (a.Date + (a.Time || '00:00')).localeCompare(b.Date + (b.Time || '00:00'))
    );
    const account = STATE.account;

    // Starting point
    const initialEntry = account.find(a => a.Type === 'Initial');
    let balance = initialEntry ? (parseFloat(initialEntry.Amount) || 0) : 0;

    const labels  = ['Start'];
    const values  = [parseFloat(balance.toFixed(2))];
    const colors  = ['#00d4aa'];
    const tooltipLabels = ['Starting balance'];

    // Merge non-initial account events and trades, sorted by date
    const events = [];
    trades.forEach(t => events.push({
      dateKey: t.Date + (t.Time || '00:00'),
      type: 'trade', payload: t
    }));
    account.filter(a => a.Type !== 'Initial').forEach(a => events.push({
      dateKey: a.Date + '00:00',
      type: 'txn', payload: a
    }));
    events.sort((a, b) => a.dateKey.localeCompare(b.dateKey));

    events.forEach(ev => {
      if (ev.type === 'trade') {
        const t   = ev.payload;
        const pnl = Utils.tradePnL(t);
        balance  += pnl;
        labels.push(t.Date);
        values.push(parseFloat(balance.toFixed(2)));
        colors.push(pnl >= 0 ? '#00c896' : '#ff4757');
        tooltipLabels.push(`${t.Pair} ${t.Result} — ${Utils.fmtUSD(pnl)}`);
      } else {
        const a   = ev.payload;
        const amt = parseFloat(a.Amount) || 0;
        balance  += a.Type === 'Deposit' ? amt : -amt;
        labels.push(a.Date);
        values.push(parseFloat(balance.toFixed(2)));
        colors.push('#7c6af7');
        tooltipLabels.push(`${a.Type}: ${Utils.fmtUSD(amt, false)}`);
      }
    });

    // Equity tags
    const subtitleEl = document.getElementById('equity-subtitle');
    if (subtitleEl) subtitleEl.textContent = `Current: $${balance.toFixed(2)}`;

    const tagsEl = document.getElementById('equity-tags');
    if (tagsEl && STATE.account.find(a => a.Type === 'Initial')) {
      const initial  = parseFloat(initialEntry.Amount) || 0;
      const growth   = initial > 0 ? ((balance - initial) / initial) : 0;
      const growthCls = growth >= 0 ? 'etag-green' : 'etag-red';
      tagsEl.innerHTML = `<span class="etag ${growthCls}">${growth >= 0 ? '+' : ''}${(growth * 100).toFixed(2)}%</span>`;
    }

    this.updateHeaderBalance(balance);

    // Destroy previous
    if (this.charts.equity) { this.charts.equity.destroy(); }

    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 280);
    grad.addColorStop(0, 'rgba(0,212,170,.28)');
    grad.addColorStop(1, 'rgba(0,212,170,0)');

    this.charts.equity = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Balance ($)',
          data: values,
          borderColor: '#00d4aa',
          backgroundColor: grad,
          borderWidth: 2,
          pointBackgroundColor: colors,
          pointRadius: values.length <= 40 ? 4 : 0,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1c2035',
            borderColor: '#2e3550',
            borderWidth: 1,
            titleColor: '#dde3f0',
            bodyColor: '#7a8499',
            padding: 10,
            callbacks: {
              title: (items) => tooltipLabels[items[0].dataIndex] || items[0].label,
              label: (item) => ' Balance: $' + item.parsed.y.toFixed(2)
            }
          }
        },
        scales: {
          x: { display: false },
          y: {
            grid: { color: '#252b42' },
            ticks: {
              color: '#7a8499', font: { size: 11 },
              callback: v => '$' + v.toLocaleString()
            }
          }
        }
      }
    });
  },

  /* ── Header Balance ─────────────────────── */
  updateHeaderBalance(balance) {
    const el = document.getElementById('header-balance');
    if (!el) return;
    if (balance !== undefined) {
      el.textContent = '$' + balance.toFixed(2);
      return;
    }
    // Recompute from state
    const account = STATE.account;
    const trades  = STATE.trades;
    const initial = account.find(a => a.Type === 'Initial');
    let b = initial ? (parseFloat(initial.Amount) || 0) : 0;
    account.filter(a => a.Type !== 'Initial').forEach(a => {
      b += a.Type === 'Deposit' ? (parseFloat(a.Amount) || 0) : -(parseFloat(a.Amount) || 0);
    });
    trades.forEach(t => { b += Utils.tradePnL(t); });
    el.textContent = '$' + b.toFixed(2);
  },

  /* ── Period Summaries ───────────────────── */
  renderSummaries() {
    const defs = [
      { id: 'summary-daily',   period: 'daily' },
      { id: 'summary-weekly',  period: 'weekly' },
      { id: 'summary-monthly', period: 'monthly' },
    ];
    defs.forEach(({ id, period }) => {
      const filtered = Utils.filterByPeriod(STATE.trades, period);
      const el = document.getElementById(id);
      if (!el) return;
      const body = el.querySelector('.summary-body');
      const s    = Utils.calcStats(filtered);
      if (!s) {
        body.innerHTML = '<span class="dim">No trades</span>';
        return;
      }
      const pClass = s.netPnL >= 0 ? 'pos' : 'neg';
      body.innerHTML = `
        <div class="sum-row"><span class="sum-key">Trades</span><span class="sum-val">${s.total}</span></div>
        <div class="sum-row"><span class="sum-key">W / L</span><span class="sum-val">${s.wins}W / ${s.losses}L</span></div>
        <div class="sum-row"><span class="sum-key">Win Rate</span><span class="sum-val">${Utils.fmtPct(s.winRate)}</span></div>
        <div class="sum-row"><span class="sum-key">Net P&amp;L</span><span class="sum-val ${pClass}">${Utils.fmtUSD(s.netPnL)}</span></div>
        <div class="sum-row"><span class="sum-key">Profit Factor</span><span class="sum-val">${s.pf === Infinity ? '∞' : s.pf.toFixed(2)}</span></div>
      `;
    });
  },

  /* ── Pair Bar Chart ─────────────────────── */
  renderPairChart() {
    const canvas = document.getElementById('chart-pairs');
    if (!canvas) return;
    if (this.charts.pairs) this.charts.pairs.destroy();

    const pairs = APP.PAIRS;
    const data  = pairs.map(p => {
      const pt   = STATE.trades.filter(t => t.Pair === p);
      const wins = pt.filter(t => t.Result === 'Win').length;
      return pt.length ? Math.round(wins / pt.length * 100) : 0;
    });
    const counts = pairs.map(p => STATE.trades.filter(t => t.Pair === p).length);

    this.charts.pairs = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: pairs,
        datasets: [{
          label: 'Win %',
          data,
          backgroundColor: ['#00d4aa','#7c6af7','#ffd32a','#4a9eff'],
          borderRadius: 5,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1c2035', borderColor: '#2e3550', borderWidth: 1,
            titleColor: '#dde3f0', bodyColor: '#7a8499',
            callbacks: {
              label: (item) => ` ${item.parsed.y}% (${counts[item.dataIndex]} trades)`
            }
          }
        },
        scales: {
          y: {
            min: 0, max: 100,
            grid: { color: '#252b42' },
            ticks: { color: '#7a8499', callback: v => v + '%', font: { size: 11 } }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#7a8499', font: { size: 11 } }
          }
        }
      }
    });
  },

  /* ── Session Doughnut Chart ─────────────── */
  renderSessionChart() {
    const canvas = document.getElementById('chart-sessions');
    if (!canvas) return;
    if (this.charts.sessions) this.charts.sessions.destroy();

    const sessions = ['London', 'NY'];
    const counts   = sessions.map(s => STATE.trades.filter(t => t.Session === s).length);
    const wins     = sessions.map(s => STATE.trades.filter(t => t.Session === s && t.Result === 'Win').length);
    const rates    = sessions.map((s, i) => counts[i] ? Math.round(wins[i] / counts[i] * 100) : 0);

    this.charts.sessions = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: sessions,
        datasets: [{
          data: counts.every(c => c === 0) ? [1, 1] : counts,
          backgroundColor: ['#7c6af7', '#00d4aa'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#7a8499', padding: 14, font: { size: 11 } }
          },
          tooltip: {
            backgroundColor: '#1c2035', borderColor: '#2e3550', borderWidth: 1,
            titleColor: '#dde3f0', bodyColor: '#7a8499',
            callbacks: {
              label: (item) => ` ${item.label}: ${item.parsed} trades (${rates[item.dataIndex]}% WR)`
            }
          }
        }
      }
    });
  },

  /* ── Direction Doughnut ─────────────────── */
  renderDirectionChart() {
    const canvas = document.getElementById('chart-direction');
    if (!canvas) return;
    if (this.charts.direction) this.charts.direction.destroy();

    const buys  = STATE.trades.filter(t => t.Direction === 'Buy').length;
    const sells = STATE.trades.filter(t => t.Direction === 'Sell').length;
    const buyWR  = buys  ? Math.round(STATE.trades.filter(t => t.Direction === 'Buy'  && t.Result === 'Win').length / buys  * 100) : 0;
    const sellWR = sells ? Math.round(STATE.trades.filter(t => t.Direction === 'Sell' && t.Result === 'Win').length / sells * 100) : 0;

    this.charts.direction = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Buy', 'Sell'],
        datasets: [{
          data: buys === 0 && sells === 0 ? [1, 1] : [buys, sells],
          backgroundColor: ['#00c896', '#ff4757'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#7a8499', padding: 14, font: { size: 11 } }
          },
          tooltip: {
            backgroundColor: '#1c2035', borderColor: '#2e3550', borderWidth: 1,
            titleColor: '#dde3f0', bodyColor: '#7a8499',
            callbacks: {
              label: (item) => {
                const wr = item.label === 'Buy' ? buyWR : sellWR;
                return ` ${item.label}: ${item.parsed} trades (${wr}% WR)`;
              }
            }
          }
        }
      }
    });
  }
};
