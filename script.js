const GAS_URL = "https://script.google.com/macros/s/AKfycbxIpG_qoVbimsDMIYnUSWOsGa-P-T4wTGnUUOiavMNMSWnXPefWagU4seXiVR6tS2R5Dg/exec";

const subjectsData = {
    "Менеджмент 073": ["4 функції менеджменту", "SWOT-аналіз", "Маркетинг 4P", "Стилі керівництва", "Мотивація", "Теорії менеджменту"],
    "Математика": ["Похідна", "Інтеграл", "Логарифми", "Тригонометрія", "Вектори", "Геометрія", "Комбінаторика"],
    "Українська мова": ["Наголоси", "Морфологія", "Синтаксис", "Пунктуація", "Фразеологія", "Орфографія"],
    "Історія України": ["Козаччина", "Революція 1917-21", "Друга світова війна", "Сучасна Україна"]
};

let score = 0, currentQ = 1, TOTAL_QUESTIONS = 5;
let selectedSubject = "", selectedTopic = "";
let nextQuestionBuffer = null; 

function init() {
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
            cat.className = 'study-category';
            cat.innerHTML = `<h3 style="color:#2563eb; margin: 25px 0 10px 0;">${sub}</h3>`;
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

async function fetchFromAI(payload) {
    try {
        const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const rawText = await res.text();
        if (!rawText) return { error: true };
        const cleanText = rawText.replace(/```json|```/g, "").trim();
        const data = JSON.parse(cleanText);
        return data;
    } catch (e) {
        console.error("AI Error:", e.message);
        return { error: true, message: e.message };
    }
}

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
    const progress = document.getElementById('quiz-progress');
    if (progress) progress.innerText = `Питання ${currentQ} з ${TOTAL_QUESTIONS}`;
    let data;
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
        qText.innerHTML = `<span style="color:#ef4444">Помилка завантаження. Оновіть сторінку.</span>`;
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
    if (window.MathJax) MathJax.typesetPromise([qText, container]);
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
        if (currentQ < TOTAL_QUESTIONS) { currentQ++; renderQuestion(); }
        else { showResults(); }
    }, 1500);
}

async function learnTopic(sub, topic) {
    showSection('topic-detail');
    const content = document.getElementById('topic-content');
    content.innerHTML = `<p>⌛ Gemini готує лекцію...</p>`;
    const data = await fetchFromAI({ action: "getTopicDetails", subject: sub, topic: topic });
    content.innerHTML = `<h2>${topic}</h2>` + formatAIResponse(data.content || "Помилка завантаження.");
    if (window.MathJax) MathJax.typesetPromise([content]);
}

async function showResults() {
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
    const msg = document.getElementById('result-message');
    msg.innerText = "⏳ AI аналізує...";
    const data = await fetchFromAI({ action: "analyze", score: score, total: TOTAL_QUESTIONS, subject: selectedSubject });
    msg.innerHTML = data && data.analysis ? formatAIResponse(data.analysis) : "Тест завершено!";
}

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id + '-section');
    if (target) target.classList.remove('hidden');
}

function formatAIResponse(text) {
    if (!text) return "";
    return text.replace(/### (.*?)\n/g, '<h3>$1</h3>')
               .replace(/## (.*?)\n/g, '<h2>$1</h2>')
               .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
               .replace(/\n/g, '<br>');
}

document.addEventListener('DOMContentLoaded', init);
