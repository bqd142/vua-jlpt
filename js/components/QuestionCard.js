// js/components/QuestionCard.js

const SECTION_LABELS = {
    'moji_goi': 'Từ Vựng',
    'bunpou': 'Ngữ Pháp',
    'dokkai': 'Đọc Hiểu',
    'choukai': 'Nghe Hiểu'
};

const QuestionCard = {
    formatText(text) {
        if (!text) return '';
        let formatted = text.toString();

        formatted = formatted.replace(/<u\b[^>]*>([\s\S]*?)<\/u>/gi, '<span style="text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 2px; border-bottom: 2px solid var(--text-main);">$1</span>');
        formatted = formatted.replace(/<b\b[^>]*>([\s\S]*?)<\/b>/gi, '<strong style="font-weight: 900; color: var(--primary-color);">$1</strong>');
        formatted = formatted.replace(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi, '<strong style="font-weight: 900; color: var(--primary-color);">$1</strong>');
        formatted = formatted.replace(/<span[^>]*class="[^"]*underline[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '<span style="text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 2px;">$1</span>');
        formatted = formatted.replace(/\*\*([\s\S]*?)\*\*/g, '<strong style="font-weight: 900; color: var(--primary-color);">$1</strong>');
        formatted = formatted.replace(/__([\s\S]*?)__/g, '<span style="text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 2px;">$1</span>'); 
        formatted = formatted.replace(/_([^_]+)_/g, '<span style="text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 2px;">$1</span>');
        formatted = formatted.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<span style="text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 2px;">$1</span>');
        formatted = formatted.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong style="font-weight: 900; color: var(--primary-color);">$1</strong>');

        return formatted;
    },

    // 1. Render Thanh Menu bên trái (Palette) - ĐÃ VÁ LỖI AN TOÀN TRÁNH TRẮNG MÀN HÌNH
    renderPalette(examData, savedAnswers = {}) {
        let sectionNav = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding-bottom: 15px; margin-bottom: 15px; border-bottom: 1px solid var(--border-color);">';
        let qGrid = ''; 
        const existingSections = new Set(); 
        let currentExamIdTracker = null; 

        // Đọc dữ liệu cờ từ localStorage
        const flaggedQuestions = JSON.parse(localStorage.getItem('flagged_questions') || '{}');

        examData.forEach(mondai => {
            if(!mondai || !mondai.questions) return; 
            
            const sec = mondai.section;
            if (sec && !existingSections.has(sec)) {
                existingSections.add(sec);
                const displayName = SECTION_LABELS[sec] || sec;
                sectionNav += `<button class="mondai-anchor-btn" data-target="section-${sec}" style="background: var(--primary-color); color: white; border: none; padding: 10px 5px; border-radius: 4px; font-size: 13px; font-weight: bold; cursor: pointer;">${displayName}</button>`;
            }

            const examIdStr = mondai.examId || 'default';
            if (examIdStr !== currentExamIdTracker) {
                if (currentExamIdTracker !== null) {
                    qGrid += '</div><div style="height: 10px; border-bottom: 1px dashed #ccc; margin-bottom: 10px;"></div>';
                }
                qGrid += '<div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px;">';
                currentExamIdTracker = examIdStr;
            }

            mondai.questions.forEach(q => {
                const uniqueQid = mondai.examId ? `${mondai.examId}-${q.questionId}` : q.questionId;
                
                // Khối bắt lỗi cấu trúc dữ liệu câu hỏi đã làm cực kỳ an toàn
                let isAnswered = '';
                try {
                    if (savedAnswers) {
                        if (mondai.examId && savedAnswers[mondai.examId] && savedAnswers[mondai.examId].answers) {
                            isAnswered = savedAnswers[mondai.examId].answers[q.questionId] !== undefined ? 'answered' : '';
                        } else if (savedAnswers[uniqueQid] !== undefined) {
                            isAnswered = 'answered';
                        } else if (savedAnswers[q.questionId] !== undefined) {
                            isAnswered = 'answered';
                        }
                    }
                } catch(e) {
                    console.error("Lỗi parse dữ liệu tiến trình làm bài:", e);
                }

                // Hiển thị biểu tượng cờ nếu câu này bị đánh dấu
                const flagHtml = flaggedQuestions[uniqueQid] ? `<span class="palette-flag" style="position: absolute; top: -5px; right: -2px; font-size: 10px;">🚩</span>` : '';

                qGrid += `<div class="q-box ${isAnswered}" id="palette-${uniqueQid}" data-target="${uniqueQid}" style="position: relative;">
                    ${flagHtml}${q.number}
                </div>`;
            });
        });

        if (currentExamIdTracker !== null) {
            qGrid += '</div>';
        }

        return sectionNav + '</div>' + qGrid;
    },

    // 2. Render Nội dung làm bài chính
    renderFullExam(examData, savedAnswers = {}, audioTimingData = null) {
        let html = '';
        let currentSectionTracker = ''; 

        examData.forEach(mondai => {
            if(!mondai) return; 
            const sec = mondai.section || 'unknown';

            let anchorIdAttr = '';
            if (sec !== currentSectionTracker) {
                anchorIdAttr = `id="section-${sec}"`;
                currentSectionTracker = sec;
            }

            html += `<section class="mondai-section" ${anchorIdAttr} style="margin-bottom: 40px; scroll-margin-top: 80px;">`;
            
            let jpInstruction = mondai.instruction;
            if (!jpInstruction && mondai.questions && mondai.questions.length > 0) {
                jpInstruction = mondai.questions[0].instruction;
            }

            let headerHtml = `
                <div style="background: #f8f9fa; border-left: 5px solid var(--primary-color); padding: 15px 20px; border-radius: 4px; margin-bottom: 20px;">
                    <div style="font-size: 13px; font-weight: bold; color: var(--primary-color); text-transform: uppercase; margin-bottom: 8px;">
                        ${SECTION_LABELS[sec] || sec} - MONDAI ${mondai.mondai} 
                        ${mondai.examTitle ? `<span style="color:var(--text-muted); font-weight: normal; text-transform: none;">(${mondai.examTitle})</span>` : ''}
                    </div>
                    ${jpInstruction ? `<div style="font-size: 17px; font-weight: bold; color: var(--text-main); line-height: 1.5;">${this.formatText(jpInstruction)}</div>` : ''}
                </div>
            `;
            
            if (mondai.type === 'passage') {
                html += this.renderPassageLayout(mondai, savedAnswers, mondai.examId, headerHtml);
            } else {
                html += headerHtml + this.renderSingleLayout(mondai, savedAnswers, mondai.examId, audioTimingData);
            }
            
            html += `</section><hr style="border-top: 3px solid var(--border-color); margin: 40px 0;">`;
        });
        return html;
    },

    // 3. Render khối câu hỏi đơn
    renderSingleLayout(mondai, savedAnswers, mondaiExamId = null, audioTimingData = null) {
        let html = `<div class="questions-panel">`;
        mondai.questions.forEach(q => {
            html += `<div class="question-container" style="background: var(--panel-bg); padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 20px;">${this.buildQuestionHTML(q, savedAnswers, mondaiExamId, mondai,audioTimingData )}</div>`;
        });
        return html + `</div>`;
    },

    // 4. Render khối Đọc hiểu (Sticky Header & Passage)
    renderPassageLayout(mondai, savedAnswers, mondaiExamId = null, headerHtml = '') {
        let passageHtml = `
            <div class="passage-panel" style="position: sticky; top: 80px; height: fit-content; max-height: calc(100vh - 100px); overflow-y: auto; background: var(--panel-bg); padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                ${headerHtml}
                ${mondai.passageData.title ? `<h3 style="margin-bottom:15px; color: var(--primary-color); font-size: 18px;">${this.formatText(mondai.passageData.title)}</h3>` : ''}
                <p style="white-space: pre-wrap; font-size: 16px; line-height: 1.8;">${this.formatText(mondai.passageData.text)}</p>
            </div>
        `;
        
        let questionsHtml = `<div class="questions-panel" style="display: flex; flex-direction: column; gap: 20px;">`;
        mondai.questions.forEach(q => {
            questionsHtml += `<div class="question-container" style="background: var(--panel-bg); padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">${this.buildQuestionHTML(q, savedAnswers, mondaiExamId, mondai)}</div>`;
        });
        
        return `<div class="split-layout" style="display: flex; gap: 30px; align-items: flex-start;">${passageHtml}${questionsHtml}</div>`; 
    },

    // 5. Build HTML cho từng câu hỏi chi tiết
    buildQuestionHTML(
                        q,
                        savedAnswers,
                        mondaiExamId = null,
                        mondai = null, 
                        audioTimingData = null
                    ) {
        if (
    mondai &&
    mondai.section === 'choukai'
) {

        const timing =
            audioTimingData?.questions?.[
                q.questionId
            ];

        console.log(
            q.questionId,
            timing
        );
}   


        let savedValue;
        try {
            if (mondaiExamId && savedAnswers && savedAnswers[mondaiExamId] && savedAnswers[mondaiExamId].answers) {
                savedValue = savedAnswers[mondaiExamId].answers[q.questionId]; 
            } else if (savedAnswers) {
                savedValue = savedAnswers[q.questionId]; 
            }
        } catch(e) { savedValue = undefined; }

        const uniqueQid = mondaiExamId ? `${mondaiExamId}-${q.questionId}` : q.questionId;

        // Lấy trạng thái cờ từ localStorage
        const flaggedQuestions = JSON.parse(localStorage.getItem('flagged_questions') || '{}');
        const isFlagged = flaggedQuestions[uniqueQid];

        let optionsHtml = '';

if (
    q.displayType === 'hidden_options' ||
    q.displayType === 'image_only'
) {

    const labels = ['①', '②', '③', '④'];

    optionsHtml = q.options.map(opt => {

        const isChecked =
            savedValue == opt.id
                ? 'checked'
                : '';

        const examIdAttr =
            mondaiExamId
                ? `data-exam-id="${mondaiExamId}"`
                : '';

        return `
            <label class="option-label"
                   style="display:block; margin:10px 0;">
                <input type="radio"
                       name="${uniqueQid}"
                       value="${opt.id}"
                       ${examIdAttr}
                       ${isChecked}>
                ${labels[opt.id - 1]}
            </label>
        `;

    }).join('');

} else {

    optionsHtml = q.options.map(opt => {

        const isChecked =
            savedValue == opt.id
                ? 'checked'
                : '';

        const examIdAttr =
            mondaiExamId
                ? `data-exam-id="${mondaiExamId}"`
                : '';

        return `
            <label class="option-label"
                   style="display:block; margin:10px 0;">
                <input type="radio"
                       name="${uniqueQid}"
                       value="${opt.id}"
                       ${examIdAttr}
                       ${isChecked}>
                ${this.formatText(opt.text)}
            </label>
        `;

    }).join('');
}
        let audioButtonHtml = '';

if (
    mondai &&
    mondai.section === 'choukai'
) {

    const timing =
        audioTimingData?.questions?.[
            q.questionId
        ];

    if (timing) {

        audioButtonHtml = `
            <button
                class="play-question-audio"
                data-question-id="${q.questionId}"
                data-start="${timing.start}"
                data-end="${timing.end}"
                style="
                    margin-bottom:15px;
                    padding:8px 14px;
                    cursor:pointer;
                "
            >
                ▶ Nghe câu này
            </button>
        `;
    }
}
        let displayContent = q.content || '';
        let imageHtml = '';
        if (
            mondai &&
            mondai.section === 'choukai'
        ) {

            const imagePath =
                `/assets/images/choukai/${mondai.examCode}_M${mondai.mondai}_${q.number}.jpg`;

            imageHtml = `
                <div style="margin-bottom:15px;">
                    <img
                        src="${imagePath}"
                        alt="Question Image"
                        style="
                            max-width:100%;
                            border-radius:8px;
                            border:1px solid #ddd;
                        "
                        onerror="this.parentElement.remove()"
                    >
                </div>
            `;
        }
        
        if (q.highlight && displayContent) {
            const highlightStyling = `<span style="text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 2px; font-weight: 900; color: var(--primary-color);">${q.highlight}</span>`;
            displayContent = displayContent.split(q.highlight).join(highlightStyling);
        }
        
        displayContent = this.formatText(displayContent);

        return `
            <div class="q-item" id="${uniqueQid}" style="position: relative; padding-top: 5px;">
                
                <button class="flag-btn" data-qid="${uniqueQid}" style="position: absolute; right: 0; top: 0; background: ${isFlagged ? '#fee2e2' : 'transparent'}; border: 1px solid ${isFlagged ? '#ef4444' : '#d1d5db'}; color: ${isFlagged ? '#ef4444' : '#6b7280'}; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; transition: 0.2s; z-index: 10;">
                    ${isFlagged ? '🚩 Đã đánh dấu' : '🏳️ Đánh dấu'}
                </button>

                <h4>Câu ${q.number}</h4>

${imageHtml}

${displayContent ? `<p style="margin-bottom:15px;font-size:16px;">${displayContent}</p>` : ''}

${audioButtonHtml}

<div class="options-group">${optionsHtml}</div>
                <button class="ai-explain-btn" data-qid="${q.questionId}" style="margin-top: 15px; padding: 8px 15px; cursor: pointer; border: 1px solid var(--secondary-color); color: var(--secondary-color); background: transparent; border-radius: 4px; font-weight: bold;">✨ Giải thích bằng AI</button>
            </div>
        `;
    }
};