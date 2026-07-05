// --- CẤU HÌNH LIÊN KẾT HỆ THỐNG ---
const CLIENT_ID = '112233445566778899'; // Điền CLIENT_ID ứng dụng Discord của bạn vào đây
const REDIRECT_URI = window.location.origin + window.location.pathname; // Tự động lấy URL GitHub Pages hiện tại
const BACKEND_URL = 'https://your-bot-auth.onrender.com'; // Đường dẫn Web Service chạy Node.js trên Render

document.addEventListener('DOMContentLoaded', () => {
    const btnLogin = document.getElementById('btn-login');
    const btnLogout = document.getElementById('btn-logout');
    const loginScreen = document.getElementById('login-screen');
    const mainDrive = document.getElementById('main-drive'); // ID của khung giao diện Google Drive gốc
    const loginError = document.getElementById('login-error');
    const loginLoading = document.getElementById('login-loading');

    // 1. Kiểm tra URL xem có nhận được callback code từ Discord không
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        // Xóa sạch param ?code trên URL để giữ thanh địa chỉ sạch đẹp
        window.history.replaceState({}, document.title, window.location.pathname);
        handleDiscordCallback(code);
        return;
    }

    // 2. Nếu không có code, kiểm tra Session Token cũ trong bộ nhớ trình duyệt
    const sessionToken = localStorage.getItem('session_token');
    if (sessionToken) {
        verifySession(sessionToken);
    } else {
        showLoginScreen();
    }

    // Sự kiện khi click nút Đăng nhập
    if (btnLogin) {
        btnLogin.addEventListener('click', () => {
            const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;
            window.location.href = discordAuthUrl;
        });
    }

    // Sự kiện khi click nút Đăng xuất
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('session_token');
            window.location.reload();
        });
    }

    // Hàm gửi mã code lên Node.js Backend để đổi lấy Session Token
    async function handleDiscordCallback(authCode) {
        setLoadingState(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/callback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: authCode })
            });

            const data = await response.json();

            if (response.ok && data.session_token) {
                localStorage.setItem('session_token', data.session_token);
                displayDriveUI(data.user);
            } else {
                showError(data.message || 'Xác thực tài khoản thất bại!');
            }
        } catch (error) {
            showError('Không thể kết nối đến máy chủ xác thực Backend.');
        } finally {
            setLoadingState(false);
        }
    }

    // Hàm xác minh Token mỗi khi F5 hoặc truy cập lại trang web
    async function verifySession(token) {
        setLoadingState(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/verify`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (response.ok) {
                displayDriveUI(data.user);
            } else {
                localStorage.removeItem('session_token');
                showLoginScreen();
            }
        } catch (error) {
            showError('Hệ thống đang khởi động (Render ngủ đông), vui lòng đợi giây lát rồi tải lại trang...');
        } finally {
            setLoadingState(false);
        }
    }

    function displayDriveUI(user) {
        if (loginScreen) loginScreen.classList.add('hidden');
        if (mainDrive) mainDrive.classList.remove('hidden');
        
        // Cập nhật Avatar và Tên tài khoản lên giao diện Google Drive
        const avatarUrl = user.avatar 
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/0.png`;
            
        const uiAvatar = document.getElementById('user-avatar');
        const uiName = document.getElementById('user-name');
        
        if (uiAvatar) uiAvatar.src = avatarUrl;
        if (uiName) uiName.textContent = user.username;
    }

    function showLoginScreen() {
        if (loginScreen) loginScreen.classList.remove('hidden');
        if (mainDrive) mainDrive.classList.add('hidden');
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            if (loginLoading) loginLoading.classList.remove('hidden');
            if (loginError) loginError.classList.add('hidden');
        } else {
            if (loginLoading) loginLoading.classList.add('hidden');
        }
    }

    function showError(msg) {
        showLoginScreen();
        if (loginError) {
            loginError.textContent = msg;
            loginError.classList.remove('hidden');
        }
    }
});
