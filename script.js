const GAS_URL = "https://script.google.com/macros/s/AKfycbzCkYy2XVplEL3qgx9HXKSIQKOGZnZSLYN6x512mZ6xHoKFdN24U8AC0YiuoMRm-eu_VA/exec";

const subjectsData = {
    "Математика": ["Числа, вирази та модулі", "Логарифми", "Похідна", "Інтеграл", "Тригонометрія", "Геометрія", "Вектори"],
    "Українська мова": ["Наголоси", "Фонетика", "Морфологія", "Синтаксис", "Пунктуація", "Лексикологія"],
    "Історія України": ["Козаччина", "XIX століття", "Революція 1917-21", "Друга світова", "Сучасність"],
    "Менеджмент 073": ["4 функції менеджменту", "SWOT-аналіз", "Маркетинг 4P", "Стилі керівництва", "Мотивація"]
};

let score = 0;
let currentQ = 1;
const TOTAL_QUESTIONS = 5;
let selectedSubject = "";
let selectedTopic = "";

// БУФЕР ДЛЯ ШВИДКОСТІ
let nextQuestionCache = null;

function init() {
    const subSelect = document.getElementById('subject-select');
    const studyContainer = document.getElementById('study-list-container');
    if (!subSelect || !studyContainer) return;
    subSelect.innerHTML = "";
    for (let sub in subjectsData) {
        let opt = document.createElement('option');
        opt.value = sub; opt.innerText = sub;
        subSelect.appendChild(opt);
        let cat = document.createElement('div');
        cat.className = 'study-category';
        cat.innerHTML = `<h3 style="color:var(--primary); margin-top:20px;">${sub}</h3>`;
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

function updateTopicDropdown() {
    const sub = document.getElementById('subject-select').value;
    const topicSelect = document.getElementById('topic-select');
    if (!topicSelect) return;
    topicSelect.innerHTML = '<option value="random">🎲 Випадкова тема</option>';
    subjectsData[sub].forEach(t => {
        let opt = document.createElement('option');
        opt.value = t; opt.innerText = t;
        topicSelect.appendChild(opt);
    });
}

// ФУНКЦІЯ САМОЇ ГЕНЕРАЦІЇ (тепер окрема)
async function fetchQuestionData(sub, topic) {
    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "generateQuestion", subject: sub, topic: topic })
        });
        return await res.json();
    } catch (e) { return null; }
}

async function startQuiz() {
    selectedSubject = document.getElementById('subject-select').value;
    const topicVal = document.getElementById('topic-select').value;
    selectedTopic = (topicVal === "random") ? subjectsData[selectedSubject][Math.floor(Math.random() * subjectsData[selectedSubject].length)] : topicVal;

    score = 0; currentQ = 1;
    nextQuestionCache = null; // Очищуємо кеш

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('quiz-screen').classList.remove('hidden');
    
    // ПЕРШЕ ПИТАННЯ - чекаємо
    await getAIQuestion();
}

async function getAIQuestion() {
    const container = document.getElementById('options-container');
    const qText = document.getElementById('question-text');
    const progressText = document.getElementById('quiz-progress');
    
    progressText.innerText = `Питання ${currentQ} з ${TOTAL_QUESTIONS}`;
    container.innerHTML = "";

    let data;

    if (nextQuestionCache) {
        // Якщо питання вже в кеші - беремо миттєво!
        data = nextQuestionCache;
        nextQuestionCache = null;
    } else {
        // Якщо кеш порожній (тільки для 1-го питання) - вантажимо
        qText.innerText = `⏳ Генеруємо перше питання...`;
        document.getElementById('loading-msg').classList.remove('hidden');
        data = await fetchQuestionData(selectedSubject, selectedTopic);
    }

    if (!data) { qText.innerText = "❌ Помилка AI"; return; }

    qText.innerText = data.q;
    data.a.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-opt';
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(idx, data.correct, btn);
        container.appendChild(btn);
    });
    
    document.getElementById('loading-msg').classList.add('hidden');
    if (window.MathJax) MathJax.typesetPromise();

    // 🔥 ГОЛОВНА ФІШКА: Поки юзер думає над цим питанням, вантажимо НАСТУПНЕ у фон
    if (currentQ < TOTAL_QUESTIONS) {
        preloadNextQuestion();
    }
}

async function preloadNextQuestion() {
    // Вантажимо тихенько в змінну
    nextQuestionCache = await fetchQuestionData(selectedSubject, selectedTopic);
    console.log("Next question preloaded!");
}

function checkAnswer(selected, correct, btn) {
    const allBtns = document.querySelectorAll('.quiz-opt');
    allBtns.forEach(b => b.disabled = true);
    
    if (selected === correct) {
        btn.style.background = "#22c55e"; btn.style.color = "white"; score++;
    } else {
        btn.style.background = "#ef4444"; btn.style.color = "white";
        allBtns[correct].style.background = "#22c55e"; allBtns[correct].style.color = "white";
    }

    setTimeout(() => {
        if (currentQ < TOTAL_QUESTIONS) {
            currentQ++;
            getAIQuestion(); // Це спрацює миттєво, бо кеш уже готовий!
        } else {
            showResults();
        }
    }, 1500);
}

// Інші функції (learnTopic, showResults, formatAIResponse) залишаються без змін
async function learnTopic(sub, topic) {
    showSection('topic-detail');
    const content = document.getElementById('topic-content');
    content.innerHTML = `<div style="text-align:center; padding:50px;"><p>⌛ Gemini готує лекцію <b>"${topic}"</b>...</p></div>`;
    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "getTopicDetails", subject: sub, topic: topic })
        });
        const data = await res.json();
        content.innerHTML = `<h2>${topic}</h2>` + formatAIResponse(data.content);
        if (window.MathJax) { setTimeout(() => { MathJax.typesetPromise([content]); }, 100); }
    } catch (e) { content.innerHTML = "❌ Помилка."; }
}

async function showResults() {
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
    const msg = document.getElementById('result-message');
    msg.innerText = "⏳ Аналіз...";
    try {
        const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "analyze", score: score, total: TOTAL_QUESTIONS, subject: selectedSubject }) });
        const data = await res.json();
        msg.innerHTML = formatAIResponse(data.analysis);
    } catch (e) { msg.innerText = "Готово!"; }
}

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id + '-section').classList.remove('hidden');
    if (id !== 'topic-detail') {
        document.getElementById('btn-test').classList.toggle('active', id === 'test');
        document.getElementById('btn-study').classList.toggle('active', id === 'study');
    }
}

function formatAIResponse(text) {
    if (!text) return "";
    return text.replace(/### (.*?)\n/g, '<h3>$1</h3>').replace(/## (.*?)\n/g, '<h2>$1</h2>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
}

document.addEventListener('DOMContentLoaded', () => {
    init();
    document.getElementById('subject-select').addEventListener('change', updateTopicDropdown);
});
