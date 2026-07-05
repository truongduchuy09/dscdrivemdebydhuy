// --- CẤU HÌNH LIÊN KẾT HỆ THỐNG ---
const CLIENT_ID = '1523300504392958055'; // Điền CLIENT_ID ứng dụng Discord của bạn vào đây
const REDIRECT_URI = window.location.origin + window.location.pathname; // Tự động lấy URL GitHub Pages hiện tại
const BACKEND_URL = '14.244.198.134:5000 '; // Đường dẫn Web Service chạy Node.js trên Render

document.addEventListener("DOMContentLoaded", () => {
    console.log("=== Auth.js đã tải xong và sẵn sàng ===");

    // 1. LẤY CÁC PHẦN TỬ GIAO DIỆN (UI ELEMENTS)
    const btnLogin = document.getElementById("btn-login");
    const loginSection = document.getElementById("login-section");
    const mainAppSection = document.getElementById("main-app-section");
    const userAvatar = document.getElementById("user-avatar");
    const userName = document.getElementById("user-name");

    // 2. XỬ LÝ SỰ KIỆN BẤM NÚT "LIÊN KẾT VỚI DISCORD"
    if (btnLogin) {
        console.log("✓ Tìm thấy nút Liên kết Discord (id='btn-login')");
        btnLogin.onclick = function(e) {
            e.preventDefault();
            console.log("🚀 Nút được bấm! Đang chuyển hướng tới Discord Oauth2...");
            
            if (DISCORD_OAUTH_URL === 'DÁN_LINK_URL_GENERATOR_CỦA_EM_VÀO_ĐÂY' || !DISCORD_OAUTH_URL) {
                alert("Lỗi: Bạn chưa cấu hình DISCORD_OAUTH_URL ở đầu file js/auth.js!");
                return;
            }
            
            // Ép trình duyệt chuyển hướng sang trang đăng nhập Discord
            window.location.href = DISCORD_OAUTH_URL;
        };
    } else {
        console.error("❌ Lỗi nghiêm trọng: Không tìm thấy nút bấm nào có id='btn-login' trong file HTML!");
    }

    // 3. XỬ LÝ HẬU OAUTH2 (Khi Discord trả về Code trên URL)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        console.log("⚡ Nhận được Code xác thực từ Discord:", code);
        
        // Xóa code thừa trên thanh địa chỉ cho trình duyệt sạch đẹp
        window.history.replaceState({}, document.title, window.location.pathname);

        // Gửi code này lên Backend Auth (Port 4000) để đổi lấy thông tin User
        fetch(`${BACKEND_AUTH_URL}/api/auth/callback?code=${code}`)
            .then(res => {
                if (!res.ok) throw new Error("Backend trả về lỗi khi xác thực code");
                return res.json();
            })
            .then(data => {
                console.log("🎉 Đăng nhập thành công! Thông tin User nhận được:", data);
                
                // Lưu thông tin vào LocalStorage để các file JS khác (như uploader.js) xài chung
                localStorage.setItem("discord_user", JSON.stringify(data.user));

                // Hiển thị giao diện ứng dụng chính
                showMainApp(data.user);
            })
            .catch(err => {
                console.error("❌ Lỗi quá trình trao đổi Token với Backend Auth:", err);
                alert("Đăng nhập thất bại! Vui lòng kiểm tra lại Backend Auth (Port 4000) xem đã bật chưa.");
            });
    } else {
        // Nếu không có code trên URL, kiểm tra xem trước đó đã đăng nhập chưa
        const savedUser = localStorage.getItem("discord_user");
        if (savedUser) {
            console.log("💾 Tìm thấy phiên đăng nhập cũ trong máy.");
            showMainApp(JSON.parse(savedUser));
        } else {
            console.log("👤 Chưa đăng nhập. Đang đứng ở màn hình Login.");
            if (loginSection) loginSection.classList.remove("hidden");
            if (mainAppSection) mainAppSection.classList.add("hidden");
        }
    }

    // 4. HÀM CHUYỂN ĐỔI GIAO DIỆN KHI ĐĂNG NHẬP THÀNH CÔNG
    function showMainApp(user) {
        if (loginSection) loginSection.classList.add("hidden");
        if (mainAppSection) mainAppSection.classList.remove("hidden");
        
        // Cập nhật Avatar và Tên của User Discord lên góc phải màn hình
        if (userAvatar && user.avatar) {
            userAvatar.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
        }
        if (userName) {
            userName.textContent = user.global_name || user.username;
        }
    }
});
