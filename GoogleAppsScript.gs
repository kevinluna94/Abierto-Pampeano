const SPREADSHEET_ID = "1SYJYRXhAn5YrhWK8F-RG2VlvDKHZImQJ47KRfjwi4Rc";
const SHEET_NAME = "Entradas";
const EVENT_NAME = "Abierto Pampeano de Baile Deportivo";
const EVENT_DATE = "11 de octubre de 2026";
const LOGO_URL = "https://abiertopampeano.com/Public/logo_apbd_web.jpg";
const HEADERS = [
  "Fecha de registro",
  "ID Entrada",
  "Nombre",
  "Apellido",
  "DNI",
  "Mail",
  "WhatsApp",
  "Tipo de entrada",
  "Valor",
  "Cobro",
  "Envío",
  "Fecha de envío"
];

function setup() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setBackground("#000000")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  sheet.setFrozenRows(1);

  const cobroValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(["No Pagado", "Pagado"], true)
    .setAllowInvalid(false)
    .build();
  const envioValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(["No Enviado", "Enviado"], true)
    .setAllowInvalid(false)
    .build();

  sheet.getRange(2, 10, Math.max(sheet.getMaxRows() - 1, 1), 1).setDataValidation(cobroValidation);
  sheet.getRange(2, 11, Math.max(sheet.getMaxRows() - 1, 1), 1).setDataValidation(envioValidation);
  sheet.autoResizeColumns(1, HEADERS.length);

  ScriptApp.getProjectTriggers()
    .filter(function (trigger) { return trigger.getHandlerFunction() === "onSpreadsheetEdit"; })
    .forEach(function (trigger) { ScriptApp.deleteTrigger(trigger); });
  ScriptApp.newTrigger("onSpreadsheetEdit").forSpreadsheet(SPREADSHEET_ID).onEdit().create();
}

function doPost(event) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);
    const data = JSON.parse(event.postData.contents);
    validateRegistration_(data);

    const sheet = getSheet_();
    const ticketId = "APBD-" + Utilities.getUuid().split("-")[0].toUpperCase();
    sheet.appendRow([
      new Date(),
      ticketId,
      safeCell_(data.nombre),
      safeCell_(data.apellido),
      safeCell_(data.dni),
      safeCell_(data.mail),
      safeCell_(data.whatsapp),
      safeCell_(data.tipoEntrada || "Entrada General"),
      Number(data.valor) || 20000,
      "No Pagado",
      "No Enviado",
      ""
    ]);

    const row = sheet.getLastRow();
    applyRowValidation_(sheet, row);
    return jsonResponse_({ ok: true, ticketId: ticketId });
  } catch (error) {
    return jsonResponse_({ ok: false, error: error.message });
  } finally {
    lock.releaseLock();
  }
}

function onSpreadsheetEdit(event) {
  const sheet = event.range.getSheet();
  const row = event.range.getRow();
  const column = event.range.getColumn();

  if (sheet.getName() !== SHEET_NAME || row < 2 || (column !== 10 && column !== 11)) return;

  const values = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];
  const cobro = values[9];
  const envio = values[10];

  if (cobro === "Pagado" && envio !== "Enviado") {
    sendTicket_(values);
    sheet.getRange(row, 11).setValue("Enviado");
    sheet.getRange(row, 12).setValue(new Date());
  }
}

function sendTicket_(values) {
  const ticket = {
    id: values[1],
    nombre: values[2],
    apellido: values[3],
    dni: values[4],
    mail: values[5],
    tipo: values[7],
    valor: Number(values[8])
  };
  const logo = UrlFetchApp.fetch(LOGO_URL).getBlob().setName("logo-apbd.jpg");

  MailApp.sendEmail({
    to: ticket.mail,
    subject: "Tu entrada - " + EVENT_NAME,
    htmlBody: buildTicketHtml_(ticket),
    inlineImages: { logoApbd: logo },
    name: "Abierto Pampeano"
  });
}

function buildTicketHtml_(ticket) {
  const price = formatPrice_(ticket.valor);
  return '<div style="max-width:620px;margin:auto;border:2px solid #c18f54;font-family:Arial,sans-serif;color:#211d18">' +
    '<div style="padding:24px;text-align:center;background:#000000">' +
      '<img src="cid:logoApbd" alt="Abierto Pampeano" style="width:110px;height:auto">' +
    '</div>' +
    '<div style="padding:28px">' +
      '<p style="margin:0;color:#c18f54;font-weight:bold;text-transform:uppercase">Entrada oficial</p>' +
      '<h1 style="margin:8px 0 24px;font-size:28px">' + EVENT_NAME + '</h1>' +
      '<table style="width:100%;border-collapse:collapse;font-size:16px">' +
        ticketRow_("Asistente", escapeHtml_(ticket.nombre + " " + ticket.apellido)) +
        ticketRow_("DNI", escapeHtml_(ticket.dni)) +
        ticketRow_("Fecha", EVENT_DATE) +
        ticketRow_("Entrada", escapeHtml_(ticket.tipo)) +
        ticketRow_("Valor", price) +
        ticketRow_("Código", escapeHtml_(ticket.id)) +
      '</table>' +
      '<p style="margin:26px 0 0;padding:16px;background:#fff4e4;text-align:center;font-weight:bold">Presentá esta entrada junto con tu DNI el día de la competencia.</p>' +
    '</div>' +
  '</div>';
}

function ticketRow_(label, value) {
  return '<tr><td style="padding:10px;border-bottom:1px solid #ead6bd;color:#6b5b48">' + label +
    '</td><td style="padding:10px;border-bottom:1px solid #ead6bd;font-weight:bold;text-align:right">' + value + '</td></tr>';
}

function formatPrice_(value) {
  const amount = Math.round(Number(value) || 0);
  return "$" + String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("Primero ejecutá la función setup().");
  return sheet;
}

function applyRowValidation_(sheet, row) {
  sheet.getRange(row, 10).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(["No Pagado", "Pagado"], true).setAllowInvalid(false).build());
  sheet.getRange(row, 11).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(["No Enviado", "Enviado"], true).setAllowInvalid(false).build());
}

function validateRegistration_(data) {
  ["nombre", "apellido", "dni", "mail", "whatsapp"].forEach(function (field) {
    if (!String(data[field] || "").trim()) throw new Error("Falta completar " + field + ".");
  });
  if (!/^[0-9]{7,9}$/.test(String(data.dni))) throw new Error("El DNI no es válido.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.mail))) throw new Error("El mail no es válido.");
}

function safeCell_(value) {
  const text = String(value || "").trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function escapeHtml_(value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
  });
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}