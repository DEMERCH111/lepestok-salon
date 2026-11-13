import { getPartners } from './store.js';

async function initShop() {
  const params = new URLSearchParams(window.location.search);
  const partnerId = Number(params.get("id"));
  
  const partners = await getPartners();
  const partner = partners.find(p => p.id === partnerId);

  if (!partner) {
    document.getElementById("shopHeader").innerHTML = `<h2>Магазин не найден</h2>`;
    return;
  }
  
  document.title = partner.name + " — Лепесток";
  
  // Шапка магазина
  document.getElementById("shopHeader").innerHTML = `
    <div style="background: #fff; padding: 30px; border-radius: 14px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); display: flex; gap: 25px; align-items: center; flex-wrap: wrap;">
      
      ${partner.logo ? `<img src="${partner.logo}" style="width: 100px; height: 100px; object-fit: contain; border-radius: 12px; border: 1px solid #eee;">` : ""}
      
      <div style="flex: 1; min-width: 250px;">
        <h1 style="font-family: Georgia, serif; font-size: 32px; margin-bottom: 10px;">${partner.name}</h1>
        ${partner.description ? `<p style="color: #8a7a7a; margin-bottom: 15px;">${partner.description}</p>` : ""}
        
        <div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 15px;">
          ${partner.address ? `<div>📍 <strong>Адрес:</strong> ${partner.address}</div>` : ""}
          ${partner.phone ? `<div>📞 <strong>Телефон:</strong> <a href="tel:${partner.phone}" style="color: var(--dark-pink); text-decoration: none;">${partner.phone}</a></div>` : ""}
        </div>
      </div>
    </div>
  `;

  // Товары
  const grid = document.getElementById("shopGrid");
  const services = partner.services || [];
  
  if (services.length === 0) {
    grid.innerHTML = `<p class="empty-msg">В этом магазине пока нет товаров</p>`;
  } else {
    // Получаем избранное
    let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
    favorites = favorites.map(f => typeof f === 'number' ? { id: f, partnerId: null } : f);

    grid.innerHTML = services.map((s, index) => {
      const isFav = favorites.some(f => f.id === partner.id && f.partnerId === partner.id && f.serviceIndex === index);
      
      return `
      <div class="product-card partner-service-card" onclick="showShopProductDetails(${partner.id}, ${index})" style="cursor: pointer;">
        <button class="product-card__fav ${isFav ? "active" : ""}" onclick="event.stopPropagation(); toggleShopFavorite(${partner.id}, ${partner.id}, ${index});" title="В избранное"><img src="images/izbrannoe.png" class="icon-img" alt="♥"></button>
        <img src="${s.image || ''}" class="product-card__img" onerror="this.src='https://via.placeholder.com/300x400/fbe9ea/c98b8f?text=Фото'">
        <div class="product-card__body">
          <div class="product-card__type">${partner.name}</div>
          <h3 class="product-card__title">${s.title}</h3>
          <div class="product-card__price">${s.price || 'Цена по запросу'}</div>
          <button class="product-card__btn" onclick="event.stopPropagation(); openPartnerBooking('${s.title.replace(/'/g, "\\'")}', '${partner.name.replace(/'/g, "\\'")}')">Записаться</button>
        </div>
      </div>
      `;
    }).join("");
  }
}

// ========== ЗАПИСЬ ==========
window.openPartnerBooking = function(serviceTitle, partnerName) {
  const productTitle = `${serviceTitle} (Партнёр: ${partnerName})`;
  if (typeof window.openAppointmentModal === "function") {
    window.openAppointmentModal(null, productTitle, partnerName);
  } else {
    alert("Ошибка: форма записи не найдена. Убедитесь, что на странице shop.html подключен js/appointment.js");
  }
};

// ========== МОДАЛКА ТОВАРА В МАГАЗИНЕ ==========
window.showShopProductDetails = async function(partnerId, serviceIndex) {
  const partners = await getPartners();
  const partner = partners.find(x => x.id === partnerId);
  if (!partner || !partner.services || !partner.services[serviceIndex]) return;
  
  const s = partner.services[serviceIndex];

  document.getElementById("ppImage").src = s.image || 'https://via.placeholder.com/300x400?text=Фото';
  document.getElementById("ppTitle").textContent = s.title;
  document.getElementById("ppPrice").textContent = s.price || 'Цена по запросу';
  document.getElementById("ppPartnerName").textContent = partner.name;
  document.getElementById("ppAddress").textContent = partner.address ? `📍 ${partner.address}` : '';

  document.getElementById("ppBookBtn").onclick = () => {
    document.getElementById("partnerProductModal").classList.remove("open");
    window.openPartnerBooking(s.title, partner.name);
  };
  
  document.getElementById("ppShopBtn").href = `shop.html?id=${partner.id}`;
  
  const callBtn = document.getElementById("ppCallBtn");
  if (partner.phone) {
    callBtn.href = `tel:${partner.phone}`;
    callBtn.style.display = "block";
  } else {
    callBtn.style.display = "none";
  }

  document.getElementById("partnerProductModal").classList.add("open");
};

// ========== ИЗБРАННОЕ ДЛЯ МАГАЗИНА ==========
window.toggleShopFavorite = function(id, partnerId, serviceIndex) {
  let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
  favorites = favorites.map(f => typeof f === 'number' ? { id: f, partnerId: null } : f);
  
  const existingIndex = favorites.findIndex(f => f.id === id && f.partnerId === partnerId && f.serviceIndex === serviceIndex);
  
  if (existingIndex !== -1) {
    favorites.splice(existingIndex, 1);
  } else {
    favorites.push({ id, partnerId, serviceIndex });
  }
  
  localStorage.setItem("favorites", JSON.stringify(favorites));
  
  if (typeof window.updateBadges === "function") window.updateBadges();
  
  // Перерисовываем карточки
  initShop();
};

// Закрытие модалки товара
document.querySelectorAll('[data-close="partnerProductModal"]').forEach(btn => {
  btn.onclick = () => document.getElementById("partnerProductModal").classList.remove("open");
});
document.getElementById("partnerProductModal").onclick = (e) => {
  if (e.target.id === "partnerProductModal") document.getElementById("partnerProductModal").classList.remove("open");
};

// Запуск
initShop();