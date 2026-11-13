import { getStaff } from './store.js';

// ========== ЕСЛИ УЖЕ ВОШЁЛ — СРАЗУ В АДМИНКУ ==========
if (localStorage.getItem("adminLoggedIn") === "true") {
  window.location.href = "admin.html";
}

// ========== ОБРАБОТКА ФОРМЫ ВХОДА ==========
document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const user = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value;
  const errorEl = document.getElementById("loginError");

  try {
    // Ждём загрузки сотрудников из базы
    const staffList = await getStaff();
    
    // Ищем сотрудника
    const account = staffList.find(s => s.login === user && s.password === pass);

    if (account) {
      // Успешный вход
      localStorage.setItem("adminLoggedIn", "true");
      localStorage.setItem("adminUser", account.name);
      localStorage.setItem("adminRole", account.role);
      
      // Если это партнёр — отправляем в его кабинет
      if (account.role === "partner") {
        localStorage.setItem("partnerId", account.partner_id);
        window.location.href = "partner-cabinet.html";
      } else {
        window.location.href = "admin.html";
      }
    } else {
      // Ошибка
      errorEl.textContent = "Неверный логин или пароль";
      document.getElementById("loginPass").value = "";
    }
  } catch (err) {
    console.error(err);
    errorEl.textContent = "Ошибка подключения к базе данных";
  }
});