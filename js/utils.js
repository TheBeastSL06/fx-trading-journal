/* js/utils.js — Helpers, stats, formatting */

const Utils = {

  /* ── ID generation ──────────────────────── */
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  /* ── Date helpers ───────────────────────── */
  today() {
    return new Date().toISOString().split('T')[0];
  },

  nowTime() {
    return new Date().toTimeString().slice(0, 5);
  },

  parseLocalDate(str) {
    // Parse YYYY-MM-DD without timezone shift
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  },

  startOfWeek() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    // Monday as start of week
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return d;
  },

  startOfMonth() {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  /* ── Formatting ─────────────────────────── */
  fmtUSD(n, signed = true) {
    const abs = Math.abs(n);
    const str = '$' + abs.toFixed(2);
    if (!signed) return str;
    if (n > 0) return '+' + str;
    if (n < 0) return '-' + str;
    return str;
  },

  fmtPct(ratio) {
    return (ratio * 100).toFixed(1) + '%';
  },

  /* ── Trade P&L in USD ───────────────────── */
  tradePnL(trade) {
    const result = trade.Result;
    if (result === 'Win')       return  parseFloat(trade.RewardUSD) || 0;
    if (result === 'Loss')      return -(parseFloat(trade.RiskUSD)  || 0);
    if (result === 'Breakeven') return  0;
    return 0;
  },

  /* ── Statistics engine ──────────────────── */
  calcStats(trades) {
    if (!trades || trades.length === 0) return null;

    const wins      = trades.filter(t => t.Result === 'Win');
    const losses    = trades.filter(t => t.Result === 'Loss');
    const total     = trades.length;
    const winRate   = total > 0 ? wins.length / total : 0;

    const grossWin  = wins.reduce((s, t) => s + (parseFloat(t.RewardUSD) || 0), 0);
    const grossLoss = losses.reduce((s, t) => s + (parseFloat(t.RiskUSD)  || 0), 0);
    const pf        = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0);
    const netPnL    = trades.reduce((s, t) => s + Utils.tradePnL(t), 0);

    // Average RR from RewardR on wins
    const rrArr  = wins.map(t => parseFloat(t.RewardR)).filter(v => v > 0);
    const avgRR  = rrArr.length ? rrArr.reduce((a, b) => a + b, 0) / rrArr.length : 0;

    const pnls      = trades.map(t => Utils.tradePnL(t));
    const bestTrade = Math.max(...pnls, 0);
    const worstTrade= Math.min(...pnls, 0);

    return {
      total, wins: wins.length, losses: losses.length,
      winRate, pf, netPnL,
      avgRR, bestTrade, worstTrade,
      grossWin, grossLoss
    };
  },

  /* ── Period filtering ───────────────────── */
  filterByPeriod(trades, period) {
    if (period === 'all') return trades;
    const todayStr = Utils.today();
    if (period === 'daily') {
      return trades.filter(t => t.Date === todayStr);
    }
    if (period === 'weekly') {
      const sw = Utils.startOfWeek();
      return trades.filter(t => Utils.parseLocalDate(t.Date) >= sw);
    }
    if (period === 'monthly') {
      const sm = Utils.startOfMonth();
      return trades.filter(t => Utils.parseLocalDate(t.Date) >= sm);
    }
    return trades;
  },

  /* ── Toast notification ─────────────────── */
  toast(msg, type = 'info', duration = 2800) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `toast show${type !== 'info' ? ' ' + type : ''}`;
    clearTimeout(Utils._toastTimer);
    Utils._toastTimer = setTimeout(() => { el.className = 'toast'; }, duration);
  }
};
