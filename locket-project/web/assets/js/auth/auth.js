import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { firebaseConfig } from "../utils/firebase_config.js";

const auth = getAuth(initializeApp(firebaseConfig));

const LOGIN_URL = new URL("../../../login.html", import.meta.url).href;
export const DASHBOARD_URL = new URL("../../../pages/dashboard.html", import.meta.url).href;

function loginErrorMessage(error) {
    const messages = {
        "auth/invalid-credential": "Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.",
        "auth/wrong-password": "Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.",
        "auth/user-not-found": "Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.",
        "auth/invalid-email": "Email không đúng định dạng.",
        "auth/user-disabled": "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.",
        "auth/too-many-requests": "Bạn đã thử đăng nhập quá nhiều lần. Hãy chờ một lúc rồi thử lại.",
        "auth/network-request-failed": "Không thể kết nối tới máy chủ. Hãy kiểm tra mạng rồi thử lại.",
        "auth/operation-not-allowed": "Đăng nhập bằng email và mật khẩu chưa được bật trong Firebase.",
    };

    return messages[error?.code] || "Không thể đăng nhập lúc này. Vui lòng thử lại sau.";
}

export async function login(email, password) {
    try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const token = await cred.user.getIdTokenResult(true);

        if (token.claims.admin !== true) {
            await signOut(auth);
            throw new Error("Tài khoản này chưa được cấp quyền quản trị.");
        }
    } catch (error) {
        // Không để lại phiên đăng nhập nếu bước kiểm tra quyền thất bại.
        await signOut(auth).catch(() => {});

        if (error instanceof Error && !error.code) {
            throw error;
        }

        throw new Error(loginErrorMessage(error));
    }
}

export async function logout() {
    await signOut(auth);
    location.replace(LOGIN_URL);
}

// Chỉ để điều hướng giao diện. Quyền thật do backend kiểm tra.
export function requireAdmin() {
    return new Promise((resolve) => {
        const redirectToLogin = () => {
            location.replace(LOGIN_URL);
            resolve(false);
        };

        const off = onAuthStateChanged(auth, async (user) => {
            off();
            if (!user) return redirectToLogin();

            try {
                const t = await user.getIdTokenResult(true);
                if (t.claims.admin === true) return resolve(true);
            } catch (err) {
                console.error('Không thể kiểm tra quyền admin:', err);
            }

            try {
                await signOut(auth);
            } catch (err) {
                console.error('Không thể đăng xuất phiên admin:', err);
            }

            redirectToLogin();
        }, (err) => {
            off();
            console.error('Không thể đọc trạng thái đăng nhập:', err);
            redirectToLogin();
        });
    });
}

export const getToken = () => auth.currentUser.getIdToken();
