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
        const off = onAuthStateChanged(auth, async (user) => {
            off();
            if (!user) return location.replace(LOGIN_URL);
            const t = await user.getIdTokenResult(true);
            if (t.claims.admin !== true) {
                await signOut(auth);
                return location.replace(LOGIN_URL);
            }
            resolve(user);
        });
    });
}

export const getToken = () => auth.currentUser.getIdToken();