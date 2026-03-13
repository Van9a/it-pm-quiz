// Твоє постійне посилання на бекенд
const GAS_URL = "https://script.google.com/macros/s/AKfycbzCkYy2XVplEL3qgx9HXKSIQKOGZnZSLYN6x512mZ6xHoKFdN24U8AC0YiuoMRm-eu_VA/exec";

// 📚 ПОВНИЙ СПИСОК ТЕМ НМТ 2026
const subjectsData = {
    "Математика": [
        "Числа, вирази та модулі",
        "Показникові та логарифмічні рівняння",
        "Похідна функції та її застосування",
        "Інтеграл та площа фігур",
        "Тригонометрія",
        "Планіметрія (трикутники, кола)",
        "Стереометрія (об'єми тіл)",
        "Вектори та координати"
    ],
    "Українська мова": [
        "Наголоси (обов'язковий список)",
        "Фонетика та уподібнення",
        "Морфологія: відмінювання числівників",
        "Синтаксис складного речення",
        "Пунктуація",
        "Фразеологія"
    ],
    "Історія України": [
        "Козаччина (XVI-XVIII ст.)",
        "Україна в XIX ст.",
        "Революція 1917-1921",
        "Друга світова війна",
        "Сучасна Україна (1991-2026)"
    ],
    "Менеджмент 073": [
        "4 функції менеджменту",
        "SWOT-аналіз",
        "Маркетинг-мікс 4P",
        "Стилі керівництва",
        "Теорії мотивації"
    ]
};

let score = 0;
let currentQ = 0;
const TOTAL_QUESTIONS = 5;
let selectedSubject = "";

// Ініціалізація списків при завантаженні
function init() {
    const subSelect = document.getElementById('subject-select');
    const studyContainer = document.getElementById('study-list-container');
    if (!subSelect || !studyContainer) return;

    for (let sub in subjectsData) {
        let opt = document.createElement('option');
        opt.value = sub; opt.innerText = sub;
        subSelect.appendChild(opt);

        let cat = document.createElement('div');
        cat.className = 'study-category';
        cat.innerHTML = `<h3>${sub}</h3>`;
        subjectsData[sub].forEach(topic => {
            let link = document.createElement('span');
            link.className = 'topic-link';
            link.innerText = `📖 ${topic}`;
            link.onclick = () => learnTopic(sub, topic);
            cat.appendChild(link);
        });
        studyContainer.appendChild(cat);
    }
}

// Функція вивчення теми (УРОК)
async function learnTopic(sub, topic) {
    showSection('topic-detail');
    const content = document.getElementById('topic-content');
    content.innerHTML = `<div style="text-align:center; padding:50px;"><p>⌛ Gemini готує лекцію по темі <b>"${topic}"</b>...</p></div>`;

    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "getTopicDetails", subject: sub, topic: topic })
        });
        const data = await res.json();
        content.innerHTML = `<h2>${topic}</h2>` + formatAIResponse(data.content);
        if (window.MathJax) MathJax.typesetPromise([content]);
    } catch (e) { content.innerHTML = "❌ Помилка завантаження. Спробуй пізніше."; }
}

// Тестування
async function startQuiz() {
    selectedSubject = document.getElementById('subject-select').value;
    score = 0; currentQ = 1;
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('quiz-screen').classList.remove('hidden');
    getAIQuestion();
}

async function getAIQuestion() {
    const topic = subjectsData[selectedSubject][Math.floor(Math.random() * subjectsData[selectedSubject].length)];
    const container = document.getElementById('options-container');
    const qText = document.getElementById('question-text');
    
    qText.innerText = "AI формулює питання...";
    container.innerHTML = "";
    document.getElementById('loading-msg').classList.remove('hidden');

    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "generateQuestion", subject: selectedSubject, topic: topic })
        });
        const data = await res.json();
        qText.innerText = data.q;
        data.a.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'main-btn quiz-opt';
            btn.innerText = opt;
            btn.onclick = () => checkAnswer(idx, data.correct, btn);
            container.appendChild(btn);
        });
        if (window.MathJax) MathJax.typesetPromise();
    } catch (e) { qText.innerText = "❌ Помилка AI"; }
    finally { document.getElementById('loading-msg').classList.add('hidden'); }
}

function checkAnswer(selected, correct, btn) {
    const allBtns = document.querySelectorAll('.quiz-opt');
    allBtns.forEach(b => b.disabled = true);
    if (selected === correct) { btn.style.background = "#22c55e"; score++; }
    else { btn.style.background = "#ef4444"; allBtns[correct].style.background = "#22c55e"; }

    setTimeout(() => {
        if (currentQ < TOTAL_QUESTIONS) { currentQ++; getAIQuestion(); }
        else { showResults(); }
    }, 2000);
}

async function showResults() {
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
    const msg = document.getElementById('result-message');
    msg.innerText = "⏳ Аналіз результатів...";
    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "analyze", score: score, total: TOTAL_QUESTIONS, subject: selectedSubject })
        });
        const data = await res.json();
        msg.innerText = data.analysis;
    } catch (e) { msg.innerText = "Чудова робота!"; }
}

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id + '-section').classList.remove('hidden');
    document.getElementById('btn-test').classList.toggle('active', id === 'test');
    document.getElementById('btn-study').classList.toggle('active', id === 'study');
}

function formatAIResponse(text) {
    return text.replace(/## (.*?)\n/g, '<h3>$1</h3>')
               .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
               .replace(/\n/g, '<br>');
}

window.onload = init;
