/* js/settings.js — Settings: script URL, balance, deposits/withdrawals */

const Settings = {

  init() {
    // Load saved config
    document.getElementById('cfg-script-url').value = APP.SCRIPT_URL || '';

    document.getElementById('btn-save-config').addEventListener('click', () => this.saveConfig());
    document.getElementById('btn-save-balance').addEventListener('click', () => this.saveBalance());
    document.getElementById('btn-add-txn').addEventListener('click', () => this.addTransaction());

    document.getElementById('txn-date').value = Utils.today();
  },

  /* ── Script URL config ──────────────────── */
  saveConfig() {
    const url = document.getElementById('cfg-script-url').value.trim();
    if (!url) {
      Utils.toast('Please enter a valid Script URL', 'error');
      return;
    }
    localStorage.setItem('fx_script_url', url);
    APP.SCRIPT_URL = url;
    Utils.toast('Configuration saved. Reloading data...', 'success');
    setTimeout(() => App.loadAll(), 600);
  },

  /* ── Initial balance ─────────────────────── */
  async saveBalance() {
    const amount = document.getElementById('cfg-initial-balance').value;
    const date   = document.getElementById('cfg-start-date').value || Utils.today();

    if (!amount || parseFloat(amount) < 0) {
      Utils.toast('Please enter a valid initial balance', 'error');
      return;
    }

    const btn = document.getElementById('btn-save-balance');
    btn.disabled = true; btn.textContent = 'Saving...';

    try {
      const existing = STATE.account.find(a => a.Type === 'Initial');
      const row = [existing ? existing.ID : Utils.uid(), 'Initial', date, amount, 'Initial balance'];

      if (existing) {
        await API.update(APP.SHEETS.ACCOUNT, row, existing.ID);
        existing.Date = date; existing.Amount = amount;
      } else {
        await API.insert(APP.SHEETS.ACCOUNT, row);
        STATE.account.push({ ID: row[0], Type: 'Initial', Date: date, Amount: amount, Notes: 'Initial balance' });
      }

      Utils.toast('Initial balance saved', 'success');
      Dashboard.render();
      this.renderAccountTable();
    } catch (err) {
      Utils.toast('Error: ' + err.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Save Balance';
    }
  },

  /* ── Deposit / Withdrawal ────────────────── */
  async addTransaction() {
    const type   = document.getElementById('txn-type').value;
    const date   = document.getElementById('txn-date').value || Utils.today();
    const amount = document.getElementById('txn-amount').value;
    const notes  = document.getElementById('txn-notes').value;

    if (!amount || parseFloat(amount) <= 0) {
      Utils.toast('Please enter a valid amount', 'error');
      return;
    }

    const btn = document.getElementById('btn-add-txn');
    btn.disabled = true; btn.textContent = 'Saving...';

    try {
      const id  = Utils.uid();
      const row = [id, type, date, amount, notes];
      await API.insert(APP.SHEETS.ACCOUNT, row);
      STATE.account.push({ ID: id, Type: type, Date: date, Amount: amount, Notes: notes });

      document.getElementById('txn-amount').value = '';
      document.getElementById('txn-notes').value = '';

      Utils.toast(`${type} recorded`, 'success');
      Dashboard.render();
      this.renderAccountTable();
    } catch (err) {
      Utils.toast('Error: ' + err.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Add Record';
    }
  },

  /* ── Delete txn ──────────────────────────── */
  async deleteTxn(id) {
    if (!confirm('Delete this record?')) return;
    try {
      await API.delete(APP.SHEETS.ACCOUNT, id);
      STATE.account = STATE.account.filter(a => a.ID !== id);
      this.renderAccountTable();
      Dashboard.render();
      Utils.toast('Record deleted', 'success');
    } catch (err) {
      Utils.toast('Error: ' + err.message, 'error');
    }
  },

  /* ── Populate fields from loaded state ──── */
  populateFromState() {
    const initial = STATE.account.find(a => a.Type === 'Initial');
    if (initial) {
      document.getElementById('cfg-initial-balance').value = initial.Amount;
      document.getElementById('cfg-start-date').value = initial.Date;
    }
    this.renderAccountTable();
  },

  /* ── Account history table ──────────────── */
  renderAccountTable() {
    const tbody = document.getElementById('account-tbody');
    const rows = STATE.account
      .filter(a => a.Type !== 'Initial')
      .sort((a, b) => b.Date.localeCompare(a.Date));

    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No deposit/withdrawal records</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(a => {
      const isDep = a.Type === 'Deposit';
      return `
        <tr>
          <td><span class="badge ${isDep ? 'badge-win' : 'badge-loss'}">${a.Type}</span></td>
          <td>${a.Date}</td>
          <td class="${isDep ? 'pnl-pos' : 'pnl-neg'}">${isDep ? '+' : '-'}$${parseFloat(a.Amount).toFixed(2)}</td>
          <td class="notes-cell">${a.Notes || '—'}</td>
          <td><button class="btn-icon del" data-del-txn="${a.ID}" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button></td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-del-txn]').forEach(btn => {
      btn.addEventListener('click', () => this.deleteTxn(btn.dataset.delTxn));
    });
  }
};
