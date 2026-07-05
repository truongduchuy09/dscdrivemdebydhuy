// --- CẤU HÌNH LIÊN KẾT HỆ THỐNG ---
const CLIENT_ID = '1523300504392958055'; // Điền CLIENT_ID ứng dụng Discord của bạn vào đây
const REDIRECT_URI = window.location.origin + window.location.pathname; // Tự động lấy URL GitHub Pages hiện tại
const BACKEND_URL = '14.244.198.134:5000 '; // Đường dẫn Web Service chạy Node.js trên Render

document.addEventListener('DOMContentLoaded', async () => {
    const authCard = document.getElementById('auth-card');
    const driveCard = document.getElementById('drive-card');
    const btnLogin = document.getElementById('btn-login');
    const btnLogout = document.getElementById('btn-logout');
    const authError = document.getElementById('auth-error');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');

    // Sự kiện click nút đăng nhập Discord
    if (btnLogin) {
        btnLogin.addEventListener('click', () => {
            window.location.href = DISCORD_OAUTH_URL;
        });
    }

    // Sự kiện click Đăng xuất
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = window.location.origin + window.location.pathname;
        });
    }

    // 1. KIỂM TRA ĐIỀU HƯỚNG CALLBACK OAUTH2 (Khi từ Discord chuyển hướng về)
    const urlParams = new URLSearchParams(window.search || window.location.search);
    const code = urlParams.get('code');

    if (code) {
        // Xóa code trên thanh địa chỉ cho sạch URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        try {
            btnLogin.innerText = 'Đang xác thực hệ thống...';
            btnLogin.disabled = true;

            const res = await fetch(`${BACKEND_AUTH_URL}/api/auth/callback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Xác thực thất bại!');

            // Lưu dữ liệu định danh phiên đăng nhập vào máy người dùng
            localStorage.setItem('session_token', data.session_token);
            localStorage.setItem('user_info', JSON.stringify(data.user));

            showDriveScreen(data.user);
        } catch (err) {
            console.error(err);
            authError.textContent = err.message;
            authError.classList.remove('hidden');
            btnLogin.innerText = 'Liên kết với Discord';
            btnLogin.disabled = false;
        }
        return;
    }

    // 2. TỰ ĐỘNG VERIFY NẾU ĐÃ CÓ SẴN SESSION TOKEN TRONG MÁY
    const savedToken = localStorage.getItem('session_token');
    const savedUser = localStorage.getItem('user_info');

    if (savedToken && savedUser) {
        try {
            const res = await fetch(`${BACKEND_AUTH_URL}/api/auth/verify`, {
                headers: { 'Authorization': `Bearer ${savedToken}` }
            });

            if (res.ok) {
                showDriveScreen(JSON.parse(savedUser));
            } else {
                // Token cũ hỏng hoặc hết hạn -> xóa sạch
                localStorage.clear();
            }
        } catch (err) {
            console.error("Lỗi xác thực tự động:", err);
        }
    }

    function showDriveScreen(user) {
        authCard.style.display = 'none';
        driveCard.style.display = 'flex';
        userName.textContent = user.username;
        // Hiển thị avatar người dùng từ CDN Discord
        userAvatar.src = user.avatar 
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
            : 'https://cdn.discordapp.com/embed/avatars/0.png';
    }
});
