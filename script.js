const GAS_URL = "https://script.google.com/macros/s/AKfycbzCkYy2XVplEL3qgx9HXKSIQKOGZnZSLYN6x512mZ6xHoKFdN24U8AC0YiuoMRm-eu_VA/exec";

// Твоя база знань
const subjectsData = {
    "Математика": ["Числа, вирази та модулі", "Логарифми", "Похідна", "Інтеграл", "Тригонометрія", "Геометрія", "Вектори"],
    "Українська мова": ["Наголоси", "Фонетика", "Морфологія", "Синтаксис", "Пунктуація", "Фразеологія"],
    "Історія України": ["Козаччина", "XIX століття", "Революція 1917-21", "Друга світова", "Сучасність"],
    "Менеджмент 073": ["4 функції менеджменту", "SWOT-аналіз", "Маркетинг 4P", "Стилі керівництва", "Теорії мотивації"]
};

let score = 0, currentQ = 1, TOTAL_QUESTIONS = 5;
let selectedSubject = "", selectedTopic = "";
let nextQuestionBuffer = null; // "Сейф" для наступного питання

function init() {
    const subSelect = document.getElementById('subject-select');
    const studyContainer = document.getElementById('study-list-container');
    if (!subSelect || !studyContainer) return;
    
    subSelect.innerHTML = "";
    for (let sub in subjectsData) {
        let opt = document.createElement('option');
        opt.value = sub; opt.innerText = sub;
        subSelect.appendChild(opt);
        
        let cat = document.createElement('div');
        cat.className = 'study-category';
        cat.innerHTML = `<h3>${sub}</h3>`;
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

// Фоновий запит до AI
async function fetchQuestion(sub, topic) {
    const res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: "generateQuestion", subject: sub, topic: topic })
    });
    return await res.json();
}

async function startQuiz() {
    selectedSubject = document.getElementById('subject-select').value;
    const tVal = document.getElementById('topic-select').value;
    selectedTopic = (tVal === "random") ? subjectsData[selectedSubject][Math.floor(Math.random()*subjectsData[selectedSubject].length)] : tVal;

    score = 0; currentQ = 1; nextQuestionBuffer = null;
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('quiz-screen').classList.remove('hidden');
    
    renderQuestion(); // Запуск першого питання
}

async function renderQuestion() {
    const qText = document.getElementById('question-text');
    const container = document.getElementById('options-container');
    document.getElementById('quiz-progress').innerText = `Питання ${currentQ} з ${TOTAL_QUESTIONS}`;
    
    let data;
