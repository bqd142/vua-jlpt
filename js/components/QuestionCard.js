// js/components/QuestionCard.js

const SECTION_LABELS = {
    'moji_goi':'Từ Vựng',
    'bunpou': 'Ngữ Pháp',
    'dokkai': 'Đọc Hiểu',
    'choukai': 'Nghe Hiểu'
};

const QuestionCard = {
    
    // --- HÀM MỚI: Xử lý định dạng văn bản (In đậm, Gạch chân) ---
    formatText(text) {
        if (!text) return '';
        let formatted = text.toString();

        // 1. Xử lý thẻ HTML chuẩn (<u>, <b>, <strong>)
        formatted = formatted.replace(/<u\b[^>]*>(.*?)<\/u>/gi, '<span style="text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 2px;">$1</span>');
        formatted = formatted.replace(/<b\b[^>]*>(.*?)<\/b>/gi, '<strong style="font-weight: 900; color: var(--primary-color);">$1</strong>');
        formatted = formatted.replace(/<strong\b[^>]*>(.*?)<\/strong>/gi, '<strong style="font-weight: 900; color: var(--primary-color);">$1</strong>');

        // 2. Xử lý định dạng Markdown (nếu JSON sử dụng)
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 900; color: var(--primary-color);">$1</strong>');
        
        return formatted;
    },

    // 1. Render Thanh bên trái (Sidebar)
    renderPalette(examData, savedAnswers = {}) {
        let sectionNav = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding-bottom: 15px; margin-bottom: 15px; border-bottom: 1px solid var(--border-color);">';
        let qGrid = ''; 

        const existingSections = new Set(); 
        let currentExamIdTracker = null; 

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
                let isAnswered = '';
                try {
                    if (mondai.examId && savedAnswers[mondai.examId] && savedAnswers[mondai.examId].answers) {
                        isAnswered = savedAnswers[mondai.examId].answers[q.questionId] !== undefined ? 'answered' : '';
                    } else if (savedAnswers[q.questionId] !== undefined) {
                        isAnswered = 'answered';
                    }
                } catch(e) {}

                const uniqueQid = mondai.examId ? `${mondai.examId}-${q.questionId}` : q.questionId;
                qGrid += `<div class="q-box ${isAnswered}" data-target="${uniqueQid}">${q.number}</div>`;
            });
        });

        if (currentExamIdTracker !== null) {
            qGrid += '</div>';
        }

        return sectionNav + '</div>' + qGrid;
    },

    // 2. Render Nội dung làm bài chính
    renderFullExam(examData, savedAnswers = {}) {
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

            // Ép formatText cho Lời dẫn
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
                html += headerHtml + this.renderSingleLayout(mondai, savedAnswers, mondai.examId);
            }
            
            html += `</section><hr style="border-top: 3px solid var(--border-color); margin: 40px 0;">`;
        });
        return html;
    },

    // 3. Render giao diện câu hỏi đơn
    renderSingleLayout(mondai, savedAnswers, mondaiExamId = null) {
        let html = `<div class="questions-panel">`;
        mondai.questions.forEach(q => {
            html += `<div class="question-container" style="background: var(--panel-bg); padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 20px;">${this.buildQuestionHTML(q, savedAnswers, mondaiExamId)}</div>`;
        });
        return html + `</div>`;
    },

    // 4. Render giao diện chia đôi (Split-layout) cho bài đọc hiểu
    renderPassageLayout(mondai, savedAnswers, mondaiExamId = null, headerHtml = '') {
        // Ép formatText cho đoạn văn Đọc hiểu
        let passageHtml = `
            <div class="passage-panel" style="position: sticky; top: 80px; height: fit-content; max-height: calc(100vh - 100px); overflow-y: auto; background: var(--panel-bg); padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                ${headerHtml}
                ${mondai.passageData.title ? `<h3 style="margin-bottom:15px; color: var(--primary-color); font-size: 18px;">${this.formatText(mondai.passageData.title)}</h3>` : ''}
                <p style="white-space: pre-wrap; font-size: 16px; line-height: 1.8;">${this.formatText(mondai.passageData.text)}</p>
            </div>
        `;
        
        let questionsHtml = `<div class="questions-panel" style="display: flex; flex-direction: column; gap: 20px;">`;
        mondai.questions.forEach(q => {
            questionsHtml += `<div class="question-container" style="background: var(--panel-bg); padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">${this.buildQuestionHTML(q, savedAnswers, mondaiExamId)}</div>`;
        });
        
        return `<div class="split-layout" style="display: flex; gap: 30px; align-items: flex-start;">${passageHtml}${questionsHtml}</div>`; 
    },

    // 5. Build HTML cho từng câu hỏi chi tiết
    buildQuestionHTML(q, savedAnswers, mondaiExamId = null) {
        let savedValue;
        if (mondaiExamId && savedAnswers[mondaiExamId] && savedAnswers[mondaiExamId].answers) {
            savedValue = savedAnswers[mondaiExamId].answers[q.questionId]; 
        } else {
            savedValue = savedAnswers[q.questionId]; 
        }

        const uniqueQid = mondaiExamId ? `${mondaiExamId}-${q.questionId}` : q.questionId;

        let optionsHtml = q.options.map(opt => {
            const isChecked = savedValue === opt.id ? 'checked' : '';
            const examIdAttr = mondaiExamId ? `data-exam-id="${mondaiExamId}"` : '';
            return `<label class="option-label" style="display:block; margin: 10px 0; cursor: pointer; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; transition: background 0.2s;"><input type="radio" name="${q.questionId}" value="${opt.id}" ${examIdAttr} ${isChecked} style="margin-right: 10px;">${this.formatText(opt.text)}</label>`;
        }).join('');

        // --- LOGIC XỬ LÝ HIGHLIGHT TỪ JSON ---
        let displayContent = q.content || '';
        
        // Nếu câu hỏi có trường highlight, tìm và bọc CSS gạch chân + in đậm cho nó
        if (q.highlight && displayContent) {
            const highlightStyling = `<span style="text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 2px; font-weight: 900; color: var(--primary-color);">${q.highlight}</span>`;
            
            // Dùng split().join() để thay thế an toàn tất cả các từ khớp với highlight (an toàn hơn Regex)
            displayContent = displayContent.split(q.highlight).join(highlightStyling);
        }
        
        // Vẫn chạy qua formatText để đề phòng có Markdown ở các chỗ khác
        displayContent = this.formatText(displayContent);

        return `
            <div class="q-item" id="${uniqueQid}">
                <h4 style="margin-bottom: 10px; color: var(--primary-color);">Câu ${q.number}</h4>
                ${displayContent ? `<p style="margin-bottom: 15px; font-size: 16px;">${displayContent}</p>` : ''}
                <div class="options-group">${optionsHtml}</div>
                <button class="ai-explain-btn" data-qid="${q.questionId}" style="margin-top: 15px; padding: 8px 15px; cursor: pointer; border: 1px solid var(--secondary-color); color: var(--secondary-color); background: transparent; border-radius: 4px; font-weight: bold;">✨ Giải thích bằng AI</button>
            </div>
        `;
    }
};