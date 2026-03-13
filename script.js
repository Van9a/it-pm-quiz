const GAS_URL = "https://script.google.com/macros/s/AKfycbxIpG_qoVbimsDMIYnUSWOsGa-P-T4wTGnUUOiavMNMSWnXPefWagU4seXiVR6tS2R5Dg/exec";

const subjectsData = {
    "Менеджмент 073": ["4 функції менеджменту", "SWOT-аналіз", "Маркетинг 4P", "Стилі керівництва", "Мотивація"],
    "Математика": ["Похідна", "Інтеграл", "Логарифми", "Тригонометрія", "Вектори", "Геометрія"],
    "Українська мова": ["Наголоси", "Морфологія", "Синтаксис", "Пунктуація", "Фразеологія"],
    "Історія України": ["Козаччина", "Революція 1917-21", "Друга світова війна", "Сучасна Україна"]
};

let score = 0, currentQ = 1, TOTAL_QUESTIONS = 5;
let selectedSubject = "", selectedTopic = "";
let nextQuestionBuffer = null; 

function init() {
    console.log("🚀 СКРИПТ ПРАЦЮЄ!");
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
    updateTopicDropdown();
}

async function fetchFromAI(payload) {
    try {
        const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        console.log("📡 Статус сервера:", res.status); // Має бути 200
        
        const text = await res.text();
        console.log("📥 Сирий текст відповіді:", text); 
        
        if (!text || text.trim() === "") {
            throw new Error("Сервер нічого не відповів (Empty Response)");
        }

        const data = JSON.parse(text.replace(/```json|```/g, "").trim());
        if (data.error) throw new Error(data.message);
        return data;
    } catch (e) {
        console.error("🚨 Помилка:", e.message);
        return { error: true, message: e.message };
    }
}

async function fetchFromAI(payload) {
    try {
        const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const text = await res.text();
        console.log("📥 Відповідь сервера:", text);
        const data = JSON.parse(text.replace(/```json|```/g, "").trim());
        return data;
    } catch (e) {
        console.error("🚨 Помилка:", e.message);
        return { error: true };
    }
}

async function startQuiz() {
    selectedSubject = document.getElementById('subject-select').value;
    const tVal = document.getElementById('topic-select').value;
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
    const data = await fetchFromAI({ action: "generateQuestion", subject: selectedSubject, topic: selectedTopic });
    loader.classList.add('hidden');

    if (!data || data.error) {
        qText.innerText = "⚠️ Помилка завантаження. Спробуй ще раз.";
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
    document.getElementById('topic-content').innerHTML = "<p>⌛ Завантаження...</p>";
    const data = await fetchFromAI({ action: "getTopicDetails", subject: sub, topic: topic });
    document.getElementById('topic-content').innerHTML = `<h2>${topic}</h2>${data.content || "Помилка"}`;
}

async function showResults() {
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
    const data = await fetchFromAI({ action: "analyze", score: score, total: TOTAL_QUESTIONS, subject: selectedSubject });
    document.getElementById('result-message').innerHTML = data.analysis || "Тест завершено!";
}

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id + '-section').classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', init);
