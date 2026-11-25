import { requireAdmin, logout } from "./auth.js";
import { api, esc } from "./api.js";

const $ = (id) => document.getElementById(id);
let page = 1, totalPages = 1, editingUid = null, me = null;

async function load() {
    $("msg").textContent = "";
    try {
        const q = encodeURIComponent($("search").value.trim());
        const { data } = await api(`/users?search=${q}&page=${page}&limit=10`);
        totalPages = Math.max(Math.ceil(data.total / data.limit), 1);
        $("pageInfo").textContent = `Trang ${data.page}/${totalPages} · ${data.total} tài khoản`;
        $("rows").innerHTML = data.users.map((u) => `
      <tr>
        <td>${esc(u.displayName)}</td>
        <td>${esc(u.email)}</td>
        <td><span class="badge ${u.role}">${esc(u.role)}</span></td>
        <td><span class="badge ${u.status}">${esc(u.status)}</span></td>
        <td>
          <a href="user-detail.html?uid=${encodeURIComponent(u.uid)}"><button class="sm gray">Xem</button></a>
          <button class="sm" data-act="edit" data-uid="${esc(u.uid)}">Sửa</button>
          <button class="sm ${u.status === "active" ? "red" : "green"}" data-act="toggle" data-uid="${esc(u.uid)}" data-status="${esc(u.status)}">
            ${u.status === "active" ? "Khóa" : "Mở khóa"}</button>
          <button class="sm red" data-act="delete" data-uid="${esc(u.uid)}" data-email="${esc(u.email)}">Xóa</button>
        </td>
      </tr>`).join("") || `<tr><td colspan="5">Không có dữ liệu</td></tr>`;
    } catch (err) {
        $("msg").textContent = err.message;
    }
}

function openForm(user) {
    editingUid = user?.uid ?? null;
    $("dlgTitle").textContent = user ? "Sửa tài khoản" : "Thêm tài khoản";
    $("createOnly").hidden = !!user;
    $("editOnly").hidden = !user;
    $("fName").value = user?.displayName ?? "";
    $("fEmail").value = user?.email ?? "";
    $("fPhone").value = user?.phoneNumber ?? "";
    $("fPass").value = "";
    $("fMsg").textContent = "";
    $("dlg").showModal();
}

$("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        if (editingUid) {
            await api(`/users/${editingUid}`, {
                method: "PUT",
                body: { displayName: $("fName").value, email: $("fEmail").value, phoneNumber: $("fPhone").value },
            });
        } else {
            await api("/users", {
                method: "POST",
                body: { displayName: $("fName").value, email: $("fEmail").value, password: $("fPass").value, role: $("fRole").value },
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
            const status = btn.dataset.status === "active" ? "disabled" : "active";
            if (!confirm(status === "disabled" ? "Khóa tài khoản này?" : "Mở khóa tài khoản này?")) return;
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
$("search").addEventListener("keydown", (e) => { if (e.key === "Enter") { page = 1; load(); } });
$("prev").onclick = () => { if (page > 1) { page--; load(); } };
$("next").onclick = () => { if (page < totalPages) { page++; load(); } };
$("logout").onclick = logout;

me = await requireAdmin();
load();