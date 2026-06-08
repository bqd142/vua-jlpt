// js/pages/mondaiMode.js
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const sectionTarget = urlParams.get('section'); 

        if (!sectionTarget) {
            ModalUI.showAlert("Lỗi", "Không tìm thấy thông tin phần thi!");
            setTimeout(() => window.location.href = 'index.html', 1500);
            return;
        }

        const examTitleDisplay = document.getElementById('exam-title-display');
        const paletteContainer = document.getElementById('question-palette');
        const examContentArea = document.getElementById('exam-content-area');
        const btnSubmit = document.getElementById('btn-submit');
        const btnClear = document.getElementById('btn-clear');

        const sectionNames = { 'moji_goi': 'Từ Vựng', 'bunpou': 'Ngữ Pháp', 'dokkai': 'Đọc Hiểu', 'choukai': 'Nghe Hiểu' };
        
        if (examTitleDisplay) examTitleDisplay.innerText = `Chuyên Đề: ${sectionNames[sectionTarget] || sectionTarget} (Đang tải...)`;

        // 1. Fetch dữ liệu
        const manifest = await DataService.getExamManifest();
        if (!manifest || manifest.length === 0) throw new Error("File manifest trống.");

        let aggregatedData = [];
        const allHistory = StorageService.getAllHistory() || {};

        const audioTimingsMap = {};
        for (const exam of manifest) {
            try {
                const rawData = await DataService.getExamData(exam.id);
                if (rawData && Array.isArray(rawData)) {
                    const filtered = rawData.filter(m => m.section === sectionTarget);
                    filtered.forEach(m => {
                        m.examId = exam.id;
                        m.examTitle = exam.title;
                        aggregatedData.push(m);
                    });
                }
            } catch (err) {
                console.warn(`Bỏ qua đề ${exam.id}:`, err);
            }
        }

        // Load audio timing files for each exam present (non-blocking but await each)
        for (const exam of manifest) {
            try {
                const timing = await DataService.getAudioTiming(exam.id);
                if (timing) audioTimingsMap[exam.id] = timing;
            } catch (e) {
                // ignore
            }
        }

        if (aggregatedData.length === 0) {
            examContentArea.innerHTML = "<h2 style='text-align:center; padding: 50px; color: var(--text-muted);'>Chưa có dữ liệu câu hỏi cho phần này.</h2>";
            return;
        }

        if (examTitleDisplay) examTitleDisplay.innerText = `Luyện Chuyên Đề: ${sectionNames[sectionTarget] || sectionTarget}`;

        // 2. Render Giao diện (pass audio timings map so choukai questions get per-question audio)
        paletteContainer.innerHTML = QuestionCard.renderPalette(aggregatedData, allHistory);
        examContentArea.innerHTML = QuestionCard.renderFullExam(aggregatedData, allHistory, audioTimingsMap);

        // 3. Sự kiện lưu đáp án
        examContentArea.addEventListener('change', (e) => {
            if (e.target.type === 'radio') {
                const inputName = e.target.name; // thường là "<examId>-<questionId>" khi có mondaiExamId
                const originExamId = e.target.getAttribute('data-exam-id'); 
                if (originExamId) {
                    const prefix = `${originExamId}-`;
                    const rawQid = inputName && inputName.startsWith(prefix) ? inputName.substring(prefix.length) : inputName;
                    StorageService.saveAnswer(originExamId, rawQid, e.target.value);
                    const uniqueQid = `${originExamId}-${rawQid}`;
                    const box = document.querySelector(`.q-box[data-target="${uniqueQid}"]`);
                    if (box) box.classList.add('answered');
                }
            }
        });

        // 4. Sự kiện cuộn trang mượt mà
        paletteContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('q-box') || e.target.classList.contains('mondai-anchor-btn')) {
                const targetId = e.target.getAttribute('data-target');
                const el = document.getElementById(targetId);
                if (el) {
                    const containerTop = examContentArea.getBoundingClientRect().top;
                    const targetTop = el.getBoundingClientRect().top;
                    const scrollPos = targetTop - containerTop + examContentArea.scrollTop - 20;
                    examContentArea.scrollTo({ top: scrollPos, behavior: 'smooth' });
                    
                    el.style.transition = "background-color 0.4s";
                    el.style.backgroundColor = "rgba(52, 152, 219, 0.1)";
                    setTimeout(() => el.style.backgroundColor = "transparent", 1000);
                }
                // Ngăn không cho document-level click handler xử lý tiếp (tránh cuộn kép khiến navbar che mất)
                e.stopPropagation();
            }
        });

        // 5. Sự kiện Nút Giải thích AI
        examContentArea.addEventListener('click', async (e) => {
            if (e.target.classList.contains('ai-explain-btn')) {
                const btn = e.target;
                const qid = btn.getAttribute('data-qid');
                const apiKey = StorageService.getApiKey();
                
                if (!apiKey) {
                    ModalUI.showAlert("Thiếu API Key", "⚠️ Vui lòng cấu hình API Key tại trang Cài đặt.");
                    return;
                }

                let currentQ = null, currentSec = "", currentMondai = 0, currentPassage = null, originExamId = null;
                for (const mondai of aggregatedData) {
                    const foundQ = mondai.questions.find(q => q.questionId === qid);
                    if (foundQ) {
                        currentQ = foundQ; 
                        currentSec = mondai.section; 
                        currentMondai = mondai.mondai;
                        originExamId = mondai.examId;
                        if (mondai.type === 'passage') currentPassage = mondai.passageData;
                        break;
                    }
                }
                if (!currentQ) return;

                btn.style.display = 'none'; 
                ExplanationUi.renderLoading(`${originExamId}-${qid}`);

                try {
                    const explanation = await AIService.explainQuestion(apiKey, currentQ, currentPassage, currentSec, currentMondai);
                    ExplanationUi.renderResult(`${originExamId}-${qid}`, explanation);
                    if (originExamId) StorageService.markAiAssisted(originExamId, qid);
                } catch (error) {
                    ExplanationUi.renderError(`${originExamId}-${qid}`, error.message);
                    btn.style.display = 'block';
                }
            }
        });

        // 6. Xử lý Nút "Xóa làm lại"
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                console.log("CLEAR CLICKED");
                ModalUI.showConfirm(
                    "Xác nhận xóa", 
                    "Bạn muốn xóa toàn bộ câu trả lời của chuyên đề này?", 
                    () => {
                        let allHistory = StorageService.getAllHistory() || {};
                        aggregatedData.forEach(m => {
                            if (allHistory[m.examId] && allHistory[m.examId].answers) {
                                m.questions.forEach(q => delete allHistory[m.examId].answers[q.questionId]);
                            }
                        });
                        localStorage.setItem(StorageService.consts.PROGRESS_KEY, JSON.stringify(allHistory));
                        window.location.reload();
                    }
                );
            });
        }

        // 7. Nút Nộp bài và Chấm điểm
        if (btnSubmit) {
            btnSubmit.addEventListener('click', () => {
                console.log("SUBMIT CLICKED");
                if (btnSubmit.getAttribute('data-status') === 'done') {
                    window.location.href = 'index.html';
                    return;
                }

                let correctCount = 0, totalQuestions = 0;
                document.querySelectorAll('.option-label').forEach(el => el.classList.remove('wrong-answer', 'correct-answer'));
                document.querySelectorAll('.q-box').forEach(el => el.classList.remove('wrong', 'correct'));

                aggregatedData.forEach(m => {
                    const currentAns = StorageService.getSavedAnswers(m.examId) || {};
                    m.questions.forEach(q => {
                        totalQuestions++;
                        // try to read saved answer by raw id; saved values are numbers
                        const userSelected = currentAns[q.questionId];
                        const uniqueQid = `${m.examId}-${q.questionId}`;
                        const qBox = document.querySelector(`.q-box[data-target="${uniqueQid}"]`);
                        
                        // treat 0 as a valid answer too — check against null/undefined
                        if (userSelected !== undefined && userSelected !== null && userSelected !== '') {
                            const selectedInput = document.querySelector(`input[name="${uniqueQid}"][data-exam-id="${m.examId}"][value="${userSelected}"]`);
                            const correctInput = document.querySelector(`input[name="${uniqueQid}"][data-exam-id="${m.examId}"][value="${q.correctAnswer}"]`);
                            console.log({
    examId: m.examId,
    qid: q.questionId,
    userSelected,
    correctAnswer: q.correctAnswer
});
                            if (userSelected == q.correctAnswer) {
                                correctCount++;
                                if (qBox) qBox.classList.add('correct');
                                if (selectedInput) selectedInput.closest('.option-label').classList.add('correct-answer');
                            } else {
                                if (qBox) qBox.classList.add('wrong');
                                if (selectedInput) selectedInput.closest('.option-label').classList.add('wrong-answer');
                                if (correctInput) correctInput.closest('.option-label').classList.add('correct-answer');
                            }
                        } else if (qBox) {
                            qBox.style.backgroundColor = "#f39c12"; qBox.style.color = "white";
                        }
                    });
                });

                let scoreDiv = document.getElementById('score-display');
                if (!scoreDiv) {
                    scoreDiv = document.createElement('div');
                    scoreDiv.id = 'score-display';
                    scoreDiv.className = 'score-display';
                    document.querySelector('.sidebar').appendChild(scoreDiv); 
                }
                scoreDiv.innerHTML = `🏆 Điểm chuyên đề:<br>${correctCount} / ${totalQuestions}`;

                document.querySelectorAll('input[type="radio"]').forEach(r => r.disabled = true);
                btnSubmit.innerText = "🏠 Về trang chủ";
                btnSubmit.style.backgroundColor = "var(--secondary-color)";
                btnSubmit.setAttribute('data-status', 'done');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

    } catch (error) {
        console.error("Critical Error:", error);
        document.getElementById('exam-content-area').innerHTML = `<h2 style='color:red; text-align:center;'>Hệ thống lỗi. F12 để kiểm tra.</h2>`;
    }
    document.addEventListener('click', function(e) {
    // 1. XỬ LÝ SỰ KIỆN CLICK NÚT CẮM CỜ (.flag-btn)
    const flagBtn = e.target.closest('.flag-btn');
    if (flagBtn) {
        const qid = flagBtn.getAttribute('data-qid');
        let flaggedQuestions = JSON.parse(localStorage.getItem('flagged_questions') || '{}');
        
        if (flaggedQuestions[qid]) {
            // Nếu đã cắm -> tiến hành Bỏ Cờ
            delete flaggedQuestions[qid];
            flagBtn.innerHTML = '🏳️ Đánh dấu';
            flagBtn.style.background = 'transparent';
            flagBtn.style.borderColor = '#d1d5db';
            flagBtn.style.color = '#6b7280';
            
            // Tìm xóa cờ ở thanh sidebar trái
            const paletteBox = document.getElementById(`palette-${qid}`);
            if(paletteBox) {
                const flagSpan = paletteBox.querySelector('.palette-flag');
                if(flagSpan) flagSpan.remove();
            }
        } else {
            // Nếu chưa cắm -> tiến hành Cắm Cờ
            flaggedQuestions[qid] = true;
            flagBtn.innerHTML = '🚩 Đã đánh dấu';
            flagBtn.style.background = '#fee2e2';
            flagBtn.style.borderColor = '#ef4444';
            flagBtn.style.color = '#ef4444';
            
            // Tìm thêm cờ vào thanh sidebar trái
            const paletteBox = document.getElementById(`palette-${qid}`);
            if(paletteBox && !paletteBox.querySelector('.palette-flag')) {
                paletteBox.insertAdjacentHTML('afterbegin', `<span class="palette-flag" style="position: absolute; top: -5px; right: -2px; font-size: 10px;">🚩</span>`);
            }
        }
        
        localStorage.setItem('flagged_questions', JSON.stringify(flaggedQuestions));
        return; 
    }

    // 2. XỬ LÝ CLICK SỐ CÂU HỎI HOẶC NÚT SECTION ĐỂ CUỘN TRANG MƯỢT MÀ
    if (e.target.classList.contains('q-box') || e.target.classList.contains('mondai-anchor-btn')) {
        const targetId = e.target.getAttribute('data-target');
        if (!targetId) return;
        
        const element = document.getElementById(targetId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
});

// 3. TỰ ĐỘNG TÔ MÀU XANH CHO MENU TRÁI KHI CHỌN ĐÁP ÁN (Dùng chung cho cả 2 trang)
document.addEventListener('change', function(e) {
    if (e.target.type === 'radio') {
        const qid = e.target.name; 
        const paletteBox = document.getElementById(`palette-${qid}`);
        if (paletteBox) {
            paletteBox.classList.add('answered');
        }
    }
});
});