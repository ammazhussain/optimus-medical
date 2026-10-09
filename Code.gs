/**
 * Optimus Medical: quote requests back end (Google Apps Script, free).
 *
 * What it does when the website's quote form is sent:
 *   1. Checks the request (spam and rate limits, see LIMITS below).
 *   2. Saves it as a new row in the "Requests" sheet.
 *   3. Emails the team (Gmail) and, if set up, sends a Telegram message.
 *   4. Replies to the website with a reference number.
 *
 * Setup steps are in backend/SETUP.md. Edit only the CONFIG block below.
 * Note: Apps Script cannot see a visitor's IP address, so limits are per phone number,
 * per day, plus bot checks.
 */

/* ===================== CONFIG ===================== */
var CONFIG = {
  SHEET_NAME: "Requests",

  // Who gets the alert email. Comma-separate several addresses.
  ALERT_EMAILS: "info@optimusmedicalpak.com",

  // Optional Telegram alert. Leave both empty to switch it off.
  TELEGRAM_BOT_TOKEN: "",
  TELEGRAM_CHAT_ID: "",

  TIMEZONE: "Asia/Karachi"
};

var LIMITS = {
  PER_PHONE_PER_DAY: 3,        // requests from one phone number per day
  DUPLICATE_MINUTES: 10,       // same phone + same items inside this window is ignored
  MIN_FILL_SECONDS: 4,         // forms sent faster than this are treated as bots
  ALERT_EMAILS_PER_DAY: 80,    // Gmail allows 100 recipients/day on a free account; keep a margin
  MAX_ITEMS: 60,
  MAX_MESSAGE: 2000,
  MAX_FIELD: 120
};

var HEADERS = ["Received", "Reference", "Status", "Name", "Phone", "WhatsApp", "Email",
               "Customer type", "Organisation", "Equipment", "Items", "Message", "Staff notes"];
var STATUSES = ["New", "Contacted", "Quoted", "Won", "Lost", "Spam"];

/* ===================== WEB ENTRY POINT ===================== */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return reply({ ok: false, error: "busy" });
  }
  try {
    var data;
    try { data = JSON.parse(e && e.postData && e.postData.contents || "{}"); }
    catch (err) { return reply({ ok: false, error: "invalid" }); }

    // ---- Bot checks: answer "ok" so bots learn nothing, but store nothing ----
    if (data.website) return reply({ ok: true, reference: fakeReference() });
    if (!(Number(data.elapsed) >= LIMITS.MIN_FILL_SECONDS)) return reply({ ok: true, reference: fakeReference() });

    // ---- Validate and clean ----
    var clean = validate(data);
    if (!clean) return reply({ ok: false, error: "invalid" });

    var sheet = getSheet();
    var now = new Date();
    var today = Utilities.formatDate(now, CONFIG.TIMEZONE, "yyyy-MM-dd");

    // ---- Rate limits, read from the sheet itself (accurate, nothing to reset) ----
    var recent = recentRows(sheet, 400);
    var samePhoneToday = 0, duplicate = null;
    for (var i = 0; i < recent.length; i++) {
      var r = recent[i];
      if (r.phoneDigits !== clean.phone.replace(/\D/g, "")) continue;
      if (Utilities.formatDate(r.received, CONFIG.TIMEZONE, "yyyy-MM-dd") === today) samePhoneToday++;
      if (!duplicate && (now - r.received) < LIMITS.DUPLICATE_MINUTES * 60000 && r.items === clean.itemsText && r.message === clean.message) duplicate = r;
    }
    if (duplicate) return reply({ ok: true, reference: duplicate.reference, duplicate: true });
    if (samePhoneToday >= LIMITS.PER_PHONE_PER_DAY) return reply({ ok: false, error: "limit" });

    // ---- Save ----
    var reference = makeReference(now);
    var waNumber = clean.phone.replace(/\D/g, "");
    sheet.appendRow([
      now, reference, "New", clean.name, "'" + clean.phone,
      '=HYPERLINK("https://wa.me/' + waNumber + '","Chat")',
      clean.email, clean.type === "company" ? "Company / organisation" : "Private customer",
      clean.organisation, clean.itemsText, clean.items.length, clean.message, ""
    ]);

    // ---- Alerts (never block the save) ----
    try { sendEmailAlert(reference, clean); } catch (err) { console.error("email failed", err); }
    try { sendTelegramAlert(reference, clean); } catch (err) { console.error("telegram failed", err); }

    return reply({ ok: true, reference: reference });
  } finally {
    lock.releaseLock();
  }
}

/* A GET request just confirms the script is deployed. */
function doGet() {
  return reply({ ok: true, service: "Optimus Medical quote requests" });
}

/* ===================== HELPERS ===================== */
function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function cut(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

/* Stop spreadsheet formulas being injected through form fields. */
function safe(v) {
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function normalisePhone(v) {
  var d = String(v || "").replace(/[^\d+]/g, "");
  if (/^\+92\d{10}$/.test(d)) return d;
  if (/^92\d{10}$/.test(d)) return "+" + d;
  if (/^0\d{10}$/.test(d)) return "+92" + d.slice(1);
  if (/^3\d{9}$/.test(d)) return "+92" + d;
  return null;
}

function validate(d) {
  var c = d.customer || {};
  var name = cut(c.name, LIMITS.MAX_FIELD);
  var phone = normalisePhone(c.phone);
  var type = c.type === "private" ? "private" : "company";
  var organisation = type === "company" ? cut(c.organisation, LIMITS.MAX_FIELD) : "";
  var email = cut(c.email, LIMITS.MAX_FIELD);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) email = "";
  var message = cut(d.message, LIMITS.MAX_MESSAGE);
  var items = (Array.isArray(d.items) ? d.items : []).slice(0, LIMITS.MAX_ITEMS).map(function (it) {
    return {
      name: cut(it && it.name, LIMITS.MAX_FIELD),
      model: cut(it && it.model, 60),
      intent: it && it.intent === "rent" ? "Rent" : "Buy",
      quantity: Math.max(1, Math.min(99, parseInt(it && it.quantity, 10) || 1))
    };
  }).filter(function (it) { return it.name; });

  if (name.length < 2 || !phone) return null;
  if (type === "company" && !organisation) return null;
  if (!items.length && !message) return null;

  var itemsText = items.map(function (it) { return it.quantity + " x " + it.name + " (" + it.model + ") - " + it.intent; }).join("\n");
  return {
    name: safe(name), phone: phone, email: safe(email), type: type, organisation: safe(organisation),
    message: safe(message), items: items, itemsText: safe(itemsText)
  };
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) { setup(); sheet = ss.getSheetByName(CONFIG.SHEET_NAME); }
  return sheet;
}

/* The last `n` rows, newest last: { received, reference, phoneDigits, items, message } */
function recentRows(sheet, n) {
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var start = Math.max(2, last - n + 1);
  var values = sheet.getRange(start, 1, last - start + 1, 12).getValues();
  return values.map(function (v) {
    return { received: new Date(v[0]), reference: String(v[1]), phoneDigits: String(v[4]).replace(/\D/g, ""), items: String(v[9]), message: String(v[11]) };
  });
}

function makeReference(now) {
  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var tail = "";
  for (var i = 0; i < 4; i++) tail += chars.charAt(Math.floor(Math.random() * chars.length));
  return "OM-" + Utilities.formatDate(now, CONFIG.TIMEZONE, "yyyyMMdd") + "-" + tail;
}
function fakeReference() { return makeReference(new Date()); }

/* Daily email counter, so Gmail's free quota is never exhausted. */
function takeEmailBudget(count) {
  var props = PropertiesService.getScriptProperties();
  var key = "mail-" + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd");
  var used = Number(props.getProperty(key) || 0);
  if (used + count > LIMITS.ALERT_EMAILS_PER_DAY) return false;
  props.setProperty(key, String(used + count));
  // tidy up old counters
  var all = props.getKeys();
  for (var i = 0; i < all.length; i++) if (/^mail-/.test(all[i]) && all[i] !== key) props.deleteProperty(all[i]);
  return true;
}

function sendEmailAlert(reference, c) {
  var to = CONFIG.ALERT_EMAILS.split(",").map(function (s) { return s.trim(); }).filter(String);
  if (!to.length) return;
  if (!takeEmailBudget(to.length)) return;   // over today's budget: the row is still saved
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; }); };
  var rows = c.items.map(function (it) {
    return "<tr><td style='padding:6px 10px;border-bottom:1px solid #e3eaea'>" + esc(it.name) + "<br><span style='color:#1f6b6e;font-size:12px'>" + esc(it.model) + "</span></td>" +
           "<td style='padding:6px 10px;border-bottom:1px solid #e3eaea'>" + it.intent + "</td>" +
           "<td style='padding:6px 10px;border-bottom:1px solid #e3eaea;text-align:right'>" + it.quantity + "</td></tr>";
  }).join("");
  var wa = "https://wa.me/" + c.phone.replace(/\D/g, "");
  var html =
    "<div style='font-family:Arial,sans-serif;color:#0f1f21;max-width:560px'>" +
    "<h2 style='margin:0 0 4px'>New quote request</h2><p style='margin:0 0 16px;color:#66777a'>" + reference + "</p>" +
    "<p style='margin:0 0 4px'><b>" + esc(c.name) + "</b>" + (c.organisation ? ", " + esc(c.organisation) : " (private customer)") + "</p>" +
    "<p style='margin:0 0 4px'>" + esc(c.phone) + " &nbsp; <a href='" + wa + "'>Chat on WhatsApp</a></p>" +
    (c.email ? "<p style='margin:0 0 4px'>" + esc(c.email) + "</p>" : "") +
    (rows ? "<table style='border-collapse:collapse;width:100%;margin:16px 0'><tr style='text-align:left;color:#66777a;font-size:12px'><th style='padding:6px 10px'>Equipment</th><th style='padding:6px 10px'>Buy/Rent</th><th style='padding:6px 10px;text-align:right'>Qty</th></tr>" + rows + "</table>" : "") +
    (c.message ? "<p style='margin:12px 0 4px;color:#66777a;font-size:12px'>Message</p><p style='margin:0;white-space:pre-wrap'>" + esc(c.message) + "</p>" : "") +
    "<p style='margin:20px 0 0'><a href='" + SpreadsheetApp.getActiveSpreadsheet().getUrl() + "'>Open the requests sheet</a></p></div>";
  MailApp.sendEmail({
    to: to.join(","),
    subject: "Quote request " + reference + " from " + c.name + (c.organisation ? ", " + c.organisation : ""),
    htmlBody: html,
    name: "Optimus Medical website",
    replyTo: c.email || undefined
  });
}

function sendTelegramAlert(reference, c) {
  if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) return;
  var lines = [
    "New quote request " + reference,
    c.name + (c.organisation ? ", " + c.organisation : " (private)"),
    c.phone + "  https://wa.me/" + c.phone.replace(/\D/g, "")
  ];
  if (c.items.length) lines.push("", c.items.map(function (it) { return it.quantity + " x " + it.name + " (" + it.intent + ")"; }).join("\n"));
  if (c.message) lines.push("", c.message.slice(0, 500));
  UrlFetchApp.fetch("https://api.telegram.org/bot" + CONFIG.TELEGRAM_BOT_TOKEN + "/sendMessage", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ chat_id: CONFIG.TELEGRAM_CHAT_ID, text: lines.join("\n"), disable_web_page_preview: true }),
    muteHttpExceptions: true
  });
}

/* ===================== ONE-TIME SETUP ===================== */
/* Run this once from the editor (Run > setup). It creates the sheet, headers and the status dropdown. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.insertSheet(CONFIG.SHEET_NAME);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold").setBackground("#08262a").setFontColor("#ffffff");
  sheet.setFrozenRows(1);
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build();
  sheet.getRange(2, 3, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
  sheet.getRange(2, 1, sheet.getMaxRows() - 1, 1).setNumberFormat("dd MMM yyyy, hh:mm");
  sheet.getRange(2, 10, sheet.getMaxRows() - 1, 1).setWrap(true);
  sheet.getRange(2, 12, sheet.getMaxRows() - 1, 1).setWrap(true);
  [150, 150, 100, 160, 130, 80, 180, 160, 180, 320, 60, 280, 220].forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });
}

/* Optional: run once from the editor to send yourself a test alert. */
function testAlert() {
  var sample = validate({
    customer: { name: "Test Customer", phone: "03001234567", type: "company", organisation: "Test Hospital" },
    items: [{ name: "Infusion pump", model: "Model IP-1", intent: "buy", quantity: 2 }],
    message: "This is a test from the setup guide."
  });
  sendEmailAlert("OM-TEST-0000", sample);
  if (CONFIG.TELEGRAM_BOT_TOKEN && CONFIG.TELEGRAM_CHAT_ID) sendTelegramAlert("OM-TEST-0000", sample);
}
