// js/services/DataService.js
const DataService = {
    async getExamManifest() {
        try {
            const response = await fetch('data/exams_manifest.json');
            return await response.json();
        } catch (error) {
            console.error("Lỗi khi tải danh sách đề:", error);
            return [];
        }
    },
    async getExamTitle(examId) {
        const manifest = await this.getExamManifest();
        const exam = manifest.find(e => e.id === examId);
        return exam ? exam.title : `Đề thi: ${examId}`;
    },

    async getExamData(examId) {
        try {
            const response = await fetch(`data/${examId}.json`);
            if (!response.ok) throw new Error("Không tìm thấy file đề thi.");
            return await response.json();
        } catch (error) {
            console.error(`Lỗi khi tải đề thi ${examId}:`, error);
            return null;
        }
    },
    async getAudioTiming(examId) {
        try {
            const resp = await fetch(`data/audio-timings/${examId}.json`);
            if (!resp.ok) return null;
            return await resp.json();
        } catch (e) {
            return null;
        }
    }
};