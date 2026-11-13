import { getPartners } from './store.js';

// ========== ПРОВЕРКА ВХОДА ==========
const role = localStorage.getItem("adminRole");
if (localStorage.getItem("adminLoggedIn") !== "true" || (role !== "admin" && role !== "partner")) {
  window.location.href = "admin-login.html";
}

// Настраиваем меню в зависимости от роли
if (role === "partner") {
  const mainMenu = document.getElementById("mainMenu");
  const partnerMenu = document.getElementById("partnerMenu");
  if (mainMenu) mainMenu.style.display = "none";
  if (partnerMenu) partnerMenu.style.display = "block";
  document.getElementById("adminUserLabel").textContent = "Партнёр";
  
  const sidebar = document.getElementById("adminSidebar");
  if (sidebar) sidebar.style.background = "#4a5c6a"; 
  
  const logo = document.getElementById("sidebarLogo");
  if (logo) logo.textContent = "Кабинет партнёра";
  
} else {
  document.getElementById("adminUserLabel").textContent = localStorage.getItem("adminUser") || "admin";
}

document.getElementById("logoutBtn").onclick = () => {
  if (confirm("Выйти?")) { localStorage.clear(); window.location.href = "admin-login.html"; }
};

// ========== СБОР ВСЕХ ПРОМОКОДОВ ==========
async function getAllPromocodes() {
  const partners = await getPartners();
  
  // Базовый код самого салона
  const codes = [
    { promo: "ЛЕПЕСТОК", name: "Салон «Лепесток»", category: "Салон", bonus: "Скидка 5000 ₽ на платье" }
  ];

  // Добавляем коды партнёров
  partners.forEach(p => {
    if (p.promo) {
      codes.push({
        promo: p.promo,
        name: p.name,
        category: p.category,
        bonus: p.bonus || "Скидка",
        isPartner: true
      });
    }
  });

  return codes;
}

// ========== РЕНДЕР ТАБЛИЦЫ ==========
async function renderPromocodes(searchQuery = "") {
  const tbody = document.getElementById("promocodesBody");
  const allCodes = await getAllPromocodes();
  
  let filtered = allCodes;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = allCodes.filter(c => 
      c.promo.toLowerCase().includes(q) || 
      c.name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:40px;color:#e63946;">Такого промокода нет! Возможно, клиент его выдумал.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(c => `
    <tr>
      <td><strong style="color:var(--dark-pink); font-size:16px;">${c.promo}</strong></td>
      <td>
        ${c.name} 
        ${c.isPartner ? '<span style="font-size:11px; background:#e8b4b8; color:#fff; padding:2px 6px; border-radius:10px; margin-left:5px;">Сеть</span>' : ''}
      </td>
      <td>${c.category}</td>
      <td>${c.bonus}</td>
    </tr>
  `).join("");
}

// ========== ПОИСК ==========
document.getElementById("searchPromo").addEventListener("input", (e) => {
  renderPromocodes(e.target.value.trim());
});

// ========== СТАРТ ==========
renderPromocodes();