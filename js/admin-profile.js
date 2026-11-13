import { getShopProfile, saveShopProfile } from './store.js';

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

// ========== ЗАПОЛНЕНИЕ ФОРМЫ ==========
async function loadProfile() {
  const profile = await getShopProfile();
  
  document.getElementById("spName").value = profile.name || "";
  document.getElementById("spAddress").value = profile.address || "";
  document.getElementById("spPhone").value = profile.phone || "";
  document.getElementById("spVk").value = profile.vk || "";
  document.getElementById("spTg").value = profile.tg || "";
  document.getElementById("spWa").value = profile.whatsapp || "";
  document.getElementById("spMax").value = profile.max || "";
}

loadProfile();

// ========== СОХРАНЕНИЕ ==========
document.getElementById("shopProfileForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const newProfile = {
    name: document.getElementById("spName").value.trim(),
    address: document.getElementById("spAddress").value.trim(),
    phone: document.getElementById("spPhone").value.trim(),
    vk: document.getElementById("spVk").value.trim(),
    tg: document.getElementById("spTg").value.trim(),
    whatsapp: document.getElementById("spWa").value.trim(),
    max: document.getElementById("spMax").value.trim()
  };

  try {
    await saveShopProfile(newProfile);
    alert("✅ Профиль салона успешно сохранён!");
  } catch (err) {
    alert("Ошибка при сохранении: " + err.message);
  }
});