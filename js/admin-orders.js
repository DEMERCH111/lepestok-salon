import { getOrders, getAppointments, setOrderStatus, deleteOrder, setAppointmentStatus, deleteAppointment, formatOrderDate, formatAppointmentDate } from './store.js';

// ========== ПРОВЕРКА ВХОДА ==========
if (localStorage.getItem("adminLoggedIn") !== "true") {
  window.location.href = "admin-login.html";
}

document.getElementById("logoutBtn").onclick = () => {
  if (confirm("Выйти?")) { 
    localStorage.removeItem("adminLoggedIn"); 
    localStorage.removeItem("adminUser"); 
    localStorage.removeItem("adminRole"); 
    window.location.href = "admin-login.html"; 
  }
};

document.getElementById("adminUserLabel").textContent = localStorage.getItem("adminUser") || "admin";

// ========== ФИЛЬТР ==========
let currentStatus = "all";
document.getElementById("statusFilter").onchange = (e) => {
  currentStatus = e.target.value;
  renderOrders();
};

// ========== РЕНДЕР ==========
async function renderOrders() {
  const box = document.getElementById("ordersList");
  
  // Получаем заказы (пока пустые) и записи (appointments)
  let orders = await getOrders();
  let appointments = await getAppointments();

  // Фильтруем по статусу
  if (currentStatus !== "all") {
    orders = orders.filter(o => o.status === currentStatus);
    appointments = appointments.filter(a => a.status === currentStatus);
  }

  // Сортируем по ID (новые сверху)
  orders.sort((a, b) => b.id - a.id);
  appointments.sort((a, b) => b.id - a.id);

  if (orders.length === 0 && appointments.length === 0) {
    box.innerHTML = `<div class="admin-empty">Заявок пока нет</div>`;
    return;
  }

  let html = "";

  // 1. Заказы из корзины (если появятся)
  if (orders.length > 0) {
    html += orders.map(o => `
      <div class="order-card" data-order-id="${o.id}">
        <div class="order-card__head">
          <div>
            <strong>Заказ №${o.id}</strong>
            <span class="order-card__date">${formatOrderDate(o.createdAt)}</span>
          </div>
        </div>
        <div class="order-card__customer">
          <div><strong>Клиент:</strong> ${o.customer?.name || "—"}</div>
          <div><strong>Телефон:</strong> ${o.customer?.phone || "—"}</div>
        </div>
        <div class="order-card__actions">
          <button class="btn-icon btn-icon--danger" data-del-order="${o.id}">🗑 Удалить</button>
        </div>
      </div>
    `).join("");
  }

  // 2. Записи на примерку (appointments)
  if (appointments.length > 0) {
    html += appointments.map(a => {
      const statusLabel = a.status === "done" ? "Выполнена" : a.status === "cancelled" ? "Отменена" : "Активна";
      return `
        <div class="order-card" data-app-id="${a.id}" style="border-left-color: #e67e22;">
          <div class="order-card__head">
            <div>
              <strong>Запись №${a.id}</strong>
              <span class="order-card__date">${formatAppointmentDate(a.date)} в ${a.time}</span>
            </div>
            <span class="order-status" style="background:${a.status === 'done' ? '#95a5a6' : a.status === 'cancelled' ? '#e63946' : '#27ae60'}">${statusLabel}</span>
          </div>
          <div class="order-card__customer">
            <div><strong>Клиент:</strong> ${a.name}</div>
            <div><strong>Телефон:</strong> <a href="tel:${a.phone}">${a.phone}</a></div>
            <div><strong>Товар/Услуга:</strong> ${a.product_title}</div>
          </div>
          <div class="order-card__actions">
            <select data-app-status="${a.id}">
              <option value="new" ${a.status === "new" ? "selected" : ""}>Активна</option>
              <option value="done" ${a.status === "done" ? "selected" : ""}>Выполнена</option>
              <option value="cancelled" ${a.status === "cancelled" ? "selected" : ""}>Отменена</option>
            </select>
            <button class="btn-icon btn-icon--danger" data-del-app="${a.id}">🗑</button>
          </div>
        </div>
      `;
    }).join("");
  }

  box.innerHTML = html;

  // Обработчики для записей
  box.querySelectorAll("[data-app-status]").forEach(sel => {
    sel.onchange = async () => {
      await setAppointmentStatus(+sel.dataset.appStatus, sel.value);
      await renderOrders();
    };
  });
  box.querySelectorAll("[data-del-app]").forEach(btn => {
    btn.onclick = async () => {
      if (confirm("Удалить запись?")) {
        await deleteAppointment(+btn.dataset.delApp);
        await renderOrders();
      }
    };
  });

  // Обработчики для заказов
  box.querySelectorAll("[data-del-order]").forEach(btn => {
    btn.onclick = async () => {
      if (confirm("Удалить заказ?")) {
        await deleteOrder(+btn.dataset.delOrder);
        await renderOrders();
      }
    };
  });
}

// ========== СТАРТ ==========
renderOrders();