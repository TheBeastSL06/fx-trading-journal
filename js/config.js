/* js/config.js — App constants & runtime config */

const APP = {
  VERSION: '1.0.0',
  SCRIPT_URL: localStorage.getItem('fx_script_url') || '',
  SHEETS: {
    TRADES:  'Trades',
    ACCOUNT: 'Account'
  },
  PAIRS:     ['GBPUSD', 'EURUSD', 'XAUUSD', 'Others'],
  SESSIONS:  ['London', 'NY'],
  RESULTS:   ['Win', 'Loss', 'Breakeven']
};
