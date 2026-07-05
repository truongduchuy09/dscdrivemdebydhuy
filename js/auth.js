// --- CẤU HÌNH LIÊN KẾT HỆ THỐNG ---
const CLIENT_ID = '1523300504392958055'; // Điền CLIENT_ID ứng dụng Discord của bạn vào đây
const REDIRECT_URI = window.location.origin + window.location.pathname; // Tự động lấy URL GitHub Pages hiện tại
const BACKEND_URL = '14.244.198.134:5000 '; // Đường dẫn Web Service chạy Node.js trên Render

document.addEventListener('DOMContentLoaded', () => {
    const btnLogin = document.getElementById('btn-login');
    const btnLogout = document.getElementById('btn-logout');
    const loginScreen = document.getElementById('login-section'); // Khớp với ID phần login của em
    const mainDrive = document.getElementById('main-app-section'); // Khớp với ID giao diện chính của em
    const loginError = document.getElementById('login-error');
    const loginLoading = document.getElementById('login-loading');

    // 1. Kiểm tra URL xem có nhận được callback code từ Discord không
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        window.history.replaceState({}, document.title, window.location.pathname);
        handleDiscordCallback(code);
        return;
    }

    // 2. Nếu không có code, kiểm tra Session/User cũ trong bộ nhớ trình duyệt
    const savedUser = localStorage.getItem('discord_user');
    if (savedUser) {
        displayDriveUI(JSON.parse(savedUser));
    } else {
        showLoginScreen();
    }

    // Sự kiện khi click nút Đăng nhập
    if (btnLogin) {
        btnLogin.addEventListener('click', (e) => {
            e.preventDefault();
            const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;
            window.location.href = discordAuthUrl;
        });
    }

    // Sự kiện khi click nút Đăng xuất (Nếu em có làm nút này)
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('discord_user');
            window.location.reload();
        });
    }

    // Hàm gửi mã code lên Node.js Backend để đổi lấy dữ liệu User
    async function handleDiscordCallback(authCode) {
        setLoadingState(true);
        try {
            // Đổi phương thức sang GET tương thích với endpoint callback hiện tại của em
            const response = await fetch(`${BACKEND_URL}/api/auth/callback?code=${authCode}`);
            const data = await response.json();

            if (response.ok && data.user) {
                localStorage.setItem('discord_user', JSON.stringify(data.user));
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

    function displayDriveUI(user) {
        if (loginScreen) loginScreen.classList.add('hidden');
        if (mainDrive) mainDrive.classList.remove('hidden');
        
        const avatarUrl = user.avatar 
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/0.png`;
            
        const uiAvatar = document.getElementById('user-avatar');
        const uiName = document.getElementById('user-name');
        
        if (uiAvatar) uiAvatar.src = avatarUrl;
        if (uiName) uiName.textContent = user.global_name || user.username;
    }

    function showLoginScreen() {
        if (loginScreen) loginScreen.classList.remove('hidden');
        if (mainDrive) mainDrive.classList.add('hidden');
    }

    function setLoadingState(isLoading) {
        if (loginLoading) {
            if (isLoading) loginLoading.classList.remove('hidden');
            else loginLoading.classList.add('hidden');
        }
        if (isLoading && loginError) loginError.classList.add('hidden');
    }

    function showError(msg) {
        showLoginScreen();
        if (loginError) {
            loginError.textContent = msg;
            loginError.classList.remove('hidden');
        } else {
            alert(msg);
        }
    }
});
