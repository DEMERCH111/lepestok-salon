import { getStaff, addStaff, deleteStaff, saveStaff } from './store.js';

// ========== ПРОВЕРКА ВХОДА ==========
if (localStorage.getItem("adminLoggedIn") !== "true") {
  window.location.href = "admin-login.html";
}

// ========== ПРОВЕРКА РОЛИ ==========
const currentRole = localStorage.getItem("adminRole") || "admin";
if (currentRole !== "admin") {
  alert("У вас нет прав для доступа к этому разделу.");
  window.location.href = "admin.html";
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

let currentStaffList = [];

// ========== РЕНДЕР ТАБЛИЦЫ ==========
async function renderStaff() {
  const tbody = document.getElementById("staffBody");
  currentStaffList = await getStaff();

  if (currentStaffList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#8a7a7a">Сотрудников пока нет</td></tr>`;
    return;
  }

  tbody.innerHTML = currentStaffList.map(s => `
    <tr>
      <td>${s.id}</td>
      <td><strong>${s.name}</strong></td>
      <td><code>${s.login}</code></td>
      <td><code>${s.password}</code></td>
      <td>${s.role === "admin" ? "👑 Главный" : (s.role === "partner" ? "🤝 Партнёр" : "Менеджер")}</td>
      <td>
        <div style="display:flex; gap:5px;">
          <button class="btn-icon" data-edit-credentials="${s.id}" title="Изменить логин/пароль">Изменить</button>
          ${s.login !== "admin" 
            ? `<button class="btn-icon" data-change-role="${s.id}">Сменить роль</button>` 
            : ""}
          ${s.login !== "admin" 
            ? `<button class="btn-icon btn-icon--danger" data-del="${s.id}">Удал.</button>` 
            : '<span style="color:#8a7a7a;font-size:12px;display:flex;align-items:center;">Системный</span>'}
        </div>
      </td>
    </tr>
  `).join("");

  // Удаление
  tbody.querySelectorAll("[data-del]").forEach(btn => {
    btn.onclick = async () => {
      if (confirm("Удалить доступ для этого сотрудника?")) {
        await deleteStaff(+btn.dataset.del);
        await renderStaff();
      }
    };
  });

  // Смена роли
  tbody.querySelectorAll("[data-change-role]").forEach(btn => {
    btn.onclick = async () => {
      const id = +btn.dataset.changeRole;
      const staff = currentStaffList.find(s => s.id === id);
      if (!staff) return;

      const newRole = prompt(`Смена роли для "${staff.name}".\n\nВведите:\n1 - Сделать Администратором\n2 - Сделать Менеджером\n\nТекущая роль: ${staff.role === "admin" ? "Администратор" : "Менеджер"}`);

      if (newRole === "1") {
        await updateStaffRole(id, "admin");
        await renderStaff();
      } else if (newRole === "2") {
        await updateStaffRole(id, "manager");
        await renderStaff();
      }
    };
  });
}

// ========== ОТКРЫТИЕ ФОРМЫ ДОБАВЛЕНИЯ ==========
const staffModal = document.getElementById("staffModal");
const staffForm = document.getElementById("staffForm");

document.getElementById("addStaffBtn").onclick = () => {
  staffForm.reset();
  staffModal.classList.add("open");
};

document.querySelectorAll('[data-close="staffModal"]').forEach(btn => {
  btn.onclick = () => staffModal.classList.remove("open");
});
staffModal.onclick = (e) => {
  if (e.target.id === "staffModal") staffModal.classList.remove("open");
};

// ========== ОТПРАВКА ФОРМЫ ДОБАВЛЕНИЯ ==========
staffForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    await addStaff({
      name: document.getElementById("stName").value.trim(),
      login: document.getElementById("stLogin").value.trim(),
      password: document.getElementById("stPassword").value.trim(),
      role: document.getElementById("stRole").value
    });
    staffModal.classList.remove("open");
    await renderStaff();
  } catch (err) {
    alert(err.message);
  }
});

// ========== РЕДАКТИРОВАНИЕ ЛОГИНА/ПАРОЛЯ ==========
const credentialsModal = document.getElementById("credentialsModal");
const credentialsForm = document.getElementById("credentialsForm");

// Обработчик кнопки "Изменить"
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-edit-credentials]");
  if (!btn) return;
  
  const id = +btn.dataset.editCredentials;
  const staff = currentStaffList.find(s => s.id === id);
  if (!staff) return;

  document.getElementById("credStaffId").value = staff.id;
  document.getElementById("credStaffName").textContent = staff.name + (staff.role === 'partner' ? ' (Партнёр)' : '');
  document.getElementById("credLogin").value = staff.login;
  document.getElementById("credPassword").value = staff.password;
  
  credentialsModal.classList.add("open");
});

// Закрытие модалки
document.querySelectorAll('[data-close="credentialsModal"]').forEach(btn => {
  btn.onclick = () => credentialsModal.classList.remove("open");
});
credentialsModal.onclick = (e) => {
  if (e.target.id === "credentialsModal") credentialsModal.classList.remove("open");
};

// Сохранение изменений логина/пароля
credentialsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const id = +document.getElementById("credStaffId").value;
  const newLogin = document.getElementById("credLogin").value.trim();
  const newPassword = document.getElementById("credPassword").value.trim();
  
  if (!newLogin || !newPassword) {
    alert("Заполните все поля");
    return;
  }
  
  // Проверяем, не занят ли новый логин кем-то другим
  const allStaff = currentStaffList;
  const loginExists = allStaff.some(s => s.login === newLogin && s.id !== id);
  if (loginExists) {
    alert("Этот логин уже занят другим сотрудником. Придумайте другой.");
    return;
  }
  
  // Обновляем данные
  const updatedList = allStaff.map(s => {
    if (s.id === id) {
      return { ...s, login: newLogin, password: newPassword };
    }
    return s;
  });
  
  try {
    await saveStaff(updatedList);
    credentialsModal.classList.remove("open");
    await renderStaff();
    alert("Данные для входа успешно обновлены!");
  } catch (err) {
    alert("Ошибка: " + err.message);
  }
});

// ========== СКРЫВАЕМ МЕНЮ "СОТРУДНИКИ", ЕСЛИ ЗАШЕЛ НЕ АДМИН ==========
if (currentRole !== "admin") {
  const staffMenuLink = document.getElementById("staffMenuLink");
  if (staffMenuLink) staffMenuLink.style.display = "none";
  const adminOnlyDivider = document.getElementById("adminOnlyDivider");
  if (adminOnlyDivider) adminOnlyDivider.style.display = "none";
}

// ========== СТАРТ ==========
renderStaff();