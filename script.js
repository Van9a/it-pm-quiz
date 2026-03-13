/**
 * PUET AI EXPERT - v9.6
 * Актуальний URL: AKfycbxIpG_qoVbimsDMIYnUSWOsGa-P-T4wTGnUUOiavMNMSWnXPefWagU4seXiVR6tS2R5Dg
 */

const GAS_URL = "https://script.google.com/macros/s/AKfycbxIpG_qoVbimsDMIYnUSWOsGa-P-T4wTGnUUOiavMNMSWnXPefWagU4seXiVR6tS2R5Dg/exec";

const subjectsData = {
    "Математика": ["Логарифми", "Похідна", "Інтеграл", "Тригонометрія", "Вектори", "Геометрія"],
    "Українська мова": ["Наголоси", "Морфологія", "Синтаксис", "Пунктуація", "Фразеологія"],
    "Історія України": ["Козаччина", "Революція 1917-21", "Друга світова", "Сучасна Україна"],
    "Менеджмент 073": ["4 функції менеджменту", "SWOT-аналіз", "Маркетинг 4P", "Стилі керівництва", "Мотивація"]
};

let score = 0, currentQ = 1, TOTAL_QUESTIONS = 5;
let selectedSubject = "", selectedTopic = "";
let nextQuestionBuffer = null;

function init() {
    console.log("🚀 Скрипт запущено. Підключено URL: " + GAS_URL.substring(0, 45) + "...");
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
    const startTime = performance.now();
    try {
        const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const rawText = await res.text();
        
        // Видаляємо можливий Markdown та зайві пробіли
        const cleanText = rawText.replace(/```json|```/g, "").trim();
        
        if (!cleanText) throw new Error("Сервер повернув порожню відповідь");

        const data = JSON.parse(cleanText);
        console.log(`✅ [${payload.action}] виконано за ${((performance.now() - startTime)/1000).toFixed(2)}с`);
        
        if (data.error) throw new Error(data.message);
        return data;
    } catch (e) {
        console.error("🚨 Помилка діагностики:", e.message);
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
        qText.innerHTML = `<span style="color:#ef4444">⚠️ ${data?.message || "Помилка завантаження"}. Спробуйте ще раз.</span>`;
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

    // Pre-fetch наступного питання
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
    content.innerHTML = `<p>⌛ Готуємо лекцію...</p>`;
    const data = await fetchFromAI({ action: "getTopicDetails", subject: sub, topic: topic });
    content.innerHTML = `<h2>${topic}</h2>` + formatAIResponse(data.content || "Не вдалося завантажити контент.");
    if (window.MathJax) MathJax.typesetPromise([content]);
}

async function showResults() {
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
    const msg = document.getElementById('result-message');
    msg.innerText = "⏳ AI аналізує твої успіхи...";
    const data = await fetchFromAI({ action: "analyze", score: score, total: TOTAL_QUESTIONS, subject: selectedSubject });
    msg.innerHTML = formatAIResponse(data.analysis || "Тест завершено!");
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
