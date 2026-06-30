/* js/api.js — Google Apps Script CRUD wrapper */

const API = {

  /**
   * Fetch all rows from a sheet.
   * Returns an array of objects keyed by header row.
   */
  async get(sheet) {
    if (!APP.SCRIPT_URL) throw new Error('Script URL not configured. Go to Settings first.');
    const url = `${APP.SCRIPT_URL}?sheet=${encodeURIComponent(sheet)}&t=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.error) throw new Error(data.error);
    return Array.isArray(data) ? data : [];
  },

  /**
   * Send a POST action to the Apps Script.
   * Content-Type is text/plain to avoid CORS preflight.
   */
  async _post(body) {
    if (!APP.SCRIPT_URL) throw new Error('Script URL not configured.');
    const res = await fetch(APP.SCRIPT_URL, {
      method:   'POST',
      headers:  { 'Content-Type': 'text/plain' },
      body:     JSON.stringify(body),
      redirect: 'follow'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.error) throw new Error(data.error);
    return data;
  },

  /** Append a new row. data = array of values matching sheet columns. */
  insert(sheet, data) {
    return API._post({ action: 'insert', sheet, data });
  },

  /** Update an existing row matched by id. data = full column array. */
  update(sheet, data, id) {
    return API._post({ action: 'update', sheet, data, id });
  },

  /** Delete a row matched by id. */
  delete(sheet, id) {
    return API._post({ action: 'delete', sheet, id });
  }
};
