/**
 * FX Trading Journal — Google Apps Script Backend
 * ─────────────────────────────────────────────────
 * SETUP:
 * 1. Create a Google Sheet with two tabs named exactly: "Trades" and "Account"
 * 2. In "Trades" tab, add header row (row 1):
 *    ID | Date | Time | Pair | Session | Direction | LotSize | RiskR | RiskUSD | RewardR | RewardUSD | Result | Notes
 * 3. In "Account" tab, add header row (row 1):
 *    ID | Type | Date | Amount | Notes
 * 4. Open Extensions → Apps Script, delete any boilerplate, paste this whole file.
 * 5. Click Deploy → New deployment → select type "Web app"
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 6. Copy the deployment URL and paste it into the app's Settings tab.
 * 7. Whenever you edit this script, redeploy as a NEW VERSION (Deploy → Manage deployments → Edit → New version).
 */

const SS = SpreadsheetApp.getActiveSpreadsheet();

/* ── GET: fetch all rows from a sheet as JSON ───────────────── */
function doGet(e) {
  const sheetName = e.parameter.sheet;
  const sheet = SS.getSheetByName(sheetName);

  if (!sheet) {
    return jsonResponse({ error: `Sheet "${sheetName}" not found` });
  }

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return jsonResponse([]); // only header row or empty

  const headers = data[0];
  const rows = data.slice(1)
    .filter(row => row[0] !== '') // skip blank rows
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });

  return jsonResponse(rows);
}

/* ── POST: insert / update / delete ─────────────────────────── */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const { action, sheet: sheetName, data, id } = body;
    const sheet = SS.getSheetByName(sheetName);

    if (!sheet) {
      return jsonResponse({ error: `Sheet "${sheetName}" not found` });
    }

    if (action === 'insert') {
      sheet.appendRow(data);
      return jsonResponse({ success: true });
    }

    if (action === 'update') {
      const rowIndex = findRowById(sheet, id);
      if (rowIndex === -1) return jsonResponse({ error: 'Row not found for update' });
      sheet.getRange(rowIndex, 1, 1, data.length).setValues([data]);
      return jsonResponse({ success: true });
    }

    if (action === 'delete') {
      const rowIndex = findRowById(sheet, id);
      if (rowIndex === -1) return jsonResponse({ error: 'Row not found for delete' });
      sheet.deleteRow(rowIndex);
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Unknown action: ' + action });

  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

/* ── Helper: find sheet row number by ID (column A) ─────────── */
function findRowById(sheet, id) {
  const ids = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 1; // 1-indexed row number
  }
  return -1;
}

/* ── Helper: JSON response with CORS-friendly headers ───────── */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
