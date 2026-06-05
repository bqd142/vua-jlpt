document.addEventListener("DOMContentLoaded", async () => {
    const examListContainer = document.getElementById('exam-list-container');
    const manifest = await DataService.getExamManifest();
    
    let examHtml = '';
    manifest.forEach(exam => {
        // Render thẻ chọn đề chuyển thẳng sang exam.html
        examHtml += `
        <a href="exam.html?id=${exam.id}" class="exam-item" style="margin:0;">
            <div style="font-size: 16px;">📝 ${exam.title}</div>
            <div style="font-size: 13px; color: var(--text-muted); margin-top: 5px;">⏱️ ${exam.duration} phút</div>
        </a>`;
    });
    examListContainer.innerHTML = examHtml || "<p>Không tìm thấy đề thi nào.</p>";
});