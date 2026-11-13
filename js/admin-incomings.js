// ========== ПРОВЕРКА ВХОДА ==========
import { getIncomings, addIncoming, deleteIncoming } from './store.js';

if (localStorage.getItem("adminLoggedIn") !== "true") {
  window.location.href = "admin-login.html";
}

// ========== КНОПКА ВЫХОДА ==========
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

// ========== РЕНДЕР ТАБЛИЦЫ ПОСТУПЛЕНИЙ ==========
async function renderIncomings() {
  const tbody = document.getElementById("incomingsBody");
  let list = await getIncomings();
  
  // Сортируем: новые сверху
  list.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#8a7a7a">Поступлений пока нет</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(item => {
    const d = new Date(item.date);
    const dateStr = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth()+1).padStart(2, "0")}.${d.getFullYear()}`;
    
    return `
      <tr>
        <td>${item.id}</td>
        <td>${dateStr}</td>
        <td><strong>${item.product_title}</strong></td>
        <td>${item.size}</td>
        <td>+${item.quantity}</td>
        <td>${item.note || '—'}</td>
        <td>
          <button class="btn-icon btn-icon--danger" data-del="${item.id}" title="Удалить"><img src="images/musorka.png" class="icon-img" alt="Удал."></button>
        </td>
      </tr>
    `;
  }).join("");

  // Обработчик удаления
  tbody.querySelectorAll("[data-del]").forEach(btn => {
    btn.onclick = async () => {
      if (confirm("Удалить запись о поступлении?")) {
        await deleteIncoming(+btn.dataset.del);
        await renderIncomings();
      }
    };
  });
}

// ========== ОТКРЫТИЕ/ЗАКРЫТИЕ МОДАЛКИ ==========
const incomingModal = document.getElementById("incomingModal");

document.getElementById("addIncomingBtn").onclick = () => {
  document.getElementById("incomingForm").reset();
  incomingModal.classList.add("open");
};

document.querySelectorAll('[data-close="incomingModal"]').forEach(btn => {
  btn.onclick = () => incomingModal.classList.remove("open");
});

incomingModal.onclick = (e) => {
  if (e.target.id === "incomingModal") incomingModal.classList.remove("open");
};

// ========== ОТПРАВКА ФОРМЫ ==========
document.getElementById("incomingForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const productTitle = document.getElementById("incProduct").value.trim();
  const size = document.getElementById("incSize").value.trim();
  const quantity = document.getElementById("incQuantity").value;
  const note = document.getElementById("incNote").value.trim();

  if (!productTitle || !size || !quantity) {
    alert("Заполните обязательные поля: Товар, Размер, Количество");
    return;
  }

  try {
    await addIncoming({ 
      product_title: productTitle, 
      size: size, 
      quantity: Number(quantity), 
      note: note 
    });
    incomingModal.classList.remove("open");
    await renderIncomings();
  } catch (err) {
    alert("Ошибка при сохранении: " + err.message);
  }
});

// ========== СТАРТ ==========
renderIncomings();