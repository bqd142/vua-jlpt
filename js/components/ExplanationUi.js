// js/components/ExplanationUi.js
const ExplanationUi = {
    renderLoading(questionId) {
        const container = document.getElementById(questionId);
        let expDiv = container.querySelector('.ai-explanation');
        
        if (!expDiv) {
            expDiv = document.createElement('div');
            expDiv.className = 'ai-explanation';
            expDiv.style.cssText = 'margin-top: 15px; padding: 15px; background-color: #e8f4fd; border-left: 4px solid var(--secondary-color); border-radius: 4px;';
            container.appendChild(expDiv);
        }
        
        expDiv.innerHTML = `<span style="color: var(--text-muted);">Đang phân tích dữ liệu... (Vui lòng chờ)</span>`;
    },

    renderResult(questionId, markdownText) {
        const container = document.getElementById(questionId);
        const expDiv = container.querySelector('.ai-explanation');
        if (expDiv) {
            // Trong thực tế, bạn nên dùng thư viện marked.js để convert Markdown sang HTML
            // Ở đây tạm dùng replace cơ bản cho ngắt dòng và in đậm
            let formattedText = markdownText
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                
            expDiv.innerHTML = `<strong>💡 AI Giải thích:</strong><br><div style="margin-top: 10px; line-height: 1.6;">${formattedText}</div>`;
        }
    },

    renderError(questionId, errorMsg) {
        const container = document.getElementById(questionId);
        const expDiv = container.querySelector('.ai-explanation');
        if (expDiv) {
            expDiv.innerHTML = `<span style="color: var(--accent-color);">⚠️ Lỗi: ${errorMsg}</span>`;
        }
    }
};