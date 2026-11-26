import { requireAdmin, logout } from "./auth/auth.js";
import { api, esc } from "./utils/api.js";

// ---------- Tham chiếu DOM ----------
const $ = (id) => document.getElementById(id);

// ---------- Trạng thái ----------
let currentPage = 1;
let totalPages = 1;
let editingUid = null;   // uid của user đang sửa (null = đang tạo mới)
let viewingUser = null;  // object user đang xem trong dialog chi tiết

const STATUS_TEXT = {
    pending: "Chờ xác thực",
    active: "Hoạt động",
    locked: "Bị khóa",
};

// ---------- Helpers hiển thị ----------
const yesNo = (value) =>
    value === null || value === undefined ? "—" : value ? "Có" : "Không";

const formatDateTime = (iso) =>
    iso ? new Date(iso).toLocaleString("vi-VN") : "—";

// Nút hành động theo trạng thái:
//   active  -> Khóa
//   locked  -> Mở khóa
//   pending -> Kích hoạt
function statusButton(user) {
    const attrs = `data-act="toggle" data-uid="${esc(user.uid)}" data-status="${esc(user.status)}"`;
    if (user.status === "active") {
        return `<button class="sm red" ${attrs}>Khóa</button>`;
    }
    if (user.status === "locked") {
        return `<button class="sm green" ${attrs}>Mở khóa</button>`;
    }
    return `<button class="sm green" ${attrs}>Kích hoạt</button>`;
}

// ================================================================
// DANH SÁCH
// ================================================================
function showTableSkeleton() {
    $("rows").innerHTML = Array.from({ length: 5 })
        .map(
            () => `
            <tr>
                <td><div class="skeleton" style="height: 20px; width: 120px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 180px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 100px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 60px;"></div></td>
                <td><div class="skeleton" style="height: 20px; width: 80px;"></div></td>
                <td><div class="skeleton" style="height: 28px; width: 200px;"></div></td>
            </tr>`
        )
        .join("");
}

async function loadList() {
    $("msg").textContent = "";
    showTableSkeleton(); // Hiển thị skeleton trước khi gọi API

    try {
        const params = new URLSearchParams({
            search: $("search").value.trim(),
            status: $("fltStatus").value,
            role: $("fltRole").value,
            page: currentPage,
            limit: 10,
        });

        const { data } = await api(`/users?${params}`);

        totalPages = Math.max(Math.ceil(data.total / data.limit), 1);
        if (currentPage > totalPages) {
            currentPage = totalPages;
            return loadList();
        }

        $("pageInfo").textContent = `Trang ${data.page}/${totalPages} · ${data.total} tài khoản`;

        if (data.users.length === 0) {
            $("rows").innerHTML = `<tr><td colspan="6" class="empty-state">Không có dữ liệu</td></tr>`;
        } else {
            $("rows").innerHTML = data.users
                .map(
                    (user) => `
                <tr>
                    <td>${esc(user.fullName)}</td>
                    <td>${esc(user.email)}</td>
                    <td>${esc(user.phone || "—")}</td>
                    <td><span class="badge ${esc(user.role)}">${esc(user.role)}</span></td>
                    <td><span class="badge ${esc(user.status)}">${esc(STATUS_TEXT[user.status] || user.status)}</span></td>
                    <td>
                        <button class="sm gray" data-act="view" data-uid="${esc(user.uid)}">Xem</button>
                        <button class="sm" data-act="edit" data-uid="${esc(user.uid)}">Sửa</button>
                        ${statusButton(user)}
                        <button class="sm red" data-act="delete" data-uid="${esc(user.uid)}" data-email="${esc(user.email)}">Xóa</button>
                    </td>
                </tr>`
                )
                .join("");
        }
    } catch (err) {
        $("msg").textContent = err.message;
        $("rows").innerHTML = `<tr><td colspan="6" class="empty-state" style="color: #dc2626;">Đã xảy ra lỗi khi tải dữ liệu</td></tr>`;
    }
}

// ================================================================
// DIALOG THÊM / SỬA
// ================================================================

function openEditDialog(user) {
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

$("form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const commonData = {
        fullName: $("fName").value,
        email: $("fEmail").value,
        phone: $("fPhone").value,
        dateOfBirth: $("fDob").value,
    };

    try {
        if (editingUid) {
            await api(`/users/${editingUid}`, { method: "PUT", body: commonData });
        } else {
            await api("/users", {
                method: "POST",
                body: {
                    ...commonData,
                    password: $("fPass").value,
                    role: $("fRole").value,
                },
            });
        }
        $("dlg").close();
        loadList();
    } catch (err) {
        $("fMsg").textContent = err.message;
    }
});

$("btnAdd").onclick = () => openEditDialog(null);
$("btnCancel").onclick = () => $("dlg").close();

// ================================================================
// DIALOG CHI TIẾT
// ================================================================

async function openDetailDialog(uid) {
    // Reset trạng thái dialog trước khi load
    viewingUser = null;
    $("detailMsg").textContent = "";
    $("detailMsg").style.color = "";
    $("detailAvatar").innerHTML = "";
    $("detailInfo").innerHTML = "";

    try {
        const user = (await api(`/users/${encodeURIComponent(uid)}`)).data;
        viewingUser = user;
        renderDetail(user);
    } catch (err) {
        $("detailMsg").textContent = err.message;
    }

    $("detailDlg").showModal();
}

function renderDetail(user) {
    // Avatar: có ảnh thì hiện ảnh, chưa có thì hiện chữ cái đầu của tên
    const initial = ((user.fullName || "").trim().split(/\s+/).pop() || "?")[0].toUpperCase();

    $("detailAvatar").innerHTML = user.avatarUrl
        ? `<img src="${esc(user.avatarUrl)}" alt="avatar" width="72" height="72" style="border-radius:50%;object-fit:cover">`
        : `<div style="width:72px;height:72px;border-radius:50%;background:#dbeafe;color:#1d4ed8;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:700">${esc(initial)}</div>`;

    const rows = [
        ["UID", user.uid],
        ["Họ tên", user.fullName],
        ["Email", user.email],
        ["Email đã xác thực", yesNo(user.emailVerified)],
        ["Số điện thoại", user.phone || "—"],
        ["Ngày sinh", user.dateOfBirth ? user.dateOfBirth.split("-").reverse().join("/") : "—"],
        ["Quyền (Firestore)", user.role],
        ["Claim admin (Auth)", yesNo(user.isAdminClaim)],
        ["Trạng thái (Firestore)", STATUS_TEXT[user.status] || user.status],
        ["Bị vô hiệu hóa (Auth)", yesNo(user.authDisabled)],
        ["Ngày tạo", formatDateTime(user.createdAt)],
        ["Cập nhật lần cuối", formatDateTime(user.updatedAt)],
    ];

    $("detailInfo").innerHTML = rows
        .map(([label, value]) => `<dt>${label}</dt><dd>${esc(value)}</dd>`)
        .join("");
}

// Chạy 1 hành động trong dialog chi tiết, hiện thông báo xanh/đỏ,
// sau đó tải lại dữ liệu user để cập nhật hiển thị
async function runDetailAction(action, successMessage) {
    $("detailMsg").style.color = "#dc2626";
    $("detailMsg").textContent = "";

    try {
        await action();

        $("detailMsg").style.color = "#16a34a";
        $("detailMsg").textContent = successMessage;

        // Tải lại thông tin user để cập nhật (ví dụ: updatedAt thay đổi)
        if (viewingUser) {
            const refreshed = (await api(`/users/${encodeURIComponent(viewingUser.uid)}`)).data;
            viewingUser = refreshed;
            renderDetail(refreshed);
        }
    } catch (err) {
        $("detailMsg").textContent = err.message;
    }
}

$("btnSendReset").onclick = () => {
    if (!viewingUser) return;
    if (!confirm(`Gửi email đặt lại mật khẩu tới ${viewingUser.email}?`)) return;

    runDetailAction(
        () => api(`/users/${viewingUser.uid}/reset-email`, { method: "POST" }),
        "Đã gửi email đặt lại mật khẩu"
    );
};

$("btnChangePass").onclick = () => {
    if (!viewingUser) return;

    const newPassword = prompt("Nhập mật khẩu mới (tối thiểu 6 ký tự):");
    if (!newPassword) return;

    runDetailAction(
        () =>
            api(`/users/${viewingUser.uid}/password`, {
                method: "POST",
                body: { newPassword },
            }),
        "Đã đổi mật khẩu"
    );
};

$("btnCloseDetail").onclick = () => $("detailDlg").close();

// ================================================================
// SỰ KIỆN TRÊN BẢNG (Xem / Sửa / Khóa / Xóa)
// ================================================================

$("rows").addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-act]");
    if (!button) return;

    const { act, uid } = button.dataset;

    try {
        if (act === "view") {
            await openDetailDialog(uid);
        } else if (act === "edit") {
            const user = (await api(`/users/${uid}`)).data;
            openEditDialog(user);
        } else if (act === "toggle") {
            await handleToggleStatus(button, uid);
        } else if (act === "delete") {
            await handleDelete(button, uid);
        }
    } catch (err) {
        $("msg").textContent = err.message;
    }
});

async function handleToggleStatus(button, uid) {
    const currentStatus = button.dataset.status;
    const nextStatus = currentStatus === "active" ? "locked" : "active";

    const questions = {
        active: "Khóa tài khoản này? Người dùng sẽ bị đăng xuất khỏi mọi thiết bị.",
        locked: "Mở khóa tài khoản này?",
        pending: "Kích hoạt luôn tài khoản này mà không cần người dùng xác thực email?",
    };

    if (!confirm(questions[currentStatus])) return;

    await api(`/users/${uid}/status`, {
        method: "PATCH",
        body: { status: nextStatus },
    });
    loadList();
}

async function handleDelete(button, uid) {
    if (!confirm(`Xóa vĩnh viễn ${button.dataset.email}? Không thể hoàn tác.`)) return;

    await api(`/users/${uid}`, { method: "DELETE" });
    loadList();
}

// ================================================================
// SỰ KIỆN TOOLBAR / PHÂN TRANG / ĐĂNG XUẤT
// ================================================================

$("btnSearch").onclick = () => {
    currentPage = 1;
    loadList();
};

$("fltStatus").onchange = $("fltRole").onchange = () => {
    currentPage = 1;
    loadList();
};

$("search").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        currentPage = 1;
        loadList();
    }
});

$("prev").onclick = () => {
    if (currentPage > 1) {
        currentPage--;
        loadList();
    }
};

$("next").onclick = () => {
    if (currentPage < totalPages) {
        currentPage++;
        loadList();
    }
};

$("logout").onclick = logout;

// ================================================================
// KHỞI ĐỘNG
// ================================================================

if (await requireAdmin()) {
    loadList();
}