/**
 * PUET AI EXPERT BACKEND v7.5 (Verified 2026 Models)
 */

const API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_KEY');

// Список моделей ПРЯМО з твого діагностичного звіту
const MODELS_TO_TRY = [
  "gemini-2.5-flash", 
  "gemini-2.0-flash",
  "gemini-1.5-flash"
];

function doPost(e) {
  try {
    if (!API_KEY) throw new Error("API_KEY не налаштовано!");

    const data = JSON.parse(e.postData.contents);
    const promptText = generatePrompt(data);
    
    let aiResponse = null;
    let usedModel = "";

    // Цикл перебору моделей для 100% стабільності
    for (let modelName of MODELS_TO_TRY) {
      try {
        aiResponse = callGeminiAPI(modelName, promptText);
        if (aiResponse) {
          usedModel = modelName;
          break; 
        }
      } catch (err) {
        console.warn(`Модель ${modelName} недоступна, пробую наступну...`);
        continue; 
      }
    }

    if (!aiResponse) throw new Error("Сервери Google тимчасово перевантажені.");

    const finalOutput = processAIResponse(aiResponse, data.action);
    return ContentService.createTextOutput(finalOutput).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      error: true, 
      message: err.message 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function callGeminiAPI(modelName, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${API_KEY}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 1200, temperature: 0.7 }
  };

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const resData = JSON.parse(response.getContentText());
  if (resData.error) throw new Error(resData.error.message);
  
  return resData.candidates[0].content.parts[0].text;
}

function generatePrompt(data) {
  if (data.action === "generateQuestion") {
    return `Ти - експерт НМТ та менеджменту. Створи 1 складне питання по темі "${data.topic}" (${data.subject}). 
    JSON формат ТІЛЬКИ: {"q": "текст", "a": ["в1", "в2", "в3", "в4"], "correct": 0}. 
    Використовуй LaTeX для складних формул. Всередині тексту використовуй одинарні лапки.`;
  } 
  if (data.action === "getTopicDetails") {
    return `Напиши структурований конспект для підготовки до НМТ: "${data.topic}" (${data.subject}). Використовуй Markdown, LaTeX та додавай практичні приклади для
