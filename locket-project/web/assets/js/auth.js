import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const auth = getAuth(initializeApp(firebaseConfig));

const LOGIN_URL = new URL("../../index.html", import.meta.url).href;
export const USERS_URL = new URL("../../pages/users.html", import.meta.url).href;

export async function login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const t = await cred.user.getIdTokenResult(true);
    if (t.claims.admin !== true) {
        await signOut(auth);
        throw new Error("Tài khoản không có quyền quản trị");
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
