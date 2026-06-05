// js/components/ModalUI.js
const ModalUI = {
    init() {
        if (document.getElementById('custom-modal')) return;
        const modalHtml = `
            <div class="modal-overlay" id="custom-modal">
                <div class="modal-box">
                    <div class="modal-title" id="modal-title">Thông báo</div>
                    <div class="modal-content" id="modal-content">Nội dung</div>
                    <div class="modal-actions" id="modal-actions"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    showAlert(title, message) {
        this.init();
        const overlay = document.getElementById('custom-modal');
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-title').style.color = 'var(--secondary-color)';
        document.getElementById('modal-content').innerHTML = message;
        
        const actions = document.getElementById('modal-actions');
        actions.innerHTML = `<button class="btn-modal btn-modal-ok" onclick="ModalUI.close()">OK</button>`;
        
        overlay.classList.add('active');
    },

    showConfirm(title, message, onConfirm) {
        this.init();
        const overlay = document.getElementById('custom-modal');
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-title').style.color = 'var(--accent-color)';
        document.getElementById('modal-content').innerHTML = message;
        
        const actions = document.getElementById('modal-actions');
        actions.innerHTML = `
            <button class="btn-modal btn-modal-cancel" onclick="ModalUI.close()">Hủy</button>
            <button class="btn-modal btn-modal-confirm" id="modal-btn-confirm">Xác nhận</button>
        `;
        
        document.getElementById('modal-btn-confirm').onclick = () => {
            onConfirm();
            this.close();
        };
        
        overlay.classList.add('active');
    },

    close() {
        const overlay = document.getElementById('custom-modal');
        if (overlay) overlay.classList.remove('active');
    }
};