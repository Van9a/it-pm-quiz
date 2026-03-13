/**
 * PUET AI EXPERT - FRONTEND v9.0
 * Оптимізовано під Gemini 2.5 Flash та Forced JSON Mode
 */

// 🔗 Твій актуальний URL деплою (v9)
const GAS_URL = "https://script.google.com/macros/s/AKfycbzb1wVXX4gPlkRb4LAddeBG8-9MMt6dFaI4gIHJWRJqqMT2_A8FwH2GLB4YI5civWRqSQ/exec";

// 📚 База тем (актуально для НМТ 2026 та Менеджменту ПУЕТ)
const subjectsData = {
    "Математика": ["Логарифми", "Похідна", "Інтеграл", "Тригонометрія", "Вектори", "Геометрія"],
    "Українська мова": ["Наголоси", "Морфологія", "Синтаксис", "Пунктуація", "Фразеологія"],
    "Історія України": ["Козаччина", "Революція 1917-21", "Друга світова", "Сучасна Україна"],
    "Менеджмент 073": ["4 функції менеджменту", "SWOT-аналіз", "Маркетинг 4P", "Стилі керівництва", "Мотивація"]
};

// Стан додатку
let score = 0, currentQ = 1, TOTAL_QUESTIONS = 5;
let selectedSubject = "", selectedTopic = "";
let nextQuestionBuffer = null; 

/**
 * 1. ІНІЦІАЛІЗАЦІЯ ІНТЕРФЕЙСУ
 */
function init() {
    const subSelect = document.getElementById('subject-select');
    const studyContainer = document.getElementById('study-list-container');
    if (!subSelect || !studyContainer) return;

    subSelect.innerHTML = "";
    for (let sub in subjectsData) {
        // Заповнюємо випадаючий список для тестів
        let opt = document.createElement('option');
        opt.value = sub; opt.innerText = sub;
        subSelect.appendChild(opt);

        // Генеруємо картки тем для навчання
        let cat = document.createElement('div');
        cat.className = 'study-category';
        cat.innerHTML = `<h3 style="color:var(--primary); margin: 25px 0 10px 0;">${sub}</h3>`;
        subjectsData[sub].forEach(topic => {
            let link = document.createElement('div');
            link.className = 'topic-link';
            link.innerText = `📖 ${topic}`;
            link.onclick = () => learnTopic(sub, topic);
            cat.appendChild(link);
        });
        studyContainer.appendChild(cat);
    }
    updateTopicDropdown();
}

/**
 * Оновлення списку тем при зміні предмету
 */
function updateTopicDropdown() {
    const sub = document.getElementById('subject-select').value;
    const topicSelect = document.getElementById('topic-select');
    topicSelect.innerHTML = '<option value="random">🎲 Випадкова тема</option>';
    subjectsData[sub].forEach(t => {
        let opt = document.createElement('option');
        opt.value = t; opt.innerText = t;
        topicSelect.appendChild(opt);
    });
}

/**
 * 2. ЦЕНТРАЛЬНИЙ ОБРОБНИК ЗАПИТІВ ДО AI
 */
async function fetchFromAI(payload) {
    const start = performance.now();
    try {
        const res = await fetch(GAS_URL, { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        });
        
        const rawText = await res.text();
        if (!rawText) throw new Error("Порожня відповідь від сервера");

        // Очищення від можливих артефактів маркдауну
        const cleanText = rawText.replace(/```json|```/g, "").trim();
        const data = JSON.parse(cleanText);

        console.log(`⏱️ [${payload.action}] виконано за ${((performance.now() - start)/1000).toFixed(2)}с`);
        
        if (data.error) throw new Error(data.message);
        return data;
    } catch (e) {
        console.error("🚨 AI Communication Error:", e.message);
        return { error: true, message: e.message };
    }
}

/**
 * 3. ЛОГІКА ТЕСТУВАННЯ
 */
async function startQuiz() {
    selectedSubject = document.getElementById('subject-select').value;
    const tVal = document.getElementById('topic-select').value;
    selectedTopic = (tVal === "random") ? subjectsData[selectedSubject][Math.floor(Math.random()*subjectsData[selectedSubject].length)] : tVal;

    score = 0; currentQ = 1; nextQuestionBuffer = null;
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('quiz-screen').classList.remove('hidden');
    
    renderQuestion(); 
}

async function renderQuestion() {
    const qText = document.getElementById('question-text');
    const container = document.getElementById('options-container');
    const loader = document.getElementById('loading-msg');
    
    document.getElementById('quiz-progress').innerText = `Питання ${currentQ} з ${TOTAL_QUESTIONS}`;
    qText.style.color = "inherit"; 

    let data;

    // Використовуємо буфер, якщо він готовий і без помилок
    if (nextQuestionBuffer && !nextQuestionBuffer.error) {
        data = nextQuestionBuffer;
        nextQuestionBuffer = null;
        loader.classList.add('hidden');
    } else {
        qText.innerText = "";
        loader.classList.remove('hidden');
        data = await fetchFromAI({ action: "generateQuestion", subject: selectedSubject, topic: selectedTopic });
        loader.classList.add('hidden');
    }

    if (!data || data.error) {
        qText.innerHTML = `<span style="color:#ef4444">⚠️ Не вдалося завантажити питання. Натисніть "Назад" і спробуйте іншу тему.</span>`;
        return;
    }

    // Відображення тексту питання та варіантів
    qText.innerText = data.q;
    container.innerHTML = "";
    data.a.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-opt';
        btn.innerText = opt;
        btn.onclick = () => handleAnswer(idx, data.correct, btn);
        container.appendChild(btn);
    });

    // Рендеринг LaTeX (MathJax)
    if (window.MathJax) MathJax.typesetPromise([qText, container]);

    // PRE-FETCH: вантажимо наступне питання у фоні
    if (currentQ < TOTAL_QUESTIONS) {
        fetchFromAI({ action: "generateQuestion", subject: selectedSubject, topic: selectedTopic })
            .then(res => { if(res && !res.error) nextQuestionBuffer = res; });
    }
}

function handleAnswer(selected, correct, btn) {
    const btns = document.querySelectorAll('.quiz-opt');
    btns.forEach(b => b.disabled = true);
    
    if (selected === correct) {
        btn.style.background = "#22c55e"; btn.style.color = "white"; score++;
    } else {
        btn.style.background = "#ef4444"; btn.style.color = "white";
        btns[correct].style.background = "#22c55e"; btns[correct].style.color = "white";
    }

    setTimeout(() => {
        if (currentQ < TOTAL_QUESTIONS) {
            currentQ++;
            renderQuestion();
        } else {
            showResults();
        }
    }, 1600);
}

/**
 * 4. НАВЧАННЯ ТА АНАЛІЗ
 */
async function learnTopic(sub, topic) {
    showSection('topic-detail');
    const content = document.getElementById('topic-content');
    content.innerHTML = `<div style="text-align:center; padding:50px;"><p>⌛ Gemini 2.5 Flash готує лекцію...</p></div>`;
    
    const data = await fetchFromAI({ action: "getTopicDetails", subject: sub, topic: topic });
    content.innerHTML = `<h2>${topic}</h2>` + formatAIResponse(data.content || "Помилка завантаження контенту.");
    
    if (window.MathJax) {
        setTimeout(() => { MathJax.typesetPromise([content]); }, 100);
    }
}

async function showResults() {
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
    const msg = document.getElementById('result-message');
    msg.innerText = "⏳ AI-ментор аналізує твої успіхи...";
    
    const data = await fetchFromAI({ action: "analyze", score: score, total: TOTAL_QUESTIONS, subject: selectedSubject });
    msg.innerHTML = formatAIResponse(data.analysis || "Чудова робота! Продовжуй в тому ж дусі.");
}

/**
 * 5. ДОПОМІЖНІ ФУНКЦІЇ
 */
function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id + '-section').classList.remove('hidden');
    // Оновлюємо активний стан кнопок
