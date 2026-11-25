import { getToken } from "./auth.js";
import { API_BASE } from "./firebase-config.js";

export async function api(path, { method = "GET", body } = {}) {
    const res = await fetch(API_BASE + path, {
        method,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getToken()}`,
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || `Lỗi ${res.status}`);
    return json;
}

// Chống chèn HTML khi hiển thị dữ liệu người dùng
export const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);