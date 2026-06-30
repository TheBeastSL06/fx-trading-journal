/* js/app.js — Router, global state, init */

const STATE = {
  trades:  [],
  account: []
};

const App = {

  currentPage: 'dashboard',

  init() {
    this.bindNav();
    Dashboard.init();
    Journal.init();
    Settings.init();

    if (!APP.SCRIPT_URL) {
      this.navigate('settings');
      Utils.toast('Set up your Google Apps Script URL to get started', 'info', 4000);
    } else {
      this.loadAll();
    }

    document.getElementById('btn-reload').addEventListener('click', () => this.loadAll());
  },

  /* ── Navigation ──────────────────────────── */
  bindNav() {
    document.querySelectorAll('.nav-btn, .bnav-btn').forEach(btn => {
      btn.addEventListener('click', () => this.navigate(btn.dataset.page));
    });
  },

  navigate(page) {
    this.currentPage = page;

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
    document.querySelectorAll('.bnav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));

    window.scrollTo({ top: 0, behavior: 'instant' });
  },

  /* ── Data loading ────────────────────────── */
  async loadAll() {
    if (!APP.SCRIPT_URL) return;

    const reloadBtn = document.getElementById('btn-reload');
    reloadBtn.classList.add('spinning');

    try {
      const [trades, account] = await Promise.all([
        API.get(APP.SHEETS.TRADES),
        API.get(APP.SHEETS.ACCOUNT)
      ]);

      STATE.trades  = trades;
      STATE.account = account;

      Dashboard.render();
      Journal.renderTable();
      Settings.populateFromState();

      Utils.toast('Data loaded', 'success', 1500);
    } catch (err) {
      Utils.toast('Failed to load: ' + err.message, 'error', 5000);
      console.error(err);
    } finally {
      reloadBtn.classList.remove('spinning');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
