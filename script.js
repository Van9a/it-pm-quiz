const GAS_URL = "https://script.google.com/macros/s/AKfycbzI2pNEN4YcARCmCSI-Qcbl7aLvZhx-HlhmqvszeAHw-4iM9Xc8_iYgozaxxn0Dztacpw/exec";

const subjectsData = {
    "Менеджмент 073": ["4 функції менеджменту", "SWOT-аналіз", "Маркетинг 4P", "Стилі керівництва", "Мотивація"],
    "Математика": ["Похідна", "Інтеграл", "Логарифми", "Тригонометрія", "Вектори", "Геометрія"],
    "Українська мова": ["Наголоси", "Морфологія", "Синтаксис", "Пунктуація", "Фразеологія"],
    "Історія України": ["Козаччина", "Революція 1917-21", "Друга світова війна", "Сучасна Україна"]
};

let score = 0, currentQ = 1, TOTAL_QUESTIONS = 5, quizQuestions = [], selectedSubject = "", selectedTopic = "";

function init() {
    console.log("🚀 Тренажер v25.0 (З повернутим списком!) активовано!");
    
    // Ініціалізація списків для тестів
    const subSelect = document.getElementById('subject-select');
    if (subSelect) {
        subSelect.innerHTML = "";
        for (let sub in subjectsData) {
            let opt = document.createElement('option');
            opt.value = sub; opt.innerText = sub;
            subSelect.appendChild(opt);
        }
        subSelect.onchange = updateTopicDropdown;
        updateTopicDropdown();
    }
    
    // ВІДНОВЛЕНО: Малюємо список тем для вкладки "План навчання"
    renderSyllabus();
}

function renderSyllabus() {
    // Шукаємо контейнер для плану навчання (якщо його немає, створюємо під заголовком)
    let container = document.getElementById('syllabus-list');
    if (!container) {
        const section = document.getElementById('syllabus-section');
        if (!section) return;
        container = document.createElement('div');
        container.id = 'syllabus-list';
        section.appendChild(container);
    }

    container.innerHTML = "";
    
    // Генеруємо красивий список
    for (let sub in subjectsData) {
        let block = document.createElement('div');
        block.style.marginBottom = "20px";
        block.innerHTML = `<h3 style="color: #2563eb; margin-bottom: 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">📚 ${sub}</h3>`;
        
        let ul = document.createElement('ul');
        ul.style.listStyleType = "none";
        ul.style.padding = "0";
        ul.style.display = "flex";
        ul.style.flexDirection = "column";
        ul.style.gap = "8px";

        subjectsData[sub].forEach(topic => {
            let li = document.createElement('li');
            li.innerHTML = `<button onclick="learnTopic('${sub}', '${topic}')" style="width: 100%; text-align: left; padding: 12px 15px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; cursor: pointer; font-size: 16px; transition: 0.2s;">📖 ${topic}</button>`;
            
            // Додаємо ефект наведення
            li.firstElementChild.onmouseover = function() { this.style.background = '#e2e8f0'; };
            li.firstElementChild.onmouseout = function() { this.style.background = '#f8fafc'; };
            
            ul.appendChild(li);
        });
        
        block.appendChild(ul);
        container.appendChild(block);
    }
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

// Наш надійний GET-запит
async function fetchFromAI(payload) {
    try {
        const params = new URLSearchParams(payload).toString();
        const url = `${GAS_URL}?${params}`;

        const res = await fetch(url, { method: 'GET' });
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
        return { error: true, message: "Помилка зв'язку з сервером." };
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
    qText.innerHTML = "🔍 Завантаження питань...<br><span style='font-size:14px; color:#666;'>(Якщо бази немає, AI генерує нову)</span>";
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
            if (idx === currentData.correct) { btn.style.background = "#22c55e"; btn.style.color = "#fff"; score++; }
            else { 
                btn.style.background = "#ef4444"; btn.style.color = "#fff"; 
                btns[currentData.correct].style.background = "#22c55e"; btns[currentData.correct].style.color = "#fff"; 
            }
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
    content.innerHTML = `
        <div style="text-align:center; padding: 40px;">
            <p style="font-size: 18px;">⌛ Пишемо лекцію...</p>
            <p style="color: #666;">(Якщо ти відкриваєш цю тему вперше, AI згенерує текст. Це займе до 10 секунд)</p>
        </div>`;
    
    const data = await fetchFromAI({ action: "getTopicDetails", subject: sub, topic: topic });
    
    if (data.isQuota) return handleQuota(content, data.waitTime, () => learnTopic(sub, topic));
    if (data.error) { content.innerHTML = "<p style='color:red;'>⚠️ Помилка: " + data.message + "</p>"; return; }
    
    // Форматуємо Markdown жирний текст (**)
    let formattedContent = data.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    content.innerHTML = `<h2>${topic}</h2><div style="line-height:1.6; font-size: 16px;">${formattedContent.replace(/\n/g, '<br>')}</div>`;
}

function handleQuota(container, time, retry) {
    container.innerHTML = `
        <div style="text-align:center; padding: 20px;">
            <p>⏳ AI перевантажений. Авто-повтор через <span id="timer-sec">${time}</span> сек...</p>
            <div style="width:100%; background:#eee; height:10px; border-radius:5px; margin-top: 10px;">
                <div id="pbar" style="width:100%; background:#3b82f6; height:100%; transition:1s linear; border-radius:5px;"></div>
            </div>
        </div>`;
    let left = time;
    const int = setInterval(() => {
        left--;
        const pbar = document.getElementById('pbar');
        const timer = document.getElementById('timer-sec');
        if (pbar) pbar.style.width = (left / time) * 100 + '%';
        if (timer) timer.innerText = left;
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
