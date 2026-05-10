/* PepsLive Tournament Studio - Tournament Database Webhook
   Deploy as Web App:
   - Execute as: Me
   - Who has access: Anyone with the link
*/

const PEPSLIVE_DEFAULT_TOKEN = '';

function doPost(e) {
  try {
    const body = parseBody_(e);
    if (!body || body.action !== 'writeTournamentDatabase') {
      return json_({ ok: false, error: 'Invalid action' });
    }

    if (PEPSLIVE_DEFAULT_TOKEN && body.token !== PEPSLIVE_DEFAULT_TOKEN) {
      return json_({ ok: false, error: 'Invalid token' });
    }

    const ss = body.sheetId
      ? SpreadsheetApp.openById(body.sheetId)
      : SpreadsheetApp.getActiveSpreadsheet();

    if (!ss) return json_({ ok: false, error: 'No spreadsheet available' });

    const sheets = body.sheets || {};
    const result = {};
    Object.keys(sheets).forEach((name) => {
      const rows = Array.isArray(sheets[name]) ? sheets[name] : [];
      writeRows_(ss, name, rows);
      result[name] = rows.length;
    });

    return json_({ ok: true, written: result, exportedAt: body.exportedAt || new Date().toISOString() });
  } catch (err) {
    return json_({ ok: false, error: err.message, stack: err.stack });
  }
}

function doGet() {
  return json_({ ok: true, name: 'PepsLive Tournament Database Webhook', time: new Date().toISOString() });
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return null;
  return JSON.parse(e.postData.contents);
}

function writeRows_(ss, sheetName, rows) {
  const sheet = getOrCreateSheet_(ss, sheetName);
  sheet.clearContents();
  sheet.clearFormats();

  if (!rows.length) {
    sheet.getRange(1, 1).setValue('No data');
    return;
  }

  const headers = collectHeaders_(rows);
  const values = rows.map((row) => headers.map((h) => normalizeValue_(row[h])));
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#10233d');
  headerRange.setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  sheet.getDataRange().createFilter();
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function collectHeaders_(rows) {
  const set = new Set();
  rows.forEach((row) => Object.keys(row || {}).forEach((key) => set.add(key)));
  return Array.from(set);
}

function normalizeValue_(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
