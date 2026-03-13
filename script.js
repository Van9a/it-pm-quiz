// ... (початок скрипта та subjectsData залишаються без змін)

async function fetchFromAI(payload) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 сек таймаут на фронті

        const res = await fetch(GAS_URL, { 
            method: 'POST', 
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const rawText = await res.text();
        const cleanText = rawText.replace(/```json|```/g, "").trim();
        const data = JSON.parse(cleanText);
        
        if (data.error) throw new Error(data.message);
        return data;
    } catch (e) {
        console.warn("🚨 AI Request failed:", e.message);
        return null; // Повертаємо null, щоб не "ламати" UI
    }
}

async function showResults() {
    document.getElementById('quiz-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
    
    const msg = document.getElementById('result-message');
    msg.innerText = "⏳ AI готує твій аналіз...";
    
    const data = await fetchFromAI({ action: "analyze", score: score, total: TOTAL_QUESTIONS, subject: selectedSubject });
    
    if (data && data.analysis) {
        msg.innerHTML = formatAIResponse(data.analysis);
    } else {
        msg.innerHTML = "<b>Тест завершено!</b><br>Твій результат збережено. Спробуй ще раз, щоб покращити бал!";
    }
}

// ... (решта функцій learnTopic, renderQuestion тощо)
