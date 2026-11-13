import { getSales, updateSale, deleteSale, getProducts, getExpenses, addExpense, updateExpense, deleteExpense } from './store.js';

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

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let allSales = [];
let allExpenses = [];
let filteredSales = [];
let filteredExpenses = [];

// ========== ФИЛЬТР ПО ДАТЕ ==========
const periodFilter = document.getElementById("periodFilter");
const customDateBlock = document.getElementById("customDateBlock");
const dateFromInput = document.getElementById("dateFrom");
const dateToInput = document.getElementById("dateTo");

periodFilter.onchange = () => {
  if (periodFilter.value === "custom") {
    customDateBlock.style.display = "flex";
  } else {
    customDateBlock.style.display = "none";
    calculateStats();
  }
};

dateFromInput.onchange = () => calculateStats();
dateToInput.onchange = () => calculateStats();

function filterByDate() {
  const period = periodFilter.value;
  const now = new Date();
  let from = new Date(0);
  let to = new Date();

  if (period === "today") {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "custom") {
    if (dateFromInput.value) from = new Date(dateFromInput.value);
    if (dateToInput.value) {
      to = new Date(dateToInput.value);
      to.setHours(23, 59, 59);
    }
  }

  filteredSales = allSales.filter(s => {
    const d = new Date(s.date);
    return d >= from && d <= to;
  });

  filteredExpenses = allExpenses.filter(e => {
    const d = new Date(e.date);
    return d >= from && d <= to;
  });
}

// ========== СЧИТАЕМ ЦИФРЫ ==========
async function calculateStats() {
  if (allSales.length === 0 && allExpenses.length === 0) {
    allSales = await getSales();
    allExpenses = await getExpenses();
  }

  filterByDate();

  const totalRevenue = filteredSales.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  document.getElementById("statTotalRevenue").textContent = totalRevenue.toLocaleString("ru-RU") + " ₽";
  
  document.getElementById("statTotalSales").textContent = filteredSales.length;
  
  const averageCheck = filteredSales.length > 0 ? Math.round(totalRevenue / filteredSales.length) : 0;
  document.getElementById("statAverageCheck").textContent = averageCheck.toLocaleString("ru-RU") + " ₽";

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  document.getElementById("statTotalExpenses").textContent = totalExpenses.toLocaleString("ru-RU") + " ₽";

  const productStats = {};
  filteredSales.forEach(s => {
    if (!s.product_title) return;
    const title = s.product_title;
    if (!productStats[title]) productStats[title] = { count: 0, revenue: 0 };
    productStats[title].count += 1;
    productStats[title].revenue += Number(s.amount || 0);
  });

  const sortedProducts = Object.keys(productStats).map(title => ({
    title, count: productStats[title].count, revenue: productStats[title].revenue
  })).sort((a, b) => b.count - a.count);

  const tbody = document.getElementById("topProductsBody");
  if (sortedProducts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:40px;color:#8a7a7a">Данных пока нет.</td></tr>`;
  } else {
    tbody.innerHTML = sortedProducts.map((p, index) => `
      <tr>
        <td><strong>${index + 1}</strong></td>
        <td>${p.title}</td>
        <td>${p.count} шт.</td>
        <td style="color:#27ae60;font-weight:bold">${p.revenue.toLocaleString("ru-RU")} ₽</td>
      </tr>
    `).join("");
  }

  renderOperationsList();
}

// ========== ОБЪЕДИНЕННЫЙ СПИСОК ОПЕРАЦИЙ ==========
function renderOperationsList() {
  const tbody = document.getElementById("salesListBody");
  
  // Объединяем продажи и расходы
  const operations = [
    ...filteredSales.map(s => ({ ...s, type: 'sale', sortDate: new Date(s.date) })),
    ...filteredExpenses.map(e => ({ ...e, type: 'expense', sortDate: new Date(e.date) }))
  ];

  // Сортируем по дате (новые сверху)
  operations.sort((a, b) => b.sortDate - a.sortDate);

  if (operations.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#8a7a7a">Операций пока нет</td></tr>`;
    return;
  }

  tbody.innerHTML = operations.map(op => {
    const d = new Date(op.date);
    const dateStr = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth()+1).padStart(2, "0")}.${d.getFullYear()}`;
    
    if (op.type === 'sale') {
      const itemsText = op.items && op.items.length > 0 
        ? op.items.map(i => i.title).join(", ") 
        : (op.product_title || "—");
      
      const typeLabel = op.sale_type ? ` <span style="color:#000; font-weight:normal; font-size:12px;">(${op.sale_type})</span>` : "";

      return `
        <tr>
          <td>${op.id}</td>
          <td>${dateStr}</td>
          <td style="font-size:13px;">${itemsText}</td>
          <td style="color:#27ae60;font-weight:bold">${Number(op.amount).toLocaleString("ru-RU")} ₽${typeLabel}</td>
          <td>${op.customer_name || "—"}</td>
          <td>
            <button class="btn-icon" data-edit-sale="${op.id}">Редактировать</button>
            <button class="btn-icon btn-icon--danger" data-del-sale="${op.id}">Удал.</button>
          </td>
        </tr>
      `;
    } else {
      // Для расхода
      return `
        <tr style="background: #fff5f5;">
          <td>${op.id}</td>
          <td>${dateStr}</td>
          <td style="font-size:13px;"><strong style="color:#e63946;">Расход:</strong> ${op.title}</td>
          <td style="color:#e63946;font-weight:bold">- ${Number(op.amount).toLocaleString("ru-RU")} ₽</td>
          <td>—</td>
          <td>
            <button class="btn-icon" data-edit-expense="${op.id}">Редактировать</button>
            <button class="btn-icon btn-icon--danger" data-del-expense="${op.id}">Удал.</button>
          </td>
        </tr>
      `;
    }
  }).join("");

  // Обработчики для продаж
  tbody.querySelectorAll("[data-edit-sale]").forEach(btn => {
    btn.onclick = () => openEditSaleModal(+btn.dataset.editSale);
  });
  tbody.querySelectorAll("[data-del-sale]").forEach(btn => {
    btn.onclick = async () => {
      if (confirm("Удалить запись о продаже?")) {
        await deleteSale(+btn.dataset.delSale);
        allSales = await getSales(); // Обновляем кэш
        await calculateStats();
      }
    };
  });

  // Обработчики для расходов
  tbody.querySelectorAll("[data-edit-expense]").forEach(btn => {
    btn.onclick = () => openEditExpenseModal(+btn.dataset.editExpense);
  });
  tbody.querySelectorAll("[data-del-expense]").forEach(btn => {
    btn.onclick = async () => {
      if (confirm("Удалить запись о расходе?")) {
        await deleteExpense(+btn.dataset.delExpense);
        allExpenses = await getExpenses(); // Обновляем кэш
        await calculateStats();
      }
    };
  });
}

// ========== МОДАЛКА РЕДАКТИРОВАНИЯ ПРОДАЖИ ==========
const editSaleModal = document.getElementById("editSaleModal");
const editSaleForm = document.getElementById("editSaleForm");
let editSaleItems = [];

async function openEditSaleModal(id) {
  const sale = filteredSales.find(s => s.id === id);
  if (!sale) return;

  document.getElementById("editSaleId").value = sale.id;
  document.getElementById("editSalePayment").value = sale.payment_method || "Карта";
  
  editSaleItems = sale.items && sale.items.length > 0 
    ? JSON.parse(JSON.stringify(sale.items)) 
    : (sale.product_title ? [{ title: sale.product_title, price: Number(sale.amount) }] : []);
  
  renderEditSaleItems();
  updateEditSaleTotal();
  
  editSaleModal.classList.add("open");
}

function renderEditSaleItems() {
  const container = document.getElementById("editSaleItemsList");
  if (editSaleItems.length === 0) {
    container.innerHTML = `<p style="color: #8a7a7a;">Товары не добавлены</p>`;
    return;
  }
  container.innerHTML = editSaleItems.map((item, i) => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: #faf5f4; border-radius: 6px; margin-bottom: 5px;">
      <span>${item.title} — <strong>${Number(item.price).toLocaleString("ru-RU")} ₽</strong></span>
      <button type="button" class="btn-icon btn-icon--danger" onclick="removeEditSaleItem(${i})">×</button>
    </div>
  `).join("");
}

window.removeEditSaleItem = (index) => {
  editSaleItems.splice(index, 1);
  renderEditSaleItems();
  updateEditSaleTotal();
};

function updateEditSaleTotal() {
  const total = editSaleItems.reduce((sum, item) => sum + Number(item.price), 0);
  document.getElementById("editSaleAmount").value = total;
}

document.getElementById("addItemToEditSaleBtn").onclick = () => {
  const title = prompt("Введите название товара:");
  if (!title) return;
  const priceStr = prompt("Введите цену товара, ₽:");
  const price = Number(priceStr);
  if (!priceStr || isNaN(price)) { alert("Некорректная цена"); return; }
  editSaleItems.push({ title, price });
  renderEditSaleItems();
  updateEditSaleTotal();
};

document.querySelectorAll('[data-close="editSaleModal"]').forEach(btn => {
  btn.onclick = () => editSaleModal.classList.remove("open");
});
editSaleModal.onclick = (e) => { if (e.target.id === "editSaleModal") editSaleModal.classList.remove("open"); };

editSaleForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = +document.getElementById("editSaleId").value;
  const totalAmount = editSaleItems.reduce((sum, item) => sum + Number(item.price), 0);
  const productTitles = editSaleItems.map(item => item.title).join(", ");

  try {
    await updateSale(id, {
      items: editSaleItems,
      amount: totalAmount,
      product_title: productTitles,
      payment_method: document.getElementById("editSalePayment").value
    });
    editSaleModal.classList.remove("open");
    allSales = await getSales(); // Обновляем кэш
    await calculateStats();
  } catch (err) {
    alert("Ошибка: " + err.message);
  }
});

// ========== МОДАЛКА РАСХОДОВ ==========
const expenseModal = document.getElementById("expenseModal");
const expenseForm = document.getElementById("expenseForm");

document.getElementById("addExpenseBtn").onclick = () => {
  expenseForm.reset();
  document.getElementById("expId").value = ""; // Сбрасываем ID
  document.querySelector("#expenseModal h3").textContent = "Добавить расход";
  expenseModal.classList.add("open");
};

function openEditExpenseModal(id) {
  const expense = filteredExpenses.find(e => e.id === id);
  if (!expense) return;
  
  expenseForm.reset();
  document.getElementById("expId").value = expense.id;
  document.getElementById("expTitle").value = expense.title;
  document.getElementById("expAmount").value = expense.amount;
  document.getElementById("expNote").value = expense.note || "";
  document.querySelector("#expenseModal h3").textContent = "Редактировать расход";
  
  expenseModal.classList.add("open");
}

document.querySelectorAll('[data-close="expenseModal"]').forEach(btn => {
  btn.onclick = () => expenseModal.classList.remove("open");
});
expenseModal.onclick = (e) => { if (e.target.id === "expenseModal") expenseModal.classList.remove("open"); };

expenseForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("expId").value;
  const expenseData = {
    title: document.getElementById("expTitle").value.trim(),
    amount: Number(document.getElementById("expAmount").value),
    note: document.getElementById("expNote").value.trim()
  };

  try {
    if (id) {
      await updateExpense(+id, expenseData);
    } else {
      await addExpense(expenseData);
    }
    expenseModal.classList.remove("open");
    allExpenses = await getExpenses(); // Обновляем кэш
    await calculateStats();
  } catch (err) {
    alert("Ошибка: " + err.message);
  }
});

// ========== ЭКСПОРТ В EXCEL ==========
document.getElementById("exportAnalyticsBtn").onclick = async () => {
  if (filteredSales.length === 0 && filteredExpenses.length === 0) {
    alert("Нет данных за выбранный период");
    return;
  }

  let totalRevenue = 0;
  filteredSales.forEach(s => totalRevenue += Number(s.amount || 0));
  const averageCheck = filteredSales.length > 0 ? Math.round(totalRevenue / filteredSales.length) : 0;
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const profit = totalRevenue - totalExpenses;

  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8"></head><body>
  <h2>Финансовый отчёт</h2>
  <table border="1">
    <tr><td><b>Выручка</b></td><td>${totalRevenue} руб.</td></tr>
    <tr><td><b>Количество продаж</b></td><td>${filteredSales.length}</td></tr>
    <tr><td><b>Средний чек</b></td><td>${averageCheck} руб.</td></tr>
    <tr><td><b>Расходы</b></td><td>${totalExpenses} руб.</td></tr>
    <tr><td><b>Чистая прибыль</b></td><td><b>${profit} руб.</b></td></tr>
  </table>

  <br><h3>Список продаж</h3>
  <table border="1">
    <tr><th>Дата</th><th>Товары</th><th>Тип</th><th>Сумма</th><th>Клиент</th></tr>`;

  filteredSales.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(s => {
    const d = new Date(s.date);
    const dateStr = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth()+1).padStart(2, "0")}.${d.getFullYear()}`;
    const itemsText = s.items && s.items.length > 0 ? s.items.map(i => i.title).join(", ") : s.product_title;
    const typeLabel = s.sale_type || "Продажа"; // Если тип не указан, считаем продажей
    html += `<tr><td>${dateStr}</td><td>${itemsText}</td><td>${typeLabel}</td><td>${s.amount}</td><td>${s.customer_name || "—"}</td></tr>`;
  });

  html += `</table><br><h3>Список расходов</h3><table border="1">
    <tr><th>Дата</th><th>Назначение</th><th>Сумма</th><th>Примечание</th></tr>`;

  filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(e => {
    const d = new Date(e.date);
    const dateStr = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth()+1).padStart(2, "0")}.${d.getFullYear()}`;
    html += `<tr><td>${dateStr}</td><td>${e.title}</td><td>${e.amount}</td><td>${e.note || "—"}</td></tr>`;
  });

  html += `</table></body></html>`;

  const blob = new Blob(["\uFEFF" + html], { type: 'application/vnd.ms-excel' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Финансовый_отчет_Лепесток.xls";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ========== СТАРТ ==========
calculateStats();