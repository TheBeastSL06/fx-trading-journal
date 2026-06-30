/* js/journal.js — Trade Log: table, filters, add/edit/delete modal */

const Journal = {

  editingId: null,

  /* ── Init ───────────────────────────────── */
  init() {
    // Open modal — add
    document.getElementById('btn-add-trade').addEventListener('click', () => this.openModal());
    document.getElementById('fab-add').addEventListener('click', () => this.openModal());

    // Close modal
    document.getElementById('btn-close-modal').addEventListener('click', () => this.closeModal());
    document.getElementById('btn-cancel-modal').addEventListener('click', () => this.closeModal());
    document.getElementById('trade-modal').addEventListener('click', (e) => {
      if (e.target.id === 'trade-modal') this.closeModal();
    });

    // Direction toggle
    document.querySelectorAll('#dir-toggle .toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#dir-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('trade-direction').value = btn.dataset.val;
      });
    });

    // Result toggle
    document.querySelectorAll('#result-toggle .result-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#result-toggle .result-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('trade-result').value = btn.dataset.val;
      });
    });

    // Save trade
    document.getElementById('btn-save-trade').addEventListener('click', () => this.saveTrade());

    // Filters
    ['filter-pair', 'filter-session', 'filter-result', 'filter-from', 'filter-to'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => this.renderTable());
    });
    document.getElementById('btn-clear-filters').addEventListener('click', () => {
      ['filter-pair', 'filter-session', 'filter-result', 'filter-from', 'filter-to'].forEach(id => {
        document.getElementById(id).value = '';
      });
      this.renderTable();
    });
  },

  /* ── Modal open/close ───────────────────── */
  openModal(trade = null) {
    this.editingId = trade ? trade.ID : null;
    document.getElementById('modal-title').textContent = trade ? 'Edit Trade' : 'Add Trade';

    document.getElementById('trade-id').value = trade ? trade.ID : '';
    document.getElementById('trade-date').value = trade ? trade.Date : Utils.today();
    document.getElementById('trade-time').value = trade ? (trade.Time || Utils.nowTime()) : Utils.nowTime();
    document.getElementById('trade-pair').value = trade ? trade.Pair : 'GBPUSD';
    document.getElementById('trade-session').value = trade ? trade.Session : 'London';
    document.getElementById('trade-lot').value = trade ? trade.LotSize : '';
    document.getElementById('trade-risk-r').value = trade ? trade.RiskR : '';
    document.getElementById('trade-risk-usd').value = trade ? trade.RiskUSD : '';
    document.getElementById('trade-reward-r').value = trade ? trade.RewardR : '';
    document.getElementById('trade-reward-usd').value = trade ? trade.RewardUSD : '';
    document.getElementById('trade-notes').value = trade ? (trade.Notes || '') : '';

    // Direction toggle state
    const dir = trade ? trade.Direction : 'Buy';
    document.getElementById('trade-direction').value = dir;
    document.querySelectorAll('#dir-toggle .toggle-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.val === dir);
    });

    // Result toggle state
    const result = trade ? trade.Result : 'Win';
    document.getElementById('trade-result').value = result;
    document.querySelectorAll('#result-toggle .result-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.val === result);
    });

    document.getElementById('trade-modal').classList.add('open');
  },

  closeModal() {
    document.getElementById('trade-modal').classList.remove('open');
    this.editingId = null;
  },

  /* ── Save (insert or update) ────────────── */
  async saveTrade() {
    const date    = document.getElementById('trade-date').value;
    const time    = document.getElementById('trade-time').value;
    const pair    = document.getElementById('trade-pair').value;
    const session = document.getElementById('trade-session').value;
    const dir     = document.getElementById('trade-direction').value;
    const lot     = document.getElementById('trade-lot').value;
    const riskR   = document.getElementById('trade-risk-r').value;
    const riskUSD = document.getElementById('trade-risk-usd').value;
    const rewR    = document.getElementById('trade-reward-r').value;
    const rewUSD  = document.getElementById('trade-reward-usd').value;
    const result  = document.getElementById('trade-result').value;
    const notes   = document.getElementById('trade-notes').value;

    if (!date || !pair || !session || !lot || riskUSD === '') {
      Utils.toast('Please fill all required fields', 'error');
      return;
    }

    const saveBtn = document.getElementById('btn-save-trade');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      if (this.editingId) {
        // Update existing
        const row = [this.editingId, date, time, pair, session, dir, lot, riskR, riskUSD, rewR, rewUSD, result, notes];
        await API.update(APP.SHEETS.TRADES, row, this.editingId);
        const idx = STATE.trades.findIndex(t => t.ID === this.editingId);
        if (idx > -1) {
          STATE.trades[idx] = { ID: this.editingId, Date: date, Time: time, Pair: pair, Session: session,
            Direction: dir, LotSize: lot, RiskR: riskR, RiskUSD: riskUSD, RewardR: rewR, RewardUSD: rewUSD,
            Result: result, Notes: notes };
        }
        Utils.toast('Trade updated', 'success');
      } else {
        // Insert new
        const id = Utils.uid();
        const row = [id, date, time, pair, session, dir, lot, riskR, riskUSD, rewR, rewUSD, result, notes];
        await API.insert(APP.SHEETS.TRADES, row);
        STATE.trades.push({ ID: id, Date: date, Time: time, Pair: pair, Session: session,
          Direction: dir, LotSize: lot, RiskR: riskR, RiskUSD: riskUSD, RewardR: rewR, RewardUSD: rewUSD,
          Result: result, Notes: notes });
        Utils.toast('Trade added', 'success');
      }

      this.closeModal();
      this.renderTable();
      Dashboard.render();
    } catch (err) {
      Utils.toast('Error: ' + err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Trade';
    }
  },

  /* ── Delete ──────────────────────────────── */
  async deleteTrade(id) {
    if (!confirm('Delete this trade? This cannot be undone.')) return;
    try {
      await API.delete(APP.SHEETS.TRADES, id);
      STATE.trades = STATE.trades.filter(t => t.ID !== id);
      this.renderTable();
      Dashboard.render();
      Utils.toast('Trade deleted', 'success');
    } catch (err) {
      Utils.toast('Error: ' + err.message, 'error');
    }
  },

  /* ── Filtering ───────────────────────────── */
  getFiltered() {
    const pair    = document.getElementById('filter-pair').value;
    const session = document.getElementById('filter-session').value;
    const result  = document.getElementById('filter-result').value;
    const from    = document.getElementById('filter-from').value;
    const to      = document.getElementById('filter-to').value;

    return STATE.trades.filter(t => {
      if (pair && t.Pair !== pair) return false;
      if (session && t.Session !== session) return false;
      if (result && t.Result !== result) return false;
      if (from && t.Date < from) return false;
      if (to && t.Date > to) return false;
      return true;
    }).sort((a, b) => (b.Date + (b.Time||'')).localeCompare(a.Date + (a.Time||'')));
  },

  /* ── Table render ────────────────────────── */
  renderTable() {
    const tbody = document.getElementById('trade-tbody');
    const filtered = this.getFiltered();

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" class="empty-row">No trades match your filters</td></tr>`;
      document.getElementById('journal-footer').style.display = 'none';
      return;
    }

    tbody.innerHTML = filtered.map(t => {
      const pnl = Utils.tradePnL(t);
      const pnlClass = pnl > 0 ? 'pnl-pos' : (pnl < 0 ? 'pnl-neg' : '');
      const resultBadge = t.Result === 'Win' ? 'badge-win' : (t.Result === 'Loss' ? 'badge-loss' : 'badge-be');
      const dirClass = t.Direction === 'Buy' ? 'dir-buy' : 'dir-sell';
      const dirIcon = t.Direction === 'Buy' ? '▲' : '▼';
      const rr = (t.RiskR && t.RewardR) ? `${t.RiskR}R / ${t.RewardR}R` : '—';

      return `
        <tr>
          <td>${t.Date}${t.Time ? ' <span style="color:var(--text-dim)">' + t.Time + '</span>' : ''}</td>
          <td><span class="pair-tag">${t.Pair}</span></td>
          <td>${t.Session}</td>
          <td><span class="${dirClass}">${dirIcon} ${t.Direction}</span></td>
          <td>${t.LotSize}</td>
          <td>$${parseFloat(t.RiskUSD || 0).toFixed(2)}</td>
          <td>${rr}</td>
          <td class="${pnlClass}">${Utils.fmtUSD(pnl)}</td>
          <td><span class="badge ${resultBadge}">${t.Result}</span></td>
          <td class="notes-cell" title="${(t.Notes || '').replace(/"/g, '&quot;')}">${t.Notes || '—'}</td>
          <td>
            <button class="btn-icon" data-edit="${t.ID}" title="Edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/></svg>
            </button>
            <button class="btn-icon del" data-del="${t.ID}" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </td>
        </tr>`;
    }).join('');

    // Bind row actions
    tbody.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const trade = STATE.trades.find(t => t.ID === btn.dataset.edit);
        if (trade) this.openModal(trade);
      });
    });
    tbody.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => this.deleteTrade(btn.dataset.del));
    });

    // Footer stats
    const s = Utils.calcStats(filtered);
    const footer = document.getElementById('journal-footer');
    footer.style.display = 'flex';
    document.getElementById('jf-count').textContent = `${s.total} trades`;
    document.getElementById('jf-pnl').innerHTML = `Net: <span style="color:${s.netPnL >= 0 ? 'var(--green)' : 'var(--red)'}">${Utils.fmtUSD(s.netPnL)}</span>`;
    document.getElementById('jf-wr').textContent = `Win Rate: ${Utils.fmtPct(s.winRate)}`;
  }
};
