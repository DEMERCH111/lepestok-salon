import { getAppointments, setAppointmentStatus, deleteAppointment, formatAppointmentDate, getTodayString, getProducts, getMainImage } from './store.js';

// ========== ПРОВЕРКА ВХОДА ==========
if (localStorage.getItem("adminLoggedIn") !== "true") {
  window.location.href = "admin-login.html";
}

document.getElementById("logoutBtn").onclick = () => {
  if (confirm("Выйти из админ-панели?")) {
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("adminUser");
    localStorage.removeItem("adminRole");
    window.location.href = "admin-login.html";
  }
};

const adminUser = localStorage.getItem("adminUser") || "admin";
document.getElementById("adminUserLabel").textContent = adminUser;

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let allProducts = [];
let currentDateFilter = "all";

// ========== ФИЛЬТР ==========
const dateFilterEl = document.getElementById("dateFilter");
if (dateFilterEl) {
  dateFilterEl.onchange = (e) => {
    currentDateFilter = e.target.value;
    renderAppointments();
  };
}

// ========== РЕНДЕР ЗАПИСЕЙ ==========
async function renderAppointments() {
  const box = document.getElementById("appointmentsList");
  
  // Загружаем товары, чтобы брать оттуда фото
  if (allProducts.length === 0) {
    allProducts = await getProducts();
  }

  let list = await getAppointments();

  // Сортируем по ID (новые записи сверху)
  list.sort((a, b) => b.id - a.id);

  // Фильтрация
  const today = getTodayString();
  if (currentDateFilter === "today") {
    list = list.filter(a => a.date === today);
  } else if (currentDateFilter === "future") {
    list = list.filter(a => a.date >= today);
  } else if (currentDateFilter === "past") {
    list = list.filter(a => a.date < today);
  }

  if (list.length === 0) {
    box.innerHTML = `<div class="admin-empty">Записей пока нет</div>`;
    return;
  }

  box.innerHTML = list.map(a => {
    const isPast = a.date < today;
    const statusLabel = a.status === "done" ? "Выполнена" :
                       a.status === "cancelled" ? "Отменена" : "Активна";
    const statusColor = a.status === "done" ? "#95a5a6" :
                       a.status === "cancelled" ? "#e63946" : "#27ae60";

    // Ищем фото товара
    let productImageHtml = "";
    if (a.product_id) {
      const product = allProducts.find(p => p.id === a.product_id);
      if (product) {
        const imgSrc = getMainImage(product);
        productImageHtml = `
          <a href="product.html?id=${a.product_id}" target="_blank" style="display: inline-block; margin-right: 10px; vertical-align: middle;">
            <img src="${imgSrc}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px; border: 1px solid #eee;" title="Открыть товар" onerror="this.src='https://via.placeholder.com/40x40/fbe9ea/c98b8f?text=Фото'">
          </a>
        `;
      }
    }

    return `
      <div class="appointment-card ${isPast ? "appointment-card--past" : ""}">
        <div class="appointment-card__date-block">
          <div class="appointment-card__day">${formatAppointmentDate(a.date)}</div>
          <div class="appointment-card__time">${a.time}</div>
        </div>

        <div class="appointment-card__info">
          <div class="appointment-card__row">
            <strong>${a.name}</strong>
            <span class="order-status" style="background:${statusColor}">${statusLabel}</span>
          </div>
          <div class="appointment-card__row">
            📞 <a href="tel:${a.phone}">${a.phone}</a>
          </div>
          
          ${a.product_title ? `
            <div class="appointment-card__row" style="margin-top: 8px;">
              <span style="vertical-align: middle;">👗 ${a.product_title}</span>
            </div>
          ` : ""}
          
          ${a.promoCode ? `<div class="appointment-card__row" style="color:#e67e22;font-weight:bold;">🎁 Промокод: ${a.promoCode}</div>` : ""}
        </div>

        <div class="appointment-card__actions">
          ${a.product_id && allProducts.find(p => p.id === a.product_id) ? `
            <a href="product.html?id=${a.product_id}" target="_blank" title="Открыть карточку товара">
              <img src="${getMainImage(allProducts.find(p => p.id === a.product_id))}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 8px; border: 1px solid #eee; margin-right: 15px; cursor: pointer;" onerror="this.src='https://via.placeholder.com/70x70/fbe9ea/c98b8f?text=Фото'">
            </a>
          ` : ""}
          
          <select data-status="${a.id}">
            <option value="new" ${a.status === "new" ? "selected" : ""}>Активна</option>
            <option value="done" ${a.status === "done" ? "selected" : ""}>Выполнена</option>
            <option value="cancelled" ${a.status === "cancelled" ? "selected" : ""}>Отменена</option>
          </select>
          <button class="btn-icon btn-icon--danger" data-del="${a.id}" title="Удалить"><img src="images/musorka.png" class="icon-img" alt="Удал."></button>
        </div>
      </div>
    `;
  }).join("");

  // Смена статуса
  box.querySelectorAll("[data-status]").forEach(sel => {
    sel.onchange = async () => {
      await setAppointmentStatus(+sel.dataset.status, sel.value);
      await renderAppointments();
    };
  });

  // Удаление
  box.querySelectorAll("[data-del]").forEach(btn => {
    btn.onclick = async () => {
      const id = +btn.dataset.del;
      if (confirm(`Удалить запись №${id}?`)) {
        await deleteAppointment(id);
        await renderAppointments();
      }
    };
  });
}

// ========== СТАРТ ==========
renderAppointments();