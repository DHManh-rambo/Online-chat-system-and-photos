import { requireAdmin, logout } from "./auth/auth.js";
import { api, esc } from "./utils/api.js";

const $ = (id) => document.getElementById(id);

// Hiển thị skeleton trong lúc chờ dữ liệu
function showDashboardSkeleton() {
    // 8 thẻ thống kê
    $("stats").innerHTML = Array.from({ length: 8 })
        .map(
            () => `
            <div class="stat">
                <div class="skeleton" style="height: 34px; width: 60%; margin-bottom: 8px;"></div>
                <div class="skeleton" style="height: 16px; width: 80%;"></div>
            </div>`
        )
        .join("");

    // 7 cột biểu đồ
    $("bars").innerHTML = Array.from({ length: 7 })
        .map(
            () => `
            <div class="bar">
                <div class="skeleton" style="height: 100%; width: 100%; max-width: 40px; border-radius: 6px 6px 0 0;"></div>
                <div class="skeleton" style="height: 12px; width: 30px; margin-top: 8px;"></div>
            </div>`
        )
        .join("");
}

async function loadOverview() {
    showDashboardSkeleton();
    $("msg").textContent = "";

    try {
        const overview = (await api("/dashboard/overview")).data;

        const statCards = [
            ["Tổng tài khoản", overview.total],
            ["Hoạt động", overview.byStatus.active],
            ["Chờ xác thực", overview.byStatus.pending],
            ["Bị khóa", overview.byStatus.locked],
            ["Khách hàng", overview.byRole.customer],
            ["Quản trị viên", overview.byRole.admin],
            ["Mới hôm nay", overview.newToday],
            ["Mới 7 ngày", overview.new7Days],
        ];

        $("stats").innerHTML = statCards
            .map(
                ([label, value]) =>
                    `<div class="stat"><b>${esc(value)}</b><span>${esc(label)}</span></div>`
            )
            .join("");

        const maxCount = Math.max(...overview.signupsByDay.map((x) => x.count), 1);
        $("bars").innerHTML = overview.signupsByDay
            .map((item) => {
                const [, month, day] = item.date.split("-");
                const heightPercent = (item.count / maxCount) * 100;
                return (
                    `<div class="bar">` +
                    `${esc(item.count)}` +
                    `<i style="height:${heightPercent}%"></i>` +
                    `<small>${esc(day)}/${esc(month)}</small>` +
                    `</div>`
                );
            })
            .join("");
    } catch (err) {
        $("msg").textContent = err.message;
        $("stats").innerHTML = "";
        $("bars").innerHTML = "";
    }
}

$("logout").onclick = logout;

if (await requireAdmin()) {
    loadOverview();
}