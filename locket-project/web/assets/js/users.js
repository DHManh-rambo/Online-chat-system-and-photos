import { requireAdmin, logout } from "./auth.js";
import { api, esc } from "./api.js";

const $ = (id) => document.getElementById(id);
let page = 1, totalPages = 1, editingUid = null;

const STATUS_TEXT = { pending: "Chờ xác thực", active: "Hoạt động", locked: "Bị khóa" };

// Nút theo trạng thái: active -> Khóa, locked -> Mở khóa, pending -> Kích hoạt
function statusButton(u) {
    const attrs = `data-act="toggle" data-uid="${esc(u.uid)}" data-status="${esc(u.status)}"`;
    if (u.status === "active") return `<button class="sm red" ${attrs}>Khóa</button>`;
    if (u.status === "locked") return `<button class="sm green" ${attrs}>Mở khóa</button>`;
    return `<button class="sm green" ${attrs}>Kích hoạt</button>`;
}

async function load() {
    $("msg").textContent = "";
    try {
        const params = new URLSearchParams({
            search: $("search").value.trim(),
            status: $("fltStatus").value,
            role: $("fltRole").value,
            page,
            limit: 10,
        });
        const { data } = await api(`/users?${params}`);
        totalPages = Math.max(Math.ceil(data.total / data.limit), 1);
        if (page > totalPages) {
            page = totalPages;
            return load();
        }
        $("pageInfo").textContent = `Trang ${data.page}/${totalPages} · ${data.total} tài khoản`;
        $("rows").innerHTML = data.users.map((u) => `
      <tr>
        <td>${esc(u.fullName)}</td>
        <td>${esc(u.email)}</td>
        <td>${esc(u.phone || "—")}</td>
        <td><span class="badge ${esc(u.role)}">${esc(u.role)}</span></td>
        <td><span class="badge ${esc(u.status)}">${esc(STATUS_TEXT[u.status] || u.status)}</span></td>
        <td>
          <a href="user-detail.html?uid=${encodeURIComponent(u.uid)}"><button class="sm gray">Xem</button></a>
          <button class="sm" data-act="edit" data-uid="${esc(u.uid)}">Sửa</button>
          ${statusButton(u)}
          <button class="sm red" data-act="delete" data-uid="${esc(u.uid)}" data-email="${esc(u.email)}">Xóa</button>
        </td>
      </tr>`).join("") || `<tr><td colspan="6">Không có dữ liệu</td></tr>`;
    } catch (err) {
        $("msg").textContent = err.message;
    }
}

function openForm(user) {
    editingUid = user?.uid ?? null;
    $("dlgTitle").textContent = user ? "Sửa tài khoản" : "Thêm tài khoản";
    $("createOnly").hidden = !!user;
    $("fName").value = user?.fullName ?? "";
    $("fEmail").value = user?.email ?? "";
    $("fEmail").disabled = !!user?.emailVerified;
    $("fEmail").title = user?.emailVerified ? "Không thể đổi email đã xác thực" : "";
    $("fPhone").value = user?.phone ?? "";
    $("fDob").value = user?.dateOfBirth ?? "";
    $("fPass").value = "";
    $("fMsg").textContent = "";
    $("dlg").showModal();
}

$("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const common = {
        fullName: $("fName").value,
        email: $("fEmail").value,
        phone: $("fPhone").value,
        dateOfBirth: $("fDob").value,
    };
    try {
        if (editingUid) {
            await api(`/users/${editingUid}`, { method: "PUT", body: common });
        } else {
            await api("/users", {
                method: "POST",
                body: { ...common, password: $("fPass").value, role: $("fRole").value },
            });
        }
        $("dlg").close();
        load();
    } catch (err) {
        $("fMsg").textContent = err.message;
    }
});

$("rows").addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const { act, uid } = btn.dataset;
    try {
        if (act === "edit") {
            openForm((await api(`/users/${uid}`)).data);
        } else if (act === "toggle") {
            const current = btn.dataset.status;
            const status = current === "active" ? "locked" : "active";
            const question = {
                active: "Khóa tài khoản này? Người dùng sẽ bị đăng xuất khỏi mọi thiết bị.",
                locked: "Mở khóa tài khoản này?",
                pending: "Kích hoạt luôn tài khoản này mà không cần người dùng xác thực email?",
            }[current];
            if (!confirm(question)) return;
            await api(`/users/${uid}/status`, { method: "PATCH", body: { status } });
            load();
        } else if (act === "delete") {
            if (!confirm(`Xóa vĩnh viễn ${btn.dataset.email}? Không thể hoàn tác.`)) return;
            await api(`/users/${uid}`, { method: "DELETE" });
            load();
        }
    } catch (err) {
        $("msg").textContent = err.message;
    }
});

$("btnAdd").onclick = () => openForm(null);
$("btnCancel").onclick = () => $("dlg").close();
$("btnSearch").onclick = () => { page = 1; load(); };
$("fltStatus").onchange = $("fltRole").onchange = () => { page = 1; load(); };
$("search").addEventListener("keydown", (e) => { if (e.key === "Enter") { page = 1; load(); } });
$("prev").onclick = () => { if (page > 1) { page--; load(); } };
$("next").onclick = () => { if (page < totalPages) { page++; load(); } };
$("logout").onclick = logout;

if (await requireAdmin()) load();
