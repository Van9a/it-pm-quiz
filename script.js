const GAS_URL = "https://script.google.com/macros/s/AKfycbxIpG_qoVbimsDMIYnUSWOsGa-P-T4wTGnUUOiavMNMSWnXPefWagU4seXiVR6tS2R5Dg/exec";

const subjectsData = {
    "Менеджмент 073": ["4 функції менеджменту", "SWOT-аналіз", "Маркетинг 4P", "Стилі керівництва", "Мотивація"],
    "Математика": ["Похідна", "Інтеграл", "Логарифми", "Тригонометрія", "Вектори", "Геометрія"],
    "Українська мова": ["Наголоси", "Морфологія", "Синтаксис", "Пунктуація", "Фразеологія"],
    "Історія України": ["Козаччина", "Революція 1917-21", "Друга світова війна", "Сучасна Україна"]
};

let score = 0, currentQ = 1, TOTAL_QUESTIONS = 5;
let selectedSubject = "", selectedTopic = "";

function init() {
    console.log("🚀 Економний режим активовано!");
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
        
        // Якщо Google свариться на квоти
        if (data.error && data.message.includes("Quota exceeded")) {
            return { error: true, message: "⏳ AI відпочиває. Зачекай 60 секунд і спробуй знову (ліміт безкоштовних запитів)." };
        }
        
        if (data.error) throw new Error(data.message);
        return data;
    } catch (e) {
        console.error("🚨 Помилка:", e.message);
        return { error: true, message: e.message };
    }
}

async function startQuiz() {
    const subSelect = document.getElementById('subject-select');
    const topicSelect = document.getElementById('topic-select');
    
    selectedSubject = subSelect.value;
    const tVal = topicSelect.value;
    selectedTopic = (tVal === "random") ? subjectsData[selectedSubject][Math.floor(Math.random()*subjectsData[selectedSubject].length)] : tVal;
    
    score = 0; currentQ = 1;
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('quiz-screen').classList.remove('hidden');
    renderQuestion(); 
}

async function renderQuestion() {
    const qText = document.getElementById('question-text');
    const container = document.getElementById('options-container');
    const loader = document.getElementById('loading-msg');
    
    document.getElementById('quiz-progress').innerText = `Питання ${currentQ} з ${TOTAL_QUESTIONS}`;
    qText.innerText = "";
    loader.classList.remove('hidden');
    
    // Робимо тільки ОДИН запит на одне питання
    const data = await fetchFromAI({ action: "generateQuestion", subject: selectedSubject, topic: selectedTopic });
    loader.classList.add('hidden');

    if (!data || data.error) {
        qText.innerText = "⚠️ " + (data?.message || "Помилка завантаження.");
        container.innerHTML = `<button class="quiz-opt" onclick="renderQuestion()">🔄 Спробувати ще раз</button>`;
        return;
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
        if (currentQ < TOTAL_QUESTIONS) { currentQ++; renderQuestion(); }
        else { showResults(); }
    }, 1500);
}

async function learnTopic(sub, topic) {
    showSection('topic-detail');
    document.getElementById('topic-content').innerHTML = "<p>⌛ Завантаження матеріалу (може зайняти кілька секунд)...</p>";
    const data = await fetchFromAI({ action: "getTopicDetails", subject: sub, topic: topic });
    
    if (data && data.error) {
        document.getElementById('topic-content').innerHTML = `<h2>${topic}</h2><p style="color:red;">${data.message}</p><button onclick="learnTopic('${sub}', '${topic}')">🔄 Повторити спробу</button>`;
    } else {
        document.getElementById('topic-content').innerHTML = `<h2>${topic}</h2>${data.content.replace(/\n/g, '<br>')}`;
    }
}

async function showResults() {
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
    const msg = document.getElementById('result-message');
    msg.innerText = "⏳ AI готує підсумок...";
    const data = await fetchFromAI({ action: "analyze", score: score, total: TOTAL_QUESTIONS, subject: selectedSubject });
    
    if (data && data.error) {
        msg.innerHTML = "Тест завершено! (Аналіз недоступний через ліміт запитів)";
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
