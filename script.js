// 🔗 Твій постійний бекенд
const GAS_URL = "https://script.google.com/macros/s/AKfycbzCkYy2XVplEL3qgx9HXKSIQKOGZnZSLYN6x512mZ6xHoKFdN24U8AC0YiuoMRm-eu_VA/exec";

// 📚 ПОВНИЙ СПИСОК ТЕМ НМТ 2026
const subjectsData = {
    "Математика": [
        "Числа, вирази та модулі",
        "Показникові та логарифмічні рівняння",
        "Похідна функції та її застосування",
        "Інтеграл та площа фігур",
        "Тригонометрія: формули та рівняння",
        "Планіметрія (трикутники, кола)",
        "Стереометрія (об'єми тіл)",
        "Вектори та координати"
    ],
    "Українська мова": [
        "Наголоси (обов'язковий список УЦОЯО)",
        "Фонетика та уподібнення приголосних",
        "Морфологія: відмінювання числівників",
        "Синтаксис складного речення",
        "Пунктуація: коми, тире, двокрапка",
        "Лексикологія та фразеологія"
    ],
    "Історія України": [
        "Козаччина та доба Руїни",
        "Українські землі у XIX столітті",
        "Українська революція 1917-1921",
        "Україна в роки Другої світової війни",
        "Сучасна історія (1991-2026)"
    ],
    "Менеджмент 073": [
        "4 функції менеджменту (Планування...)",
        "SWOT-аналіз: теорія та практика",
        "Маркетинг-мікс 4P",
        "Стилі керівництва за Адізесом",
        "Теорії мотивації (Маслоу, Герцберг)"
    ]
};

// Глобальні змінні стану
let score = 0;
let currentQ = 0;
const TOTAL_QUESTIONS = 5;
let selectedSubject = "";
let selectedTopic = "";

// 1. ІНІЦІАЛІЗАЦІЯ (запуск при завантаженні сторінки)
function init() {
    const subSelect = document.getElementById('subject-select');
    const studyContainer = document.getElementById('study-list-container');
    if (!subSelect || !studyContainer) return;

    // Очищуємо контейнери
    subSelect.innerHTML = "";
    studyContainer.innerHTML = "";

    for (let sub in subjectsData) {
        // Заповнюємо вибір предметів для тесту
        let opt = document.createElement('option');
        opt.value = sub; opt.innerText = sub;
        subSelect.appendChild(opt);

        // Заповнюємо розділ "Навчання" картками
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

    // Вперше оновлюємо список тем для тесту
    updateTopicDropdown();
}

// 2. ОНОВЛЕННЯ СПИСКУ ТЕМ У ТЕСТІ (при зміні предмета)
function updateTopicDropdown() {
    const sub = document.getElementById('subject-select').value;
    const topicSelect = document.getElementById('topic-select');
    if (!topicSelect) return;

    topicSelect.innerHTML = "";

    // Додаємо опцію рандому
    let defaultOpt = document.createElement('option');
    defaultOpt.value = "random";
    defaultOpt.innerText = "🎲 Випадкова тема з курсу";
    topicSelect.appendChild(defaultOpt);

    // Додаємо конкретні теми
    subjectsData[sub].forEach(t => {
        let opt = document.createElement('option');
        opt.value = t; opt.innerText = t;
        topicSelect.appendChild(opt);
    });
}

// 3. ЛОГІКА ВИВЧЕННЯ ТЕМИ (УРОК)
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
        
        // Вставляємо текст (форматування через CSS white-space: pre-wrap)
        content.innerHTML = `<h2>${topic}</h2>` + formatAIResponse(data.content);
        
        // Рендеримо формули MathJax
        if (window.MathJax) {
            setTimeout(() => {
                MathJax.typesetPromise([content]).catch(err => console.log(err));
            }, 100);
        }
    } catch (e) { content.innerHTML = "❌ Помилка завантаження матеріалу."; }
}

// 4. ЛОГІКА ТЕСТУВАННЯ
async function startQuiz() {
    selectedSubject = document.getElementById('subject-select').value;
    const topicVal = document.getElementById('topic-select').value;
    
    // Визначаємо тему: обрана або випадкова
    if (topicVal === "random") {
        selectedTopic = subjectsData[selectedSubject][Math.floor(Math.random() * subjectsData[selectedSubject].length)];
    } else {
        selectedTopic = topicVal;
    }

    score = 0;
    currentQ = 1;
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('quiz-screen').classList.remove('hidden');
    getAIQuestion();
}

async function getAIQuestion() {
    const container = document.getElementById('options-container');
    const qText = document.getElementById('question-text');
    
    qText.innerText = `⏳ AI готує питання по темі: ${selectedTopic}...`;
    container.innerHTML = "";
    document.getElementById('loading-msg').classList.remove('hidden');

    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "generateQuestion", subject: selectedSubject, topic: selectedTopic })
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
    } catch (e) { qText.innerText = "❌ Помилка завантаження питання."; }
    finally { document.getElementById('loading-msg').classList.add('hidden'); }
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
            getAIQuestion();
        } else {
            showResults();
        }
    }, 2000);
}

async function showResults() {
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
    const msg = document.getElementById('result-message');
    msg.innerText = "⏳ AI-ментор аналізує твій результат...";
    
    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "analyze", score: score, total: TOTAL_QUESTIONS, subject: selectedSubject })
        });
        const data = await res.json();
        msg.innerHTML = formatAIResponse(data.analysis);
    } catch (e) { msg.innerText = "Чудовий результат! Продовжуй підготовку."; }
}

// 5. ДОПОМІЖНІ ФУНКЦІЇ
function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id + '-section');
    if (target) target.classList.remove('hidden');
    
    // Перемикання активності кнопок навігації
    if (id !== 'topic-detail') {
        const btnTest = document.getElementById('btn-test');
        const btnStudy = document.getElementById('btn-study');
        if (btnTest) btnTest.classList.toggle('active', id === 'test');
        if (btnStudy) btnStudy.classList.toggle('active', id === 'study');
    }
}

function formatAIResponse(text) {
    if (!text) return "";
    return text
        .replace(/### (.*?)\n/g, '<h3>$1</h3>')
        .replace(/## (.*?)\n/g, '<h2>$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
}

// Слухач зміни предмета
document.addEventListener('DOMContentLoaded', () => {
    init();
    const subSelect = document.getElementById('subject-select');
    if (subSelect) {
        subSelect.addEventListener('change', updateTopicDropdown);
    }
});
