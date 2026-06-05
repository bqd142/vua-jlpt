// js/services/StorageService.js
const StorageService = {
    consts: {
        PROGRESS_KEY: 'jlpt_progress',
        API_KEY: 'jlpt_ai_key' // Lưu API Key của Google Gemini
    },

    // --- Quản lý API Key ---
    getApiKey() {
        return localStorage.getItem(this.consts.API_KEY);
    },

    saveApiKey(key) {
        localStorage.setItem(this.consts.API_KEY, key);
    },

    // --- Quản lý Tiến trình (Đã thêm biến đếm AI) ---
    saveAnswer(examId, questionId, selectedOptionId) {
        let allProgress = JSON.parse(localStorage.getItem(this.consts.PROGRESS_KEY)) || {};
        if (!allProgress[examId]) {
            allProgress[examId] = { answers: {}, aiAssisted: [] };
        }
        allProgress[examId].answers[questionId] = parseInt(selectedOptionId);
        localStorage.setItem(this.consts.PROGRESS_KEY, JSON.stringify(allProgress));
    },

    getSavedAnswers(examId) {
        let allProgress = JSON.parse(localStorage.getItem(this.consts.PROGRESS_KEY)) || {};
        return allProgress[examId] ? allProgress[examId].answers : {};
    },

    // Ghi nhận câu hỏi đã sử dụng AI
    markAiAssisted(examId, questionId) {
        let allProgress = JSON.parse(localStorage.getItem(this.consts.PROGRESS_KEY)) || {};
        if (!allProgress[examId]) {
            allProgress[examId] = { answers: {}, aiAssisted: [] };
        }
        if (!allProgress[examId].aiAssisted) {
            allProgress[examId].aiAssisted = [];
        }
        if (!allProgress[examId].aiAssisted.includes(questionId)) {
            allProgress[examId].aiAssisted.push(questionId);
            localStorage.setItem(this.consts.PROGRESS_KEY, JSON.stringify(allProgress));
        }
    },

    

    getAiAssistedCount(examId) {
        let allProgress = JSON.parse(localStorage.getItem(this.consts.PROGRESS_KEY)) || {};
        return allProgress[examId] && allProgress[examId].aiAssisted ? allProgress[examId].aiAssisted.length : 0;
    },
    saveTestResult(examId, scoreData) {
        let allProgress = JSON.parse(localStorage.getItem(this.consts.PROGRESS_KEY)) || {};
        if (!allProgress[examId]) {
            allProgress[examId] = { answers: {}, aiAssisted: [] };
        }
        // Lưu data điểm số và thời gian nộp bài
        allProgress[examId].result = scoreData;
        localStorage.setItem(this.consts.PROGRESS_KEY, JSON.stringify(allProgress));
    },

    // Thêm hàm lấy toàn bộ lịch sử để hiển thị lên Dashboard
    getAllHistory() {
        return JSON.parse(localStorage.getItem(this.consts.PROGRESS_KEY)) || {};
    },

    clearExamProgress(examId) {
        let allProgress = JSON.parse(localStorage.getItem(this.consts.PROGRESS_KEY)) || {};
        if (allProgress[examId]) {
            delete allProgress[examId];
            localStorage.setItem(this.consts.PROGRESS_KEY, JSON.stringify(allProgress));
        }
    }
};