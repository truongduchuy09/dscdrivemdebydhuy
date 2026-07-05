// Quy chuẩn kích thước mảnh cắt (7MB an toàn tuyệt đối cho tài khoản thường Discord dưới 8MB)
const CHUNK_SIZE = 7 * 1024 * 1024; 

// Cấu hình địa chỉ API độc lập của con BOT DRIVE (Microservice giải phóng RAM)
const BACKEND_DRIVE_URL = 'https://slow-rats-ask.loca.lt'; // Đổi thành link Render Drive của bạn khi deploy

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const uploadProgressBox = document.getElementById('upload-progress-box');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const uploadFileName = document.getElementById('upload-file-name');
    const uploadFileSize = document.getElementById('upload-file-size');
    const uploadStatusText = document.getElementById('upload-status-text');
    const uploadPercentage = document.getElementById('upload-percentage');
    const overloadWarning = document.getElementById('overload-warning');
    const cooldownTimer = document.getElementById('cooldown-timer');

    if (!fileInput) return;

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        await uploadLargeFile(file);
    });

    async function uploadLargeFile(file) {
        // Lấy thông tin user từ localStorage đã được lưu bởi luồng của auth.js
        const currentUserData = localStorage.getItem('user_info');
        let ownerId = 'Unknown';
        let username = 'Guest';

        if (currentUserData) {
            try {
                const parsedUser = JSON.parse(currentUserData);
                ownerId = parsedUser.id || 'Unknown';
                username = parsedUser.username || 'Guest';
            } catch (err) {
                console.error("Không thể trích xuất ID người dùng:", err);
            }
        }

        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        // Tạo UUID ngẫu nhiên định danh phiên tải file
        const uploadId = crypto.randomUUID ? crypto.randomUUID() : `up_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        // Hiển thị UI Hộp tiến trình lên màn hình
        uploadFileName.textContent = file.name;
        uploadFileSize.textContent = `(${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
        uploadProgressBox.classList.remove('hidden');
        updateStatus('Đang khởi tạo cấu trúc dữ liệu bảo mật trên Server...', 0);

        // Vòng lặp tuần tự cắt băm file và bắn lên cụm Bot Drive
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const start = chunkIndex * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            
            // Cắt nhỏ file nhị phân bằng hàm hàm slice có sẵn
            const fileChunk = file.slice(start, end);

            // Đóng gói dữ liệu đa hợp (Multipart Form) để đẩy file thô qua HTTP
            const formData = new FormData();
            formData.append('file_chunk', fileChunk, `${file.name}.part${chunkIndex}`);
            formData.append('upload_id', uploadId);
            formData.append('file_name', file.name);
            formData.append('chunk_index', chunkIndex);
            formData.append('total_chunks', totalChunks);
            formData.append('owner_id', ownerId);       // Đẩy ID sang để bot Drive tạo Category ẩn riêng tư
            formData.append('username', username);     // Đẩy tên để ghi log server

            let success = false;
            let retryCount = 0;

            while (!success) {
                try {
                    updateStatus(`Đang đẩy mảnh mã hóa thứ ${chunkIndex + 1}/${totalChunks}...`, Math.round((chunkIndex / totalChunks) * 100));

                    // Gọi lệnh POST trực tiếp tới Server Node Drive gánh tải RAM
                    const response = await fetch(`${BACKEND_DRIVE_URL}/api/drive/upload-chunk`, {
                        method: 'POST',
                        body: formData
                        // LƯU Ý: Không được khai báo Header 'Content-Type', trình duyệt sẽ tự động nhận diện FormData và sinh Boundary chuẩn.
                    });

                    // Xử lý bộ đếm lùi đắp trả nếu dính Rate Limit 429 từ phía Discord API
                    if (response.status === 429) {
                        const errorData = await response.json();
                        const waitTime = errorData.retry_after || 5;
                        await handleRateLimit(waitTime);
                        retryCount++;
                        continue; 
                    }

                    if (!response.ok) throw new Error('Kết nối đường truyền dữ liệu mảnh bị lỗi.');

                    success = true; // Chuyển sang mảnh tiếp theo
                } catch (error) {
                    console.error(`Sự cố tại vị trí mảnh ${chunkIndex}:`, error);
                    retryCount++;
                    if (retryCount > 3) {
                        updateStatus('❌ Quá trình truyền dữ liệu thất bại. Vui lòng kiểm tra kết nối mạng!', 0);
                        return;
                    }
                    // Đợi 2 giây khôi phục phiên kết nối trước khi re-up mảnh lỗi
                    await new Promise(res => setTimeout(res, 2000)); 
                }
            }
        }

        // Upload xong tất cả mảnh thành công
        updateStatus('✅ Tất cả dữ liệu đã được lưu trữ an toàn trong danh mục riêng tư của bạn!', 100);
        fileInput.value = ''; 
    }

    function updateStatus(text, percent) {
        uploadStatusText.textContent = text;
        uploadPercentage.textContent = `${percent}%`;
        progressBarFill.style.width = `${percent}%`;
    }

    function handleRateLimit(seconds) {
        return new Promise((resolve) => {
            overloadWarning.classList.remove('hidden');
            let timeLeft = seconds;
            cooldownTimer.textContent = timeLeft;

            const interval = setInterval(() => {
                timeLeft--;
                cooldownTimer.textContent = timeLeft;
                if (timeLeft <= 0) {
                    clearInterval(interval);
                    overloadWarning.classList.add('hidden');
                    resolve();
                }
            }, 1000);
        });
    }
});
