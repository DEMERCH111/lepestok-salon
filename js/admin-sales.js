import { getSales, addSale, deleteSale, getProducts, getProductById, getClients, getMainImage } from './store.js';

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

const adminUser = localStorage.getItem("adminUser") || "admin";
document.getElementById("adminUserLabel").textContent = adminUser;

// ========== РЕНДЕР ТАБЛИЦЫ ==========
async function renderSales() {
  const tbody = document.getElementById("salesBody");
  if (!tbody) return;
  let list = await getSales();
  list.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#8a7a7a">Продаж пока нет</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(s => {
    const d = new Date(s.date);
    const dateStr = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth()+1).padStart(2, "0")}.${d.getFullYear()}`;
    return `
      <tr>
        <td>${s.id}</td>
        <td>${dateStr}</td>
        <td><strong>${s.product_title}</strong></td>
        <td>${s.customer_name}<br><small style="color:#8a7a7a">${s.customer_phone}</small></td>
        <td style="color:#27ae60;font-weight:bold">${Number(s.amount).toLocaleString("ru-RU")} ₽</td>
        <td>${s.payment_method}</td>
        <td><button class="btn-icon btn-icon--danger" data-del="${s.id}"><img src="images/musorka.png" class="icon-img" alt="Удал."></button></td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll("[data-del]").forEach(btn => {
    btn.onclick = async () => {
      if (confirm("Удалить запись о продаже?")) { 
        await deleteSale(+btn.dataset.del); 
        await renderSales(); 
      }
    };
  });
}

// ========== ОТКРЫТИЕ ФОРМЫ ==========
const saleModal = document.getElementById("saleModal");
const saleForm = document.getElementById("saleForm");
const addSaleBtn = document.getElementById("addSaleBtn");

// Переменная для хранения добавленных в чек товаров
let currentSaleItems = [];

// Кэш товаров для выпадающего списка
let saleProductsCache = [];

// Загружаем товары в выпадающий список (один раз при инициализации)
async function loadSaleProductsSelect() {
  const select = document.getElementById("saleProductSelect");
  if (!select) return;

  saleProductsCache = await getProducts();

  if (saleProductsCache.length === 0) {
    select.innerHTML = `<option value="">-- Нет товаров в каталоге --</option>`;
    return;
  }

  select.innerHTML = `<option value="">-- Ввести вручную --</option>` +
    saleProductsCache.map(p => `<option value="${p.id}">${p.title}</option>`).join("");

  select.onchange = () => {
    const id = Number(select.value);
    if (!id) return;
    const product = saleProductsCache.find(p => p.id === id);
    if (!product) return;
    document.getElementById("saleProductName").value = product.title || "";
    if (product.price && Number(product.price) > 0) {
      document.getElementById("saleProductPrice").value = Number(product.price);
    }
  };
}

// Функция обновления итоговой суммы
function updateTotalAmount() {
  const total = currentSaleItems.reduce((sum, item) => sum + item.price, 0);
  document.getElementById("saleAmount").value = total;
}

// Функция отрисовки списка товаров в чеке
function renderSaleItemsList() {
  const container = document.getElementById("saleItemsList");
  if (currentSaleItems.length === 0) {
    container.innerHTML = `<p style="color: #8a7a7a; font-size: 13px;">Товары не добавлены</p>`;
    return;
  }
  
  container.innerHTML = currentSaleItems.map((item, i) => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: #fff; border-radius: 6px; margin-bottom: 5px; font-size: 14px;">
      <span>${item.title} — <strong>${item.price.toLocaleString("ru-RU")} ₽</strong></span>
      <button type="button" class="btn-icon btn-icon--danger" onclick="removeSaleItem(${i})">×</button>
    </div>
  `).join("");
}

// Глобальная функция для удаления товара из чека
window.removeSaleItem = (index) => {
  currentSaleItems.splice(index, 1);
  renderSaleItemsList();
  updateTotalAmount();
};

// ========== ПЕРЕКЛЮЧЕНИЕ ТИПА ОПЕРАЦИИ ==========
function updateRentalFields() {
  const type = document.getElementById("saleItemType").value;
  const rentalBlock = document.getElementById("rentalFieldsBlock");
  const dateOut = document.getElementById("saleRentalDateOut");
  const dateReturn = document.getElementById("saleRentalDateReturn");
  const customerInput = document.getElementById("saleCustomer");
  const phoneInput = document.getElementById("salePhone");
  const customerReq = document.getElementById("saleCustomerReq");
  const phoneReq = document.getElementById("salePhoneReq");

  if (type === "Аренда") {
    rentalBlock.style.display = "block";
    dateOut.required = true;
    dateReturn.required = true;
    customerInput.required = true;
    phoneInput.required = true;
    customerReq.style.display = "inline";
    phoneReq.style.display = "inline";
  } else {
    rentalBlock.style.display = "none";
    dateOut.required = false;
    dateReturn.required = false;
    customerInput.required = false;
    phoneInput.required = false;
    customerReq.style.display = "none";
    phoneReq.style.display = "none";
    dateOut.value = "";
    dateReturn.value = "";
  }
}

document.getElementById("saleItemType").addEventListener("change", updateRentalFields);

if (addSaleBtn) {
  addSaleBtn.onclick = async () => {
    saleForm.reset();
    currentSaleItems = [];
    renderSaleItemsList();
    updateTotalAmount();
    updateRentalFields();
    
    // Загружаем список товаров для выбора
    await loadSaleProductsSelect();
    
    // Ничего не делаем, так как товар можно ввести вручную
    
    // Заполняем список клиентов
    const clientSelect = document.getElementById("saleClientSelect");
    if (clientSelect) {
      const clients = await getClients();
      clientSelect.innerHTML = `<option value="">-- Без имени --</option>` + 
        clients.map(c => `<option value="${c.id}" data-phone="${c.phone || ''}">${c.name}</option>`).join("");
      
      // При выборе клиента подставляем телефон
      clientSelect.onchange = () => {
        const selectedOption = clientSelect.options[clientSelect.selectedIndex];
        const phone = selectedOption.dataset.phone || "";
        const name = selectedOption.text !== "-- Без имени --" ? selectedOption.text : "";
        if (name) document.getElementById("saleCustomer").value = name;
        if (phone) document.getElementById("salePhone").value = phone;
      };
    }
    
    saleModal.classList.add("open");
  };
}

// Обработчик кнопки «Добавить в чек»
document.getElementById("addItemToCartBtn").onclick = () => {
  const selectEl = document.getElementById("saleProductSelect");
  const nameInput = document.getElementById("saleProductName");
  const priceInput = document.getElementById("saleProductPrice");
  
  const selectedId = selectEl ? Number(selectEl.value) : 0;
  const title = nameInput.value.trim();
  const price = Number(priceInput.value) || 0;
  
  if (!title) {
    alert("Введите название товара");
    return;
  }
  
  if (price <= 0) {
    alert("Укажите цену товара");
    return;
  }
  
  // Если товар выбран из каталога — запоминаем его id
  currentSaleItems.push({ title, price, product_id: selectedId || null });
  renderSaleItemsList();
  updateTotalAmount();
  
  // Сбрасываем поля
  nameInput.value = "";
  priceInput.value = "";
  if (selectEl) selectEl.value = "";
};

if (saleModal) {
  document.querySelectorAll('[data-close="saleModal"]').forEach(btn => { 
    btn.onclick = () => saleModal.classList.remove("open"); 
  });
  saleModal.onclick = (e) => { if (e.target.id === "saleModal") saleModal.classList.remove("open"); };
}

// ========== ОТПРАВКА ФОРМЫ ==========
if (saleForm) {
  saleForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (currentSaleItems.length === 0) {
      alert("Добавьте хотя бы один товар в чек");
      return;
    }
    
    const totalAmount = currentSaleItems.reduce((sum, item) => sum + item.price, 0);
    const productTitles = currentSaleItems.map(item => item.title).join(", ");
    const paymentMethod = document.getElementById("salePayment").value;
    const saleType = document.getElementById("saleItemType").value;

    let customerName = document.getElementById("saleCustomer").value.trim();
    let customerPhone = document.getElementById("salePhone").value.trim();

    let rentalDateOut = null;
    let rentalDateReturn = null;

    if (saleType === "Аренда") {
      rentalDateOut = document.getElementById("saleRentalDateOut").value;
      rentalDateReturn = document.getElementById("saleRentalDateReturn").value;

      if (!customerName || !customerPhone) {
        alert("Для аренды обязательно укажите ФИО и телефон клиента");
        return;
      }
      if (!rentalDateOut || !rentalDateReturn) {
        alert("Для аренды обязательно укажите даты выдачи и возврата");
        return;
      }
      if (new Date(rentalDateReturn) < new Date(rentalDateOut)) {
        alert("Дата возврата не может быть раньше даты выдачи");
        return;
      }
    } else {
      customerName = customerName || "Без имени";
      customerPhone = customerPhone || "—";
    }

    try {
      // Если в чеке ровно один товар с product_id — сохраняем его в product_id продажи
      const singleProductId = currentSaleItems.length === 1 && currentSaleItems[0].product_id
        ? currentSaleItems[0].product_id
        : null;

      await addSale({
        product_id: singleProductId,
        product_title: productTitles,
        amount: totalAmount,
        payment_method: paymentMethod,
        customer_name: customerName,
        customer_phone: customerPhone,
        items: currentSaleItems,
        sale_type: saleType,
        rental_date_out: rentalDateOut,
        rental_date_return: rentalDateReturn,
        rental_status: saleType === "Аренда" ? "active" : null
      });
      
      saleModal.classList.remove("open");
      await renderSales();
    } catch (err) {
      alert("Ошибка: " + err.message);
    }
  });
}

// ========== ЭКСПОРТ В EXCEL (ФОРМАТ XLS) ==========
const exportBtn = document.getElementById("exportSalesBtn");
if (exportBtn) {
  exportBtn.onclick = async () => {
    try {
      const sales = await getSales();
      sales.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      if (sales.length === 0) { alert("Нет данных для выгрузки"); return; }

      let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"></head><body>
      <table border="1">
        <tr>
          <th>ID</th><th>Дата</th><th>Товар</th><th>Клиент</th><th>Телефон</th><th>Сумма (руб)</th><th>Оплата</th>
        </tr>`;

      sales.forEach(s => {
        const d = new Date(s.date);
        const dateStr = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth()+1).padStart(2, "0")}.${d.getFullYear()}`;
        html += `<tr>
          <td>${s.id}</td>
          <td>${dateStr}</td>
          <td>${s.product_title}</td>
          <td>${s.customer_name}</td>
          <td>${s.customer_phone}</td>
          <td>${s.amount}</td>
          <td>${s.payment_method}</td>
        </tr>`;
      });

      html += `</table></body></html>`;

      const blob = new Blob(["\uFEFF" + html], { type: 'application/vnd.ms-excel' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "Продажи_Лепесток.xls";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      alert("Ошибка: " + error.message);
    }
  };
}

// ========== СТАРТ ==========
renderSales();