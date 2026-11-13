// ========== ПРОВЕРКА ВХОДА ==========
import { getClients, addClient, deleteClient } from './store.js';
if (localStorage.getItem("adminLoggedIn") !== "true") {
  window.location.href = "admin-login.html";
}

document.getElementById("logoutBtn").onclick = () => {
  if (confirm("Выйти из админ-панели?")) {
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("adminUser");
    window.location.href = "admin-login.html";
  }
};

const adminUser = localStorage.getItem("adminUser") || "admin";
document.getElementById("adminUserLabel").textContent = adminUser;

// ========== РЕНДЕР ТАБЛИЦЫ КЛИЕНТОВ ==========
async function renderClients() {
  const tbody = document.getElementById("clientsBody");
  let list = await getClients();
  list.sort((a, b) => b.id - a.id); // новые сверху

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#8a7a7a">Клиентов пока нет</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(c => {
    // Безопасное форматирование даты
    let dateStr = "—";
    if (c.date) {
      const d = new Date(c.date);
      if (!isNaN(d.getTime())) { // Проверяем, что дата валидная
        dateStr = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth()+1).padStart(2, "0")}.${d.getFullYear()}`;
      }
    }
    
    return `
      <tr>
        <td>${c.id}</td>
        <td><strong>${c.name}</strong></td>
        <td><a href="tel:${c.phone}" style="color:#c98b8f">${c.phone}</a></td>
        <td>${dateStr}</td>
        <td>
             <button class="btn-icon btn-icon--danger" data-del="${c.id}" title="Удалить"><img src="images/musorka.png" class="icon-img" alt="Удал."></button>
        </td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll("[data-del]").forEach(btn => {
    btn.onclick = async () => {
      if (confirm("Удалить клиента из базы?")) {
        await deleteClient(+btn.dataset.del);
        await renderClients();
      }
    };
  });
}

// ========== ОТКРЫТИЕ/ЗАКРЫТИЕ МОДАЛКИ ==========
const clientModal = document.getElementById("clientModal");

document.getElementById("addClientBtn").onclick = () => {
  document.getElementById("clientForm").reset();
  clientModal.classList.add("open");
};

document.querySelectorAll('[data-close="clientModal"]').forEach(btn => {
  btn.onclick = () => clientModal.classList.remove("open");
});
clientModal.onclick = (e) => {
  if (e.target.id === "clientModal") clientModal.classList.remove("open");
};

// ========== ОТПРАВКА ФОРМЫ ==========
document.getElementById("clientForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("clName").value.trim();
  const phone = document.getElementById("clPhone").value.trim();

  try {
    await addClient({ 
      name: name, 
      phone: phone,
      date: new Date().toISOString() // Автоматически записываем текущую дату и время
    });
    clientModal.classList.remove("open");
    await renderClients();
  } catch (err) {
    alert("Ошибка: " + err.message);
  }
});

renderClients();