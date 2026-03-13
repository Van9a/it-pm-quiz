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
    // Я змінив цей лог, щоб ми точно знали, що файл оновився
    console.log("🚀 Тренажер v15 (З таймером) активовано!"); 
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
        
        //
