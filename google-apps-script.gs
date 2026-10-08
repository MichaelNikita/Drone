// Приймає заявки з анкети сайту і записує їх у Google-таблицю.
// Встановлення — див. README.md, розділ «Анкета → Google-таблиця».

const SHEET_ID = "1oOYth86DXxONgfKsvrdMuvFUHmsdyQ3O6YHD3oUhlB4";
const SHEET_GID = 0;

const COLUMNS = [
  ["date", "Дата"],
  ["name", "Ім’я"],
  ["phone", "Телефон"],
  ["telegram", "Telegram"],
  ["city", "Місто"],
  ["occupation", "Чим займається"],
  ["experience", "Досвід пайки"],
  ["page", "Сторінка"],
];

function getSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  return ss.getSheets().find((s) => s.getSheetId() === SHEET_GID) || ss.getSheets()[0];
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(COLUMNS.map((c) => c[1]));
      sheet.setFrozenRows(1);
    }
    const p = (e && e.parameter) || {};
    const row = COLUMNS.map(([key]) => {
      if (key === "date") return new Date();
      // Апостроф не дає таблиці трактувати «+380…» чи «=…» як формулу
      const v = String(p[key] || "").slice(0, 500);
      return /^[=+\-@]/.test(v) ? "'" + v : v;
    });
    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput("OK");
}
