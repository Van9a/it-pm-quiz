/**
 * PUET AI EXPERT BACKEND v18.0 - FULL DATABASE (Quizzes + Lectures)
 */

const API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_KEY');
const SHEET_ID = '1V9bSkb-aBpZWTQuj5tWV-ZwPAaHdeneC8iWP6VWta-c';

function doPost(e) {
  try {
    if (!API_KEY) throw new Error("API ключ не знайдено!");

    const data = JSON.parse(e.postData.contents);

    if (data.action === "generateQuiz") {
      return handleDatabaseQuiz(data);
    } else if (data.action === "getTopicDetails") {
      return handleDatabaseLecture(data); // Підключили лекції до бази!
    } else {
      return handleDirectAI(data); // Аналіз залишаємо напряму
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: true, message: err.message }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

// === ЛОГІКА РОБОТИ З БАЗОЮ ПИТАНЬ ===
function handleDatabaseQuiz(data) {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  let sheet = spreadsheet.getSheets()[0]; // Перша вкладка (для тестів)
  const rows = sheet.getDataRange().getValues();
  
  let savedQuestions = [];
  
  for (let i = 1; i < rows.length; i++) { 
    if (rows[i][0] === data.subject && rows[i][1] === data.topic && rows[i][2]) {
      try {
        savedQuestions.push(JSON.parse(rows[i][2]));
      } catch(e) {} 
    }
  }

  if (savedQuestions.length >= 5) {
    const shuffled = savedQuestions.sort(() => 0.5 - Math.random()).slice(0, 5);
    return ContentService.createTextOutput(JSON.stringify(shuffled))
                         .setMimeType(ContentService.MimeType.JSON);
  }

  const prompt = `Створи 10 тестових питань у форматі НМТ на тему "${data.topic}" (${data.subject}) українською мовою. 
  Відповідь має бути СУВОРО у форматі JSON-масиву: [{"q":"текст","a":["в1","в2","в3","в4"],"correct":0}]. 
  КРИТИЧНО ВАЖЛИВО: Не використовуй лапки (") всередині тексту питань чи відповідей, замінюй їх на одинарні (') або ялинки («»). Тільки чистий JSON-масив без markdown-розмітки.`;

  const aiText = callGeminiAPI(prompt, 0.2);
  
  const s = aiText.indexOf('[');
  const e = aiText.lastIndexOf(']');
  if (s === -1 || e === -1) throw new Error("AI не зміг згенерувати правильний масив питань.");

  const jsonString = aiText.substring(s, e + 1);
  const newQuestions = JSON.parse(jsonString);

  newQuestions.forEach(q => {
    sheet.appendRow([data.subject, data.topic, JSON.stringify(q)]);
  });

  const resultToUser = newQuestions.slice(0, 5);
  return ContentService.createTextOutput(JSON.stringify(resultToUser))
                       .setMimeType(ContentService.MimeType.JSON);
}

// === НОВА ЛОГІКА РОБОТИ З БАЗОЮ ЛЕКЦІЙ ===
function handleDatabaseLecture(data) {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  let sheet = spreadsheet.getSheetByName("Lectures");
  
  // МАГІЯ: Якщо вкладки "Lectures" ще немає — скрипт створить її сам!
  if (!sheet) {
    sheet = spreadsheet.insertSheet("Lectures");
    sheet.appendRow(["Предмет", "Тема
