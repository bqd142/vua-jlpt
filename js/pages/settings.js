// js/pages/settings.js
document.addEventListener("DOMContentLoaded", () => {
    const keyInput = document.getElementById('api-key-input');
    const btnSaveKey = document.getElementById('btn-save-key');
    const keyStatus = document.getElementById('key-status');
    const btnClearData = document.getElementById('btn-clear-data');

    // Hiển thị trạng thái key hiện tại
    const currentKey = StorageService.getApiKey();
    if (currentKey) {
        keyInput.value = currentKey; 
        keyStatus.innerText = "✅ Hệ thống đang kết nối AI.";
        keyStatus.style.color = "green";
    }

    btnSaveKey.addEventListener('click', () => {
        const val = keyInput.value.trim();
        if (val) {
            StorageService.saveApiKey(val);
            keyStatus.innerText = "✅ Lưu API Key thành công!";
            keyStatus.style.color = "green";
        } else {
            keyStatus.innerText = "⚠️ Key không được để trống.";
            keyStatus.style.color = "var(--accent-color)";
        }
    });

    btnClearData.addEventListener('click', () => {
        if(confirm("CẢNH BÁO: Bạn có chắc chắn muốn xóa TOÀN BỘ lịch sử và cài đặt?")) {
            localStorage.removeItem(StorageService.consts.PROGRESS_KEY);
            localStorage.removeItem(StorageService.consts.API_KEY);
            alert("Đã xóa toàn bộ dữ liệu hệ thống!");
            location.reload();
        }
    });
});