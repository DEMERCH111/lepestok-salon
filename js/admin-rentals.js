import { getRentals, setRentalStatus, deleteSale, getProducts, getMainImage } from './store.js';

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

document.getElementById("adminUserLabel").textContent = localStorage.getItem("adminUser") || "admin";

// ========== ГЛОБАЛЬНЫЕ ==========
let allRentals = [];
let currentFilter = "all";
let productsCache = [];

// Найти товар для аренды: сначала по product_id, потом по названию
function findProductForRental(rental) {
  if (!productsCache.length) return null;

  // 1. По product_id самой продажи
  if (rental.product_id) {
    const byId = productsCache.find(p => p.id === rental.product_id);
    if (byId) return byId;
  }

  // 2. По product_id внутри items (если один товар)
  if (rental.items && rental.items.length === 1 && rental.items[0].product_id) {
    const byItemId = productsCache.find(p => p.id === rental.items[0].product_id);
    if (byItemId) return byItemId;
  }

  // 3. Fallback — по названию (первый товар в чеке)
  const titleToFind = (rental.items && rental.items[0] && rental.items[0].title)
    ? rental.items[0].title
    : rental.product_title;
  if (titleToFind) {
    const byTitle = productsCache.find(p => p.title === titleToFind);
    if (byTitle) return byTitle;
  }

  return null;
}

const statusFilterEl = document.getElementById("rentalStatusFilter");
if (statusFilterEl) {
  statusFilterEl.onchange = (e) => {
    currentFilter = e.target.value;
    renderRentals();
  };
}

// ========== ВЫЧИСЛЕНИЕ СТАТУСА ==========
function getEffectiveStatus(rental) {
  if (rental.rental_status === "returned") return "returned";
  if (rental.rental_date_return) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const returnDate = new Date(rental.rental_date_return);
    if (returnDate < today) return "overdue";
  }
  return rental.rental_status || "active";
}

function statusLabel(status) {
  if (status === "returned") return { text: "Возвращено", color: "#95a5a6" };
  if (status === "overdue") return { text: "Просрочено", color: "#e63946" };
  return { text: "В аренде", color: "#27ae60" };
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

// ========== РЕНДЕР ==========
async function renderRentals() {
  const tbody = document.getElementById("rentalsBody");

  // Загружаем аренды и товары параллельно
  const [rentals, products] = await Promise.all([getRentals(), getProducts()]);
  allRentals = rentals;
  productsCache = products;

  let list = allRentals;
  if (currentFilter !== "all") {
    list = allRentals.filter(r => getEffectiveStatus(r) === currentFilter);
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#8a7a7a">Аренд пока нет</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(r => {
    const status = getEffectiveStatus(r);
    const st = statusLabel(status);
    const itemsText = r.items && r.items.length > 0
      ? r.items.map(i => i.title).join(", ")
      : (r.product_title || "—");

    // Ищем товар, чтобы показать фото и ссылку на карточку
    const product = findProductForRental(r);
    let productCell = `<span style="font-size:13px;">${itemsText}</span>`;

    if (product) {
      const imgSrc = getMainImage(product);
      productCell = `
        <div style="display:flex; align-items:center; gap:10px;">
          <a href="product.html?id=${product.id}" target="_blank" title="Открыть карточку товара">
            <img src="${imgSrc}" alt="${product.title}"
                 style="width:48px; height:48px; object-fit:cover; border-radius:6px; border:1px solid #eee; cursor:pointer;"
                 onerror="this.src='https://via.placeholder.com/48x48/fbe9ea/c98b8f?text=Фото'">
          </a>
          <span style="font-size:13px;">${itemsText}</span>
        </div>
      `;
    }

    return `
      <tr>
        <td>${r.id}</td>
        <td>${productCell}</td>
        <td><strong>${r.customer_name || "—"}</strong><br><small style="color:#8a7a7a">${r.customer_phone || ""}</small></td>
        <td>${formatDate(r.rental_date_out)}</td>
        <td>${formatDate(r.rental_date_return)}</td>
        <td style="color:#27ae60;font-weight:bold">${Number(r.amount).toLocaleString("ru-RU")} ₽</td>
        <td><span class="order-status" style="background:${st.color}">${st.text}</span></td>
        <td>
          ${status !== "returned" ? `<button class="btn-icon" data-return="${r.id}">Отметить возврат</button>` : ""}
          <button class="btn-icon btn-icon--danger" data-del="${r.id}">Удал.</button>
        </td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll("[data-return]").forEach(btn => {
    btn.onclick = async () => {
      if (confirm("Отметить аренду как возвращённую?")) {
        await setRentalStatus(+btn.dataset.return, "returned");
        await renderRentals();
      }
    };
  });

  tbody.querySelectorAll("[data-del]").forEach(btn => {
    btn.onclick = async () => {
      if (confirm("Удалить запись об аренде?")) {
        await deleteSale(+btn.dataset.del);
        await renderRentals();
      }
    };
  });
}

// ========== СТАРТ ==========
renderRentals();