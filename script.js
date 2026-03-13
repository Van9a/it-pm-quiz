/**
 * PUET AI EXPERT - FRONTEND v11.0
 * Оптимізовано під Gemini 2.5 Flash та Forced JSON Mode
 */

// 🔗 Твій актуальний URL деплою (v11+)
const GAS_URL = "https://script.google.com/macros/s/AKfycbxIpG_qoVbimsDMIYnUSWOsGa-P-T4wTGnUUOiavMNMSWnXPefWagU4seXiVR6tS2R5Dg/exec";

// 📚 База актуальних предметів та тем
const subjectsData = {
    "Менеджмент 073": ["4 функції менеджменту", "SWOT-аналіз", "Маркетинг 4P", "Стилі керівництва", "Мотивація", "Теорії менеджменту"],
    "Математика": ["Похідна", "Інтеграл", "Логарифми", "Тригонометрія", "Вектори", "Геометрія", "Комбінаторика"],
    "Українська мова": ["Наголоси", "Морфологія", "Синтаксис", "Пунктуація", "Фразеологія", "Орфографія"],
    "Історія України": ["Козаччина", "Революція 1917-21", "Друга світова війна", "Сучасна Україна"]
};

// Стан додатку
let score = 0, currentQ = 1, TOTAL_QUESTIONS = 5;
let selectedSubject = "", selectedTopic = "";
let nextQuestionBuffer = null; 

/**
 * 1. Ініціалізація інтерфейсу при завантаженні
 */
function init() {
    console.log("🚀 Тренажер запущено. Підключення до AI...");
    const subSelect = document.getElementById('subject-select');
    const studyContainer = document.getElementById('study-list-container');
    
    if (!subSelect) return;

    subSelect.innerHTML = "";
    for (let sub in subjectsData) {
        // Наповнюємо список вибору предмета
        let opt = document.createElement('option');
        opt.value = sub; opt.innerText = sub;
        subSelect.appendChild(opt);

        // Створюємо картки для розділу "План навчання"
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

/**
 * Оновлення тем при зміні предмета
 */
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

/**
 * 2. Ядро запитів до AI (з посиленою очисткою JSON)
