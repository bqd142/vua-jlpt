// ==========================================
// PHẦN 1: TẢI DỮ LIỆU VÀ RENDER MÀN HÌNH
// ==========================================
let currentAudioTimer = null;
function timeToSeconds(time) {

    const [m, s] =
        time.split(':').map(Number);

    return m * 60 + s;
}
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const examId = urlParams.get('id');

        if (!examId) {
            console.error("Lỗi: Không tìm thấy ID đề thi trên URL.");
            return;
        }

        const response = await fetch(`data/${examId}.json`);
        if (!response.ok) throw new Error("Không thể tải file JSON");
        
        let examData = await response.json();
        const dataToRender = Array.isArray(examData) ? examData : (examData.mondais || examData.data);
        const savedAnswers = JSON.parse(localStorage.getItem(`answers_${examId}`) || '{}');

        let audioTimingData = null;

        try {

            const timingResponse = await fetch(
                `data/audio-timings/${examId}.json`
            );

            if (timingResponse.ok) {
                audioTimingData = await timingResponse.json();

                console.log("TIMING DATA:", audioTimingData);
            }

        } catch (error) {

            console.log(
                `Không tìm thấy timing audio cho ${examId}`
            );

        }
        const contentContainer = document.getElementById('exam-content-area'); 
        const paletteContainer = document.getElementById('question-palette');
        const titleElement = document.getElementById('exam-title-display'); 

        if (titleElement) titleElement.innerText = `Luyện thi: ${examId.replace(/_/g, ' ')}`;

        if (contentContainer) contentContainer.innerHTML = QuestionCard.renderFullExam(dataToRender, savedAnswers, audioTimingData);
        const audioPlayer =
            document.getElementById(
                'jlpt-audio-player'
            );

        if (audioPlayer) {

            audioPlayer.src =
                `assets/audio/${examId}.mp3`;

        }

        if (paletteContainer) paletteContainer.innerHTML = QuestionCard.renderPalette(dataToRender, savedAnswers);

        // Tự động cuộn nếu mở từ Sổ tay
        if (window.location.hash) {
            setTimeout(() => {
                const targetElement = document.getElementById(window.location.hash.substring(1));
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 500);
        }

    } catch (error) {
        console.error("Lỗi hệ thống khi khởi tạo đề thi:", error);
    }
});

// ==========================================
// PHẦN 2: CÁC SỰ KIỆN CLICK (CẮM CỜ & CUỘN TRANG THÔNG MINH)
// ==========================================
document.addEventListener('click', function(e) {
    
    // 1. Logic Cắm cờ
   const playBtn =
    e.target.closest(
        '.play-question-audio'
    );

if (playBtn) {

    const start =
        timeToSeconds(
            playBtn.dataset.start
        );

    const end =
        timeToSeconds(
            playBtn.dataset.end
        );

    const audio =
        document.getElementById(
            'jlpt-audio-player'
        );

    if (!audio) return;

    audio.pause();

    audio.currentTime = start;

    audio.play();

    if (currentAudioTimer) {
        clearInterval(
            currentAudioTimer
        );
    }

    currentAudioTimer =
        setInterval(() => {

            if (
                audio.currentTime >= end
            ) {

                audio.pause();

                clearInterval(
                    currentAudioTimer
                );

                currentAudioTimer = null;
            }

        }, 200);

    return;
}
    const flagBtn = e.target.closest('.flag-btn');
    if (flagBtn) {
        const qid = flagBtn.getAttribute('data-qid');
        let flaggedQuestions = JSON.parse(localStorage.getItem('flagged_questions') || '{}');
        
        if (flaggedQuestions[qid]) {
            delete flaggedQuestions[qid];
            flagBtn.innerHTML = '🏳️ Đánh dấu';
            flagBtn.style.background = 'transparent';
            flagBtn.style.borderColor = '#d1d5db';
            flagBtn.style.color = '#6b7280';
            const paletteBox = document.getElementById(`palette-${qid}`);
            if(paletteBox) {
                const flagSpan = paletteBox.querySelector('.palette-flag');
                if(flagSpan) flagSpan.remove();
            }
        } else {
            flaggedQuestions[qid] = true;
            flagBtn.innerHTML = '🚩 Đã đánh dấu';
            flagBtn.style.background = '#fee2e2';
            flagBtn.style.borderColor = '#ef4444';
            flagBtn.style.color = '#ef4444';
            const paletteBox = document.getElementById(`palette-${qid}`);
            if(paletteBox && !paletteBox.querySelector('.palette-flag')) {
                paletteBox.insertAdjacentHTML('afterbegin', `<span class="palette-flag" style="position: absolute; top: -5px; right: -2px; font-size: 10px;">🚩</span>`);
            }
        }
        localStorage.setItem('flagged_questions', JSON.stringify(flaggedQuestions));
        return; 
    }

    // 2. Logic Cuộn trang thông minh (SỬA LỖI NHẢY KHỐI)
    const scrollBtn = e.target.closest('.q-box') || e.target.closest('.mondai-anchor-btn');
    
    if (scrollBtn) {
        const targetId = scrollBtn.getAttribute('data-target');
        if (!targetId) return;
        
        const element = document.getElementById(targetId);
        if (element) {

            const examArea = document.querySelector('.exam-area');

            const target =
                element.closest('.question-container') ||
                element;

            examArea.scrollTo({
                top: target.offsetTop - 130,
                behavior: 'smooth'
            });
        }
    }
});

// ==========================================
// PHẦN 3: LƯU TRẠNG THÁI ĐÁP ÁN
// ==========================================
document.addEventListener('change', function(e) {
    if (e.target.type === 'radio') {
        const qid = e.target.name; 
        const paletteBox = document.getElementById(`palette-${qid}`);
        if (paletteBox) paletteBox.classList.add('answered');

        const urlParams = new URLSearchParams(window.location.search);
        const examId = urlParams.get('id');
        if (examId) {
            let savedAnswers = JSON.parse(localStorage.getItem(`answers_${examId}`) || '{}');
            savedAnswers[qid] = e.target.value;
            localStorage.setItem(`answers_${examId}`, JSON.stringify(savedAnswers));
        }
    }
});