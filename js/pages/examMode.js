document.addEventListener("DOMContentLoaded", async () => {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const examId = urlParams.get('id');

        if (!examId) {
            ModalUI.showAlert("Lỗi", "Không tìm thấy mã đề thi!");
            setTimeout(() => window.location.href = 'index.html', 1500);
            return;
        }

        const examTitleDisplay = document.getElementById('exam-title-display');
        const paletteContainer = document.getElementById('question-palette');
        const examContentArea = document.getElementById('exam-content-area');
        const btnSubmit = document.getElementById('btn-submit');
        const btnClear = document.getElementById('btn-clear');

        // 1. Tải dữ liệu đề thi và manifest
        if (examTitleDisplay) examTitleDisplay.innerText = "Đang tải dữ liệu...";
        const [examData, manifest] = await Promise.all([
            DataService.getExamData(examId),
            DataService.getExamManifest()
        ]);
        
        if (!examData) throw new Error("Không tải được đề thi.");
        
        const currentExam = manifest.find(e => e.id === examId);
        if (examTitleDisplay) examTitleDisplay.innerText = `Đang làm đề: ${currentExam ? currentExam.title : examId}`;

        // 2. Khởi tạo Timer và Render UI
        let savedAnswers = StorageService.getSavedAnswers(examId) || {};
        paletteContainer.innerHTML = QuestionCard.renderPalette(examData, savedAnswers);
        examContentArea.innerHTML = QuestionCard.renderFullExam(examData, savedAnswers);

       

        // 3. Sự kiện lưu đáp án
        examContentArea.addEventListener('change', (e) => {
            if (e.target.type === 'radio') {
                StorageService.saveAnswer(examId, e.target.name, e.target.value);
                const box = document.querySelector(`.q-box[data-target="${e.target.name}"]`);
                if (box) box.classList.add('answered');
            }
        });

        // 4. Sự kiện cuộn sidebar (Chống lẹm Navbar)
        paletteContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('q-box') || e.target.classList.contains('mondai-anchor-btn')) {
                const targetId = e.target.getAttribute('data-target');
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    const containerTop = examContentArea.getBoundingClientRect().top;
                    const targetTop = targetElement.getBoundingClientRect().top;
                    const scrollPos = targetTop - containerTop + examContentArea.scrollTop - 20;
                    examContentArea.scrollTo({ top: scrollPos, behavior: 'smooth' });
                    
                    targetElement.style.transition = "background-color 0.4s";
                    targetElement.style.backgroundColor = "#fff3cd";
                    setTimeout(() => targetElement.style.backgroundColor = "transparent", 1000);
                }
            }
        });

        // 5. Sự kiện Giải thích AI
        examContentArea.addEventListener('click', async (e) => {
            if (e.target.classList.contains('ai-explain-btn')) {
                const btn = e.target;
                const qid = btn.getAttribute('data-qid');
                const apiKey = StorageService.getApiKey();
                
                if (!apiKey) {
                    ModalUI.showAlert("Thiếu API Key", "⚠️ Vui lòng cấu hình API Key tại trang Cài đặt.");
                    return;
                }

                let currentQ = null, currentSec = "", currentMondai = 0, currentPassage = null;
                for (const mondai of examData) {
                    const foundQ = mondai.questions.find(q => q.questionId === qid);
                    if (foundQ) {
                        currentQ = foundQ; 
                        currentSec = mondai.section; 
                        currentMondai = mondai.mondai;
                        if (mondai.type === 'passage') currentPassage = mondai.passageData;
                        break;
                    }
                }
                
                btn.style.display = 'none'; 
                ExplanationUi.renderLoading(qid);
                try {
                    const explanation = await AIService.explainQuestion(apiKey, currentQ, currentPassage, currentSec, currentMondai);
                    ExplanationUi.renderResult(qid, explanation);
                    StorageService.markAiAssisted(examId, qid);
                } catch (error) {
                    ExplanationUi.renderError(qid, error.message);
                    btn.style.display = 'block';
                }
            }
        });

        // 6. Nút Nộp bài và Chấm điểm
        if(btnSubmit) {
            btnSubmit.addEventListener('click', () => {
                if (btnSubmit.getAttribute('data-status') === 'done') {
                    window.location.href = 'index.html';
                    return;
                }

                const currentAns = StorageService.getSavedAnswers(examId);
                let correctCount = 0, totalQuestions = 0;

                examData.forEach(m => {
                    m.questions.forEach(q => {
                        totalQuestions++;
                        const userSelected = currentAns[q.questionId];
                        const qBox = document.querySelector(`.q-box[data-target="${q.questionId}"]`);
                        
                        if (userSelected) {
                            const selectedInput = document.querySelector(`input[name="${q.questionId}"][value="${userSelected}"]`);
                            const correctInput = document.querySelector(`input[name="${q.questionId}"][value="${q.correctAnswer}"]`);
                            const selectedLabel = selectedInput ? selectedInput.closest('.option-label') : null;
                            const correctLabel = correctInput ? correctInput.closest('.option-label') : null;

                            if (userSelected == q.correctAnswer) {
                                correctCount++;
                                if (qBox) qBox.classList.add('correct');
                                if (selectedLabel) selectedLabel.classList.add('correct-answer');
                            } else {
                                if (qBox) qBox.classList.add('wrong');
                                if (selectedLabel) selectedLabel.classList.add('wrong-answer');
                                if (correctLabel) correctLabel.classList.add('correct-answer');
                            }
                        } else if (qBox) {
                            qBox.style.backgroundColor = "#f39c12"; qBox.style.color = "white";
                        }
                    });
                });

                const scoreData = { correct: correctCount, total: totalQuestions, aiAssisted: StorageService.getAiAssistedCount(examId), timestamp: new Date().toISOString() };
                StorageService.saveTestResult(examId, scoreData);
                
                ModalUI.showAlert("Kết quả bài thi", `🏆 Bạn làm đúng: ${correctCount} / ${totalQuestions} câu.`);
                
                document.querySelectorAll('input[type="radio"]').forEach(r => r.disabled = true);
                btnSubmit.innerText = "🏠 Về trang chủ";
                btnSubmit.style.backgroundColor = "var(--secondary-color)";
                btnSubmit.setAttribute('data-status', 'done');
            });
        }

        // 7. Xử lý Nút Xóa làm lại
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                ModalUI.showConfirm("Xác nhận", "Xóa toàn bộ tiến trình và reset thời gian?", () => {
                    localStorage.removeItem(`exam_end_${examId}`); // QUAN TRỌNG: Xóa sạch key cũ
                    StorageService.clearExamProgress(examId);
                    window.location.reload();
                });
            });
        }

    } catch (error) {
        console.error(error);
        document.getElementById('exam-content-area').innerHTML = `<h2 style='color:red; text-align:center;'>Lỗi hệ thống.</h2>`;
    }
});

