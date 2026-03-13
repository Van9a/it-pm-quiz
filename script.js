// 🔗 Твій бекенд (завжди перевіряй актуальність URL після деплою)
const GAS_URL = "https://script.google.com/macros/s/AKfycbzCkYy2XVplEL3qgx9HXKSIQKOGZnZSLYN6x512mZ6xHoKFdN24U8AC0YiuoMRm-eu_VA/exec";

// 📚 База тем (можеш доповнювати цей масив)
const subjectsData = {
    "Математика": ["Числа, вирази та модулі", "Логарифми", "Похідна", "Інтеграл", "Тригонометрія", "Геометрія", "Вектори"],
    "Українська мова": ["Наголоси", "Фонетика", "Морфологія", "Синтаксис", "Пунктуація", "Фразеологія"],
    "Історія України": ["Козаччина", "XIX століття", "Революція 1917-21", "Друга світова", "Сучасність"],
    "Менеджмент 073": ["4 функції менеджменту", "SWOT-аналіз", "Маркетинг 4P", "Стилі керівництва", "Мотивація"]
};

// Змінні стану
let score = 0, currentQ = 1, TOTAL_QUESTIONS = 5;
let selectedSubject = "", selectedTopic = "";
let nextQuestionBuffer = null; // "Буфер" для миттєвого відображення

/**
 * 1. ІНІЦІАЛІЗАЦІЯ
 */
function init() {
    const subSelect = document.getElementById('subject-select');
    const studyContainer = document.getElementById('study-list-container');
    if (!subSelect || !studyContainer) return;

    subSelect.innerHTML = "";
    for (let sub in subjectsData) {
        // Заповнюємо випадаючий список
        let opt = document.createElement('option');
        opt.value = sub; opt.innerText = sub;
        subSelect.appendChild(opt);

        // Малюємо картки навчання
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
 * 2. ОНОВЛЕННЯ ТЕМ ПРИ ЗМІНІ ПРЕДМЕТА
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
 * 3. ЯДРО ЗАПИТІВ ДО AI (з вимірюванням часу)
 */
async function fetchFromAI(payload) {
    const startTime = performance.now();
    console.log(`🚀 Запит [${payload.action}] відправлено...`);

    try {
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        const endTime = performance.now();
        console.log(`✅ Відповідь [${payload.action}] отримана за ${((endTime - startTime) / 1000).toFixed(2)} сек.`);
        
        if (data.error) throw new Error(data.message);
        return data;
    } catch (e) {
        console.error("🚨 Критична помилка AI:", e);
        return { 
            q: "Помилка завантаження (можливо, обірвався JSON). Спробуйте ще раз.", 
            a: ["Ок", "-", "-", "-"], 
            correct: 0 
        };
    }
}

/**
 * 4. ТЕСТУВАННЯ (З КЕШУВАННЯМ)
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
    
    let data;

    // Перевіряємо буфер
    if (nextQuestionBuffer) {
        data = nextQuestionBuffer;
        nextQuestionBuffer = null;
        loader.classList.add('hidden');
    } else {
        qText.innerText = "";
        loader.classList.remove('hidden');
        data = await fetchFromAI({ action: "generateQuestion", subject: selectedSubject, topic: selectedTopic });
        loader.classList.add('hidden');
    }

    qText.innerText = data.q;
    container.innerHTML = "";
    data.a.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-opt';
        btn.innerText = opt;
        btn.onclick = () => handleAnswer(idx, data.correct, btn);
        container.appendChild(btn);
    });

    // Оновлюємо формули
    if (window.MathJax) MathJax.typesetPromise([qText, container]);

    // 🔥 PRE-FETCH: вантажимо НАСТУПНЕ питання у фон, поки юзер думає
    if (currentQ < TOTAL_QUESTIONS) {
        fetchFromAI({ action: "generateQuestion", subject: selectedSubject, topic: selectedTopic }).then(res => {
            nextQuestionBuffer = res;
        });
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
            renderQuestion(); // Питання з'явиться миттєво з буфера
        } else {
            showResults();
        }
    }, 1800);
}

/**
 * 5. НАВЧАННЯ ТА АНАЛІЗ
 */
async function learnTopic(sub, topic) {
    showSection('topic-detail');
    const content = document.getElementById('topic-content');
    content.innerHTML = `<div style="text-align:center; padding:50px;"><p>⌛ Gemini готує лекцію <b>"${topic}"</b>...</p></div>`;
    
    const data = await fetchFromAI({ action: "getTopicDetails", subject: sub, topic: topic });
    content.innerHTML = `<h2>${topic}</h2>` + formatAIResponse(data.content);
    
    if (window.MathJax) {
        setTimeout(() => { MathJax.typesetPromise([content]); }, 100);
    }
}

async function showResults() {
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
    const msg = document.getElementById('result-message');
    msg.innerText = "⏳ AI-ментор аналізує результат...";
    
    const data = await fetchFromAI({ action: "analyze", score: score, total: TOTAL_QUESTIONS, subject: selectedSubject });
    msg.innerHTML = formatAIResponse(data.analysis);
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
    return text
        .replace(/### (.*?)\n/g, '<h3>$1</h3>')
        .replace(/## (.*?)\n/g, '<h2>$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
}

// Подія завантаження
document.addEventListener('DOMContentLoaded', init);
