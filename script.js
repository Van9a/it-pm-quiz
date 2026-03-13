const GAS_URL = "https://script.google.com/macros/s/AKfycbzI2pNEN4YcARCmCSI-Qcbl7aLvZhx-HlhmqvszeAHw-4iM9Xc8_iYgozaxxn0Dztacpw/exec";

const subjectsData = {
    "Менеджмент 073": ["4 функції менеджменту", "SWOT-аналіз", "Маркетинг 4P", "Стилі керівництва", "Мотивація"],
    "Математика": ["Похідна", "Інтеграл", "Логарифми", "Тригонометрія", "Вектори", "Геометрія"],
    "Українська мова": ["Наголоси", "Морфологія", "Синтаксис", "Пунктуація", "Фразеологія"],
    "Історія України": ["Козаччина", "Революція 1917-21", "Друга світова війна", "Сучасна Україна"]
};

let score = 0, currentQ = 1, TOTAL_QUESTIONS = 5, quizQuestions = [], selectedSubject = "", selectedTopic = "";

function init() {
    console.log("🚀 Тренажер v19.0 (SENIOR FIX) активовано!");
    const subSelect = document.getElementById('subject-select');
    if (!subSelect) return;
    
    subSelect.innerHTML = "";
    for (let sub in subjectsData) {
        let opt = document.createElement('option');
        opt.value = sub; opt.innerText = sub;
        subSelect.appendChild(opt);
    }
    subSelect.onchange = updateTopicDropdown;
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

// 🛡️ Секретна зброя: відправляємо запит як plain-text, щоб обійти CORS
// Переводимо запити на GET. Це повністю обходить перевірки CORS у браузері.
async function fetchFromAI(payload) {
    try {
        // Перетворюємо об'єкт {action: "...", subject: "..."} у рядок URL-параметрів
        const params = new URLSearchParams(payload).toString();
        const url = `${GAS_URL}?${params}`;

        const res = await fetch(url, { 
            method: 'GET' 
        });
        
        const data = await res.json();
        
        if (data.error && data.message && data.message.includes("Quota")) {
            let wait = 60;
            const m = data.message.match(/retry in (\d+)/);
            if (m) wait = Math.ceil(parseInt(m[1]));
            return { isQuota: true, waitTime: wait };
        }
        return data;
    } catch (e) {
        console.error("Fetch error:", e);
        return { error: true, message: "Помилка зв'язку. Якщо ви бачите це, переконайтеся що зробили деплой як 'Новая версия'." };
    }
}
async function startQuiz() {
    selectedSubject = document.getElementById('subject-select').value;
    const tVal = document.getElementById('topic-select').value;
    selectedTopic = tVal === "random" ? subjectsData[selectedSubject][Math.floor(Math.random()*subjectsData[selectedSubject].length)] : tVal;
    
    score = 0; currentQ = 1;
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('quiz-screen').classList.remove('hidden');
    loadQuestions();
}

async function loadQuestions() {
    const qText = document.getElementById('question-text');
    const container = document.getElementById('options-container');
    qText.innerText = "🔍 Завантаження питань з бази...";
    container.innerHTML = "";
    
    const data = await fetchFromAI({ action: "generateQuiz", subject: selectedSubject, topic: selectedTopic });
    
    if (data.isQuota) return handleQuota(container, data.waitTime, loadQuestions);
    if (data.error) { qText.innerText = "⚠️ Помилка: " + data.message; return; }
    
    quizQuestions = data;
    renderQuestion();
}

function renderQuestion() {
    const qText = document.getElementById('question-text');
    const container = document.getElementById('options-container');
    const currentData = quizQuestions[currentQ - 1];
    
    document.getElementById('quiz-progress').innerText = `Питання ${currentQ} з ${TOTAL_QUESTIONS}`;
    qText.innerText = currentData.q;
    container.innerHTML = "";
    
    currentData.a.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-opt';
        btn.innerText = opt;
        btn.onclick = () => {
            const btns = document.querySelectorAll('.quiz-opt');
            btns.forEach(b => b.disabled = true);
            if (idx === currentData.correct) { btn.style.background = "#22c55e"; score++; }
            else { btn.style.background = "#ef4444"; btns[currentData.correct].style.background = "#22c55e"; }
            setTimeout(() => {
                if (currentQ < TOTAL_QUESTIONS) { currentQ++; renderQuestion(); }
                else showResults();
            }, 1500);
        };
        container.appendChild(btn);
    });
}

async function learnTopic(sub, topic) {
    showSection('topic-detail');
    const content = document.getElementById('topic-content');
    content.innerHTML = "<p>⌛ Завантаження лекції з бази даних...</p>";
    
    const data = await fetchFromAI({ action: "getTopicDetails", subject: sub, topic: topic });
    
    if (data.isQuota) return handleQuota(content, data.waitTime, () => learnTopic(sub, topic));
    if (data.error) { content.innerHTML = "<p style='color:red;'>⚠️ Помилка: " + data.message + "</p>"; return; }
    
    content.innerHTML = `<h2>${topic}</h2><div style="line-height:1.6;">${data.content.replace(/\n/g, '<br>')}</div>`;
}

function handleQuota(container, time, retry) {
    container.innerHTML = `
        <div style="text-align:center; padding: 20px;">
            <p>⏳ AI перевантажений. Авто-повтор через ${time} сек...</p>
            <div style="width:100%; background:#eee; height:10px; border-radius:5px;">
                <div id="pbar" style="width:100%; background:#ef4444; height:100%; transition:1s linear;"></div>
            </div>
        </div>`;
    let left = time;
    const int = setInterval(() => {
        left--;
        const pbar = document.getElementById('pbar');
        if (pbar) pbar.style.width = (left / time) * 100 + '%';
        if (left <= 0) { clearInterval(int); retry(); }
    }, 1000);
}

async function showResults() {
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
    const msg = document.getElementById('result-message');
    msg.innerText = "⏳ Отримання аналізу...";
    const data = await fetchFromAI({ action: "analyze", score: score, total: TOTAL_QUESTIONS });
    msg.innerHTML = data.analysis ? data.analysis.replace(/\n/g, '<br>') : "Аналіз завершено.";
}

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id + '-section').classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', init);
