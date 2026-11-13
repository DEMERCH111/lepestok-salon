import { getPartners, addPartner, savePartners, deletePartner, addStaff, getStaff } from './store.js';

// ========== ПРОВЕРКА ВХОДА ==========
if (localStorage.getItem("adminLoggedIn") !== "true") {
  window.location.href = "admin-login.html";
}

document.getElementById("logoutBtn").onclick = () => {
  if (confirm("Выйти?")) { 
    localStorage.removeItem("adminLoggedIn"); 
    localStorage.removeItem("adminUser"); 
    localStorage.removeItem("adminRole"); 
    localStorage.removeItem("partnerId"); 
    window.location.href = "admin-login.html"; 
  }
};

document.getElementById("adminUserLabel").textContent = localStorage.getItem("adminUser") || "admin";

let currentPartners = [];

// ========== РЕНДЕР ТАБЛИЦЫ ==========
async function renderPartners() {
  const tbody = document.getElementById("partnersBody");
  currentPartners = await getPartners();

  if (currentPartners.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#8a7a7a">Партнёров пока нет</td></tr>`;
    return;
  }

  tbody.innerHTML = currentPartners.map(p => `
    <tr>
      <td>${p.id}</td>
      <td>${p.category}</td>
      <td><strong>${p.name}</strong></td>
      <td><span class="badge" style="background:#c98b8f; font-size:13px;">${p.promo || '—'}</span></td>
      <td>${p.bonus || '—'}</td>
      <td>
        <button class="btn-icon" data-qr="${p.id}" title="QR-код">QR</button>
        <button class="btn-icon" data-edit="${p.id}"><img src="images/karandash.png" class="icon-img" alt="Ред."></button>
        <button class="btn-icon btn-icon--danger" data-del="${p.id}"><img src="images/musorka.png" class="icon-img" alt="Удал."></button>
      </td>
    </tr>
  `).join("");

  // Обработчики кнопок
  tbody.querySelectorAll("[data-edit]").forEach(btn => {
    btn.onclick = () => openPartnerForm(+btn.dataset.edit);
  });
  
  tbody.querySelectorAll("[data-del]").forEach(btn => {
    btn.onclick = async () => {
      if (confirm("Удалить партнёра?")) { 
        await deletePartner(+btn.dataset.del); 
        await renderPartners(); 
      }
    };
  });
  
  tbody.querySelectorAll("[data-qr]").forEach(btn => {
    btn.onclick = () => {
      const p = currentPartners.find(x => x.id === Number(btn.dataset.qr));
      if (!p) return;
      const link = window.location.origin + "/promo.html?promo=" + p.promo;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;
      
      const win = window.open("", "_blank");
      win.document.write(`
        <html><head><title>QR-код для ${p.name}</title>
        <style>body{text-align:center;font-family:sans-serif;padding:50px;}</style>
        </head><body>
        <h2>${p.name}</h2>
        <p>Промокод: <strong>${p.promo}</strong> (${p.bonus})</p>
        <img src="${qrUrl}" style="border:1px solid #ccc; padding:10px; border-radius:10px; margin:20px 0;">
        <p>Отсканируйте, чтобы получить бонус в салоне «Лепесток»</p>
        <button onclick="window.print()" style="padding:10px 20px; font-size:16px; cursor:pointer;">Распечатать</button>
        </body></html>
      `);
    };
  });
}

// ========== ОТКРЫТИЕ ФОРМЫ ==========
const partnerModal = document.getElementById("partnerModal");
const partnerForm = document.getElementById("partnerForm");

function openPartnerForm(id = null) {
  partnerForm.reset();
  document.getElementById("ptId").value = "";

  const loginRow = document.getElementById("loginPasswordRow");
  
  if (id) {
    const p = currentPartners.find(x => x.id === id);
    if (!p) return;
    document.getElementById("partnerModalTitle").textContent = "Редактировать партнёра";
    document.getElementById("ptId").value = p.id;
    document.getElementById("ptCategory").value = p.category;
    document.getElementById("ptName").value = p.name;
    document.getElementById("ptPromo").value = p.promo || "";
    document.getElementById("ptBonus").value = p.bonus || "";
    
    if (loginRow) loginRow.style.display = "none";
    document.getElementById("ptLogin").required = false;
    document.getElementById("ptPassword").required = false;
  } else {
    document.getElementById("partnerModalTitle").textContent = "Новый партнёр";
    if (loginRow) loginRow.style.display = "flex";
    document.getElementById("ptLogin").required = true;
    document.getElementById("ptPassword").required = true;
  }
  partnerModal.classList.add("open");
}

const addPartnerBtn = document.getElementById("addPartnerBtn");
if (addPartnerBtn) {
  addPartnerBtn.onclick = () => openPartnerForm();
}

document.querySelectorAll('[data-close="partnerModal"]').forEach(btn => {
  btn.onclick = () => partnerModal.classList.remove("open");
});
partnerModal.onclick = (e) => { if (e.target.id === "partnerModal") partnerModal.classList.remove("open"); };

// ========== СОХРАНЕНИЕ ПАРТНЁРА ==========
partnerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("ptId").value;
  
  const data = {
    category: document.getElementById("ptCategory").value,
    name: document.getElementById("ptName").value.trim(),
    promo: document.getElementById("ptPromo").value ? document.getElementById("ptPromo").value.trim().toUpperCase() : "",
    bonus: document.getElementById("ptBonus").value ? document.getElementById("ptBonus").value.trim() : ""
  };

  try {
    if (id) {
      const updatedList = currentPartners.map(p => p.id === +id ? { ...p, ...data } : p);
      await savePartners(updatedList);
    } else {
      const newPartner = await addPartner(data);
      
      const login = document.getElementById("ptLogin").value.trim();
      const password = document.getElementById("ptPassword").value.trim();
      
      if (login && password) {
        await addStaff({
          name: data.name,
          login: login,
          password: password,
          role: "partner",
          partner_id: newPartner.id
        });
        alert(`✅ Партнёр успешно создан!\n\nЛогин для входа: ${login}\nПароль: ${password}\n\nОбязательно передайте их партнёру.`);
      }
    }
    partnerModal.classList.remove("open");
    await renderPartners();
  } catch (err) {
    alert("Ошибка: " + err.message);
  }
});

// ========== СТАРТ ==========
renderPartners();