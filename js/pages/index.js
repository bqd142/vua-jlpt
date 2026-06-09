// ==========================================
// PHẦN 1: KHỞI TẠO VÀ TẢI DANH SÁCH ĐỀ THI
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('data/exams_manifest.json');
        
        if (!response.ok) {
            throw new Error("Không thể tải file exams_manifest.json");
        }
        
        const exams = await response.json();
        window.currentExamData = exams; 
        
        // Render ra màn hình
        renderExamList(exams);
        initCountdown();

    } catch (error) {
        console.error("Lỗi tải danh sách đề thi:", error);
        const listContainer = document.getElementById('exam-list-container');
        if (listContainer) {
            listContainer.innerHTML = '<div style="color: red; padding: 20px; border: 1px dashed red; border-radius: 8px;">Lỗi: Không thể kết nối tới cơ sở dữ liệu đề thi. Vui lòng kiểm tra lại file exams_manifest.json</div>';
        }
    }
});

// ==========================================
// PHẦN 2: HÀM RENDER DANH SÁCH ĐỀ JLPT
// ==========================================
function renderExamList(examDataArray) {
    const listContainer = document.getElementById('exam-list-container');
    if (!listContainer || !examDataArray) return;

    let html = '';
    const savedExams = JSON.parse(localStorage.getItem('saved_exams') || '{}');
    const completedExams = JSON.parse(localStorage.getItem('completed_exams') || '{}');

    // Sắp xếp: Ưu tiên đề đã "Lưu" (Saved) lên trên cùng
    const sortedExams = examDataArray.sort((a, b) => {
        const isSavedA = savedExams[a.id] ? 1 : 0;
        const isSavedB = savedExams[b.id] ? 1 : 0;
        return isSavedB - isSavedA; 
    });

    sortedExams.forEach(exam => {
        const isSaved = savedExams[exam.id];
        const isCompleted = completedExams[exam.id];

        const bgStyle = isCompleted ? 'background: #f0fdf4; border-color: #86efac;' : 'background: #fff; border-color: var(--border-color);';

        html += `
            <div class="exam-card" style="position: relative; padding: 20px; border: 1px solid; border-radius: 8px; margin-bottom: 15px; transition: 0.3s; ${bgStyle}">
                
                <h3 style="margin: 0 0 10px 0; padding-right: 70px; color: var(--primary-color);">${exam.title}</h3>
                
                <div style="position: absolute; right: 15px; top: 15px; display: flex; gap: 12px;">
                    <button onclick="toggleExamState('${exam.id}', 'saved')" title="Lưu đề này" style="background: none; border: none; font-size: 20px; cursor: pointer; padding: 0; filter: grayscale(${isSaved ? '0%' : '100%'}); opacity: ${isSaved ? '1' : '0.3'}; transition: 0.2s;">
                        📌
                    </button>
                    
                    <button onclick="toggleExamState('${exam.id}', 'completed')" title="Đánh dấu hoàn thành" style="background: none; border: none; font-size: 20px; cursor: pointer; padding: 0; filter: grayscale(${isCompleted ? '0%' : '100%'}); opacity: ${isCompleted ? '1' : '0.3'}; transition: 0.2s;">
                        ✅
                    </button>
                </div>

                <div style="color: var(--text-muted); font-size: 14px; margin-bottom: 15px;">${exam.description || 'Đề thi chuẩn JLPT'}</div>
                <button onclick="window.location.href='exam.html?id=${exam.id}'" style="padding: 8px 20px; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Làm bài</button>
            </div>
        `;
    });

    listContainer.innerHTML = html;
}

window.toggleExamState = function(examId, type) {
    const storageKey = type === 'saved' ? 'saved_exams' : 'completed_exams';
    let currentState = JSON.parse(localStorage.getItem(storageKey) || '{}');
    
    if (currentState[examId]) {
        delete currentState[examId];
    } else {
        currentState[examId] = true;
    }
    
    localStorage.setItem(storageKey, JSON.stringify(currentState));
    renderExamList(window.currentExamData); 
};


// ==========================================
// PHẦN 3: LOGIC SỔ TAY ÔN TẬP
// ==========================================
window.openFullNotebook = async function() {
    const modal = document.getElementById('full-notebook-modal');
    const contentDiv = document.getElementById('notebook-full-content');
    
    modal.style.display = 'block';
    contentDiv.innerHTML = '<div style="text-align:center; padding:50px; font-size: 18px;">⏳ Đang tổng hợp dữ liệu từ hệ thống...</div>';

    const flagged = JSON.parse(localStorage.getItem('flagged_questions') || '{}');
    const keys = Object.keys(flagged);
    
    if (keys.length === 0) {
        contentDiv.innerHTML = '<div style="text-align:center; padding:50px; color:gray; font-size: 18px;">Bạn chưa cắm cờ đánh dấu câu hỏi nào!</div>';
        return;
    }

    const examGroups = {};
    keys.forEach(key => {
        const parts = key.split('-');
        const qId = parts.pop();
        const examId = parts.join('-');
        if (!examGroups[examId]) examGroups[examId] = [];
        examGroups[examId].push(qId);
    });

    let finalHtml = '';

    for (const [examId, qIds] of Object.entries(examGroups)) {
        try {
            const res = await fetch(`data/${examId}.json`);
            if (!res.ok) continue; 
            
            let examData = await res.json();
            let mondais = Array.isArray(examData) ? examData : (examData.mondais || examData.data);
            const savedAnswers = JSON.parse(localStorage.getItem(`answers_${examId}`) || '{}');
            const timing = await DataService.getAudioTiming(examId);

            finalHtml += `<h3 style="margin-top: 30px; background: var(--primary-color); color: white; padding: 12px 20px; border-radius: 6px;">Đề: ${examId.replace(/_/g, ' ')}</h3>`;

            mondais.forEach(mondai => {
                if (!mondai.questions) return;
                
                const flaggedQsInMondai = mondai.questions.filter(q => qIds.includes(q.questionId));
                
                if (flaggedQsInMondai.length > 0) {
                    finalHtml += `<div style="border: 1px solid var(--border-color); padding: 25px; border-radius: 8px; margin-bottom: 25px; background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">`;
                    
                    if (mondai.type === 'passage' && mondai.passageData) {
                        finalHtml += `
                            <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid var(--secondary-color); margin-bottom: 25px; border-radius: 4px;">
                                <div style="font-weight: bold; color: var(--secondary-color); margin-bottom: 10px; font-size: 13px; text-transform: uppercase;">[Bài Đọc]</div>
                                ${mondai.passageData.title ? `<h4 style="margin-bottom:15px; font-size: 18px;">${QuestionCard.formatText(mondai.passageData.title)}</h4>` : ''}
                                <p style="white-space: pre-wrap; line-height: 1.8; font-size: 16px;">${QuestionCard.formatText(mondai.passageData.text)}</p>
                            </div>
                        `;
                    }

                    flaggedQsInMondai.forEach(q => {
                        finalHtml += `<div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px dashed #eee;">`;
                        finalHtml += QuestionCard.buildQuestionHTML(q, savedAnswers, examId, mondai, timing);
                        finalHtml += `</div>`;
                    });

                    finalHtml += `</div>`; 
                }
            });

        } catch(e) {
            console.error("Lỗi tải dữ liệu cho Sổ tay:", examId, e);
        }
    }

    contentDiv.innerHTML = finalHtml;
};

// ==========================================
// PHẦN 4: LẮNG NGHE SỰ KIỆN TƯƠNG TÁC TẠI TRANG CHỦ
// ==========================================
document.addEventListener('click', function(e) {
    // Xử lý BỎ CẮM CỜ ngay bên trong Sổ Tay
    const flagBtn = e.target.closest('.flag-btn');
    if (flagBtn) {
        const qid = flagBtn.getAttribute('data-qid');
        let flaggedQuestions = JSON.parse(localStorage.getItem('flagged_questions') || '{}');
        
        // Nếu câu hỏi đang có trong Sổ tay -> Xóa đi
        if (flaggedQuestions[qid]) {
            delete flaggedQuestions[qid];
            localStorage.setItem('flagged_questions', JSON.stringify(flaggedQuestions));
            
            // Reload lại giao diện Modal Sổ tay để câu vừa xóa biến mất
            window.openFullNotebook();
        }
    }
});

// ==========================================
// PHẦN 5: ĐẾM NGÀY TỚI KỲ THI (COUNTDOWN)
// Lấy ngày mục tiêu từ localStorage key: 'jlpt_exam_date' (ISO string)
// Nếu không có, hiển thị liên kết tới trang Cài đặt
// ==========================================
function initCountdown() {
    const elDays = document.getElementById('countdown-days');
    const elSub = document.getElementById('countdown-sub');
    if (!elDays) return;
    function firstSunday(year, monthIndex) {
        // monthIndex: 0-based (6 = July, 11 = December)
        const d = new Date(year, monthIndex, 1);
        const day = d.getDay();
        const delta = (7 - day) % 7; // days to add to reach Sunday
        return new Date(year, monthIndex, 1 + delta);
    }

    function getNextScheduledExam(today) {
        // allow manual override from localStorage
        const override = localStorage.getItem('jlpt_exam_date');
        if (override) {
            const parsed = new Date(override);
            if (!isNaN(parsed)) return parsed;
        }

        const y = today.getFullYear();
        const jul = firstSunday(y, 6);
        const dec = firstSunday(y, 11);

        // normalize to start of day
        const t0 = new Date(today); t0.setHours(0,0,0,0);
        const jul0 = new Date(jul); jul0.setHours(0,0,0,0);
        const dec0 = new Date(dec); dec0.setHours(0,0,0,0);

        if (t0 <= jul0 && (jul0 <= dec0 || t0 <= dec0)) {
            // before or on July
            return jul0;
        }

        if (t0 <= dec0 && (dec0 <= jul0 || t0 > jul0)) {
            return dec0;
        }

        // if passed both in this year, return next year's July
        const nextJul = firstSunday(y + 1, 6);
        nextJul.setHours(0,0,0,0);
        return nextJul;
    }

    function update() {
        const now = new Date();
        const target = getNextScheduledExam(now);
        if (!target || isNaN(target)) {
            elDays.textContent = '—';
            elSub.innerHTML = 'Không xác định được ngày thi. <a href="settings.html">Cài đặt</a>';
            return;
        }

        const msPerDay = 1000 * 60 * 60 * 24;
        const today0 = new Date(now); today0.setHours(0,0,0,0);
        const diff = Math.ceil((target.getTime() - today0.getTime()) / msPerDay);

        const month = target.getMonth() + 1;
        const year = target.getFullYear();

        if (diff > 0) {
            elDays.textContent = diff;
            elSub.textContent = `Còn ${diff} ngày tới kỳ thi (${month}/${year})`;
        } else if (diff === 0) {
            elDays.textContent = '0';
            elSub.textContent = `Hôm nay là ngày thi (${month}/${year})! 頑張って！`;
        } else {
            // should not happen, but handle gracefully
            elDays.textContent = Math.abs(diff);
            elSub.textContent = `Kỳ thi (${month}/${year}) đã diễn ra cách đây ${Math.abs(diff)} ngày`;
        }
    }

    update();
    setInterval(update, 60 * 60 * 1000);
}