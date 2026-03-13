const GAS_URL = "https://script.google.com/macros/s/AKfycbyNNCCuYNGZLEi_lLyuegE_qtfibsjdJ9Qt-LpozcAW0E8AYF3RiUUerkB_aOiQ9BsjBg/exec";

const subjectsData = {
    "Менеджмент 073": ["4 функції менеджменту", "SWOT-аналіз", "Маркетинг 4P", "Стилі керівництва", "Мотивація"],
    "Математика": ["Похідна", "Інтеграл", "Логарифми", "Тригонометрія", "Вектори", "Геометрія"],
    "Українська мова": ["Наголоси", "Морфологія", "Синтаксис", "Пунктуація", "Фразеологія"],
    "Історія України": ["Козаччина", "Революція 1917-21", "Друга світова війна", "Сучасна Україна"]
};

let score = 0, currentQ = 1, TOTAL_QUESTIONS = 5;
let selectedSubject = "", selectedTopic = "";
let quizQuestions = []; 

function init() {
    console.log("🚀 Тренажер v17 (База Даних) активовано!"); 
    const subSelect = document.getElementById('subject-select');
    const studyContainer = document.getElementById('study-list-container');
    if (!subSelect) return;

    subSelect.innerHTML = "";
    for (let sub in subjectsData) {
        let opt = document.createElement('option');
        opt.value = sub; opt.innerText = sub;
        subSelect.appendChild(opt);

        if (studyContainer) {
            let cat = document.createElement('div');
            cat.innerHTML = `<h3 style="color:#2563eb; margin: 20px 0;">${sub}</h3>`;
            subjectsData[sub].forEach(topic => {
                let link = document.createElement('div');
                link.className = 'topic-link';
                link.innerText = `📖 ${topic}`;
                link.onclick = () => learnTopic(sub, topic);
                cat.appendChild(link);
            });
            studyContainer.appendChild(cat);
        }
    }
    subSelect.onchange = updateTopicDropdown;
    updateTopicDropdown();
}

function updateTopicDropdown() {
    const sub = document.getElementById('subject-select').value;
    const topicSelect = document.getElementById('topic-select');
    if (!topicSelect) return;
    
    topicSelect.innerHTML = '<option value="random">🎲 Випадкова тема</option>';
    if (subjectsData[sub]) {
        subjectsData[sub].forEach(t => {
            let opt = document.createElement('option');
            opt.value = t; opt.innerText = t;
            topicSelect.appendChild(opt);
        });
    }
}

async function fetchFromAI(payload) {
    try {
        const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const text = await res.text();
        const data = JSON.parse(text.replace(/```json|```/g, "").trim());
        
        if (data.error && data.message.includes("Quota exceeded")) {
            let waitTime = 60;
            const match = data.message.match(/retry in (\d+(\.\d+)?)s/);
            if (match) waitTime = Math.ceil(parseFloat(match[1]));
            return { error: true, isQuota: true, waitTime: waitTime };
        }
        
        if (data.error) throw new Error(data.message);
        return data;
    } catch (e) {
        console.error("🚨 Помилка:", e.message);
        return { error: true, message: e.message };
    }
}

function handleQuotaCooldown(container, waitTime, retryCallback) {
    container.innerHTML = `
        <div style="text-align:center; padding: 20px; border: 2px dashed #e5e7eb; border-radius: 10px;">
            <p style="color:#ef4444; font-weight:bold; font-size: 16px;">
                ⏳ AI генерує базу. Залишилось <span id="cd-sec">${waitTime}</span> сек...
            </p>
            <div style="width:100%; background:#f3f4f6; height:12px; border-radius:6px; margin: 15px 0; overflow:hidden;">
                <div id="cd-bar" style="width:100%; height:100%; background:#ef4444; transition:width 1s linear;"></div>
            </div>
            <button id="cd-btn" style="padding: 10px 20px; border:none; border-radius:8px; font-weight:bold; background:#9ca3af; color:white; cursor:not-allowed;" disabled>
                Зачекайте...
            </button>
        </div>
    `;

    let left = waitTime;
    const timer = setInterval(() => {
        left--;
        let percent = (left / waitTime) * 100;
        const secEl = document.getElementById('cd-sec');
        const barEl = document.getElementById('cd-bar');
        
        if (secEl) secEl.innerText = left;
        if (barEl) barEl.style.width = percent + '%';

        if (left <= 0) {
            clearInterval(timer);
            const btn = document.getElementById('cd-btn');
            if (btn) {
                btn.innerText = "🚀 Продовжити";
                btn.disabled = false;
                btn.style.background = "#22c55e";
                btn.style.cursor = "pointer";
                btn.onclick = retryCallback;
            }
        }
    }, 1000);
}

async function startQuiz() {
    selectedSubject = document.getElementById('subject-select').value;
    const tVal = document.getElementById('topic-select').value;
    selectedTopic = (tVal === "random") ? subjectsData[selectedSubject][Math.floor(Math.random()*subjectsData[selectedSubject].length)] : tVal;
    
    score = 0; currentQ = 1; quizQuestions = [];
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('quiz-screen').classList.remove('hidden');
    
    const qText = document.getElementById('question-text');
    const container = document.getElementById('options-container');
    const loader = document.getElementById('loading-msg');
    
    qText.innerText = "🔍 Перевіряємо базу даних (якщо питань немає - AI їх згенерує)...";
    container.innerHTML = "";
    loader.classList.remove('hidden');

    const data = await fetchFromAI({ action: "generateQuiz", subject: selectedSubject, topic: selectedTopic });
    loader.classList.add('hidden');

    if (data && data.isQuota) {
        qText.innerText = "Google API просить зачекати хвилинку.";
        handleQuotaCooldown(container, data.waitTime, startQuiz);
        return;
    }

    if (!data || data.error || !Array.isArray(data)) {
        qText.innerText = "⚠️ Помилка генерації. " + (data?.message || "");
        container.innerHTML = `<button class="quiz-opt" onclick="startQuiz()">🔄 Спробувати ще раз</button>`;
        return;
    }

    quizQuestions = data;
    renderQuestion(); 
}

function renderQuestion() {
    const qText = document.getElementById('question-text');
    const container = document.getElementById('options-container');
    
    document.getElementById('quiz-progress').innerText = `Питання ${currentQ} з ${TOTAL_QUESTIONS}`;
    
    const currentData = quizQuestions[currentQ - 1];
    
    qText.innerText = currentData.q;
    container.innerHTML = "";
    currentData.a.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-opt';
        btn.innerText = opt;
        btn.onclick = () => handleAnswer(idx, currentData.correct, btn);
        container.appendChild(btn);
    });
}

function handleAnswer(selected, correct, btn) {
    const btns = document.querySelectorAll('.quiz-opt');
    btns.forEach(b => b.disabled = true);
    if (selected === correct) {
        btn.style.background = "#22c55e"; score++;
    } else {
        btn.style.background = "#ef4444";
        btns[correct].style.background = "#22c55e";
    }
    setTimeout(() => {
        if (currentQ < TOTAL_QUESTIONS) { 
            currentQ++; 
            renderQuestion(); 
        } else { 
            showResults(); 
        }
    }, 1500);
}

async function learnTopic(sub, topic) {
    showSection('topic-detail');
    const content = document.getElementById('topic-content');
    
    const cacheKey = `lecture_${sub}_${topic}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
        content.innerHTML = `<h2>${topic}</h2>${cachedData.replace(/\n/g, '<br>')}`;
        return; 
    }

    content.innerHTML = "<p>⌛ Завантаження матеріалу...</p>";
    
    const data = await fetchFromAI({ action: "getTopicDetails", subject: sub, topic: topic });
    
    if (data && data.isQuota) {
        handleQuotaCooldown(content, data.waitTime, () => learnTopic(sub, topic));
    } else if (data && data.error) {
        content.innerHTML = `<h2>${topic}</h2><p style="color:red;">Помилка: ${data.message}</p><button onclick="learnTopic('${sub}', '${topic}')">🔄 Повторити</button>`;
    } else {
        localStorage.setItem(cacheKey, data.content);
        content.innerHTML = `<h2>${topic}</h2>${data.content.replace(/\n/g, '<br>')}`;
    }
}

async function showResults() {
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
    const msg = document.getElementById('result-message');
    msg.innerText = "⏳ AI готує підсумок...";
    
    const data = await fetchFromAI({ action: "analyze", score: score, total: TOTAL_QUESTIONS, subject: selectedSubject });
    
    if (data && data.isQuota) {
        handleQuotaCooldown(msg, data.waitTime, showResults);
    } else if (data && data.error) {
        msg.innerHTML = "Тест завершено! Аналіз недоступний.";
    } else {
        msg.innerHTML = data && data.analysis ? data.analysis.replace(/\n/g, '<br>') : "Тест завершено!";
    }
}

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id + '-section');
    if (target) target.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', init);
