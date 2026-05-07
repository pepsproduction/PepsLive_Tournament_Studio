/**
 * PepsLive Tournament Studio - Google Sheet Webhook
 * Deploy: Apps Script > Deploy > New deployment > Web app
 * Execute as: Me
 * Who has access: Anyone with the link
 *
 * Optional security:
 * Project Settings > Script properties
 * PEPSLIVE_TOKEN = your-secret-token
 */

function doGet() {
  return json_({ ok: true, app: 'PepsLive Tournament Studio Webhook', time: new Date().toISOString() });
}

function doPost(e) {
  try {
    var body = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var payload = JSON.parse(body);

    var requiredToken = PropertiesService.getScriptProperties().getProperty('PEPSLIVE_TOKEN') || '';
    if (requiredToken && payload.token !== requiredToken) {
      return json_({ ok: false, error: 'INVALID_TOKEN' });
    }

    var ss;
    if (payload.sheetId) {
      ss = SpreadsheetApp.openById(payload.sheetId);
    } else {
      var eventName = payload.event && payload.event.name ? payload.event.name : 'PepsLive Tournament';
      ss = SpreadsheetApp.create(eventName + ' - Export ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmm'));
    }

    var tables = payload.tables || {};
    Object.keys(tables).forEach(function(name) {
      writeTable_(ss, name, tables[name]);
    });

    writeStateBackup_(ss, payload);

    return json_({
      ok: true,
      spreadsheetId: ss.getId(),
      url: ss.getUrl(),
      exportedAt: new Date().toISOString()
    });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function writeTable_(ss, name, rows) {
  var safeName = String(name).slice(0, 90).replace(/[\\/?*\[\]:]/g, '_');
  var sh = ss.getSheetByName(safeName) || ss.insertSheet(safeName);
  sh.clear();
  rows = normalizeRows_(rows || [[]]);
  if (!rows.length) rows = [['No data']];
  sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, rows[0].length).setFontWeight('bold').setBackground('#0d1a2c').setFontColor('#ffffff');
  sh.autoResizeColumns(1, rows[0].length);
}

function writeStateBackup_(ss, payload) {
  var sh = ss.getSheetByName('_STATE_JSON') || ss.insertSheet('_STATE_JSON');
  sh.clear();
  sh.getRange(1, 1).setValue(JSON.stringify(payload.state || payload, null, 2));
  sh.hideSheet();
}

function normalizeRows_(rows) {
  var max = 1;
  rows.forEach(function(r) { if (Array.isArray(r)) max = Math.max(max, r.length); });
  return rows.map(function(r) {
    if (!Array.isArray(r)) r = [r];
    var out = r.map(function(v) {
      if (v === null || v === undefined) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return v;
    });
    while (out.length < max) out.push('');
    return out;
  });
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
