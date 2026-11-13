import { getPartners } from './store.js';

let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
// Миграция старого формата (если остались числа)
favorites = favorites.map(f => typeof f === 'number' ? { id: f, partnerId: null } : f);

let allServices = [];
let currentFilter = "all";

// ========== ЗАГРУЗКА И РЕНДЕР ==========
async function loadPartnersData() {
  const partners = await getPartners();
  
  // Собираем все услуги от всех партнёров
  allServices = [];
  partners.forEach(p => {
    if (p.services && p.services.length > 0) {
      p.services.forEach((s, index) => {
        allServices.push({ 
          ...s, 
          partnerName: p.name, 
          partnerId: p.id,
          category: p.category,
          serviceIndex: index 
        });
      });
    }
  });

  // Генерируем кнопки фильтров на основе существующих категорий
  const filtersBox = document.getElementById("partnerFilters");
  const uniqueCategories = [...new Set(allServices.map(s => s.category))];
  
  if (uniqueCategories.length > 0) {
    // Очищаем всё, кроме кнопки "Все"
    filtersBox.innerHTML = `<button class="filter-btn active" data-filter="all">Все услуги</button>`;
    filtersBox.innerHTML += uniqueCategories.map(cat => 
      `<button class="filter-btn" data-filter="${cat}">${cat}</button>`
    ).join("");
  }

  // Навешиваем обработчики на фильтры
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderPartnerServices();
    };
  });

  renderPartnerServices();
}

// ========== ОТРИСОВКА КАРТОЧЕК ==========
function renderPartnerServices() {
  const grid = document.getElementById("partnersGrid");
  
  const filtered = currentFilter === "all" ? allServices : allServices.filter(s => s.category === currentFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="empty-msg">В этой категории пока нет услуг</p>`;
    return;
  }

  grid.innerHTML = filtered.map(s => {
    // Проверка на избранное (если нужно)
    const isFav = favorites.some(f => f.id === s.partnerId && f.partnerId === s.partnerId && f.serviceIndex === s.serviceIndex);
    
    return `
    <div class="product-card partner-service-card" onclick="showPartnerProductDetails(${s.partnerId}, '${s.title.replace(/'/g, "\\'")}', '${s.image || ''}', '${s.price || ''}', ${s.serviceIndex})" style="cursor: pointer;">
      <button class="product-card__fav ${isFav ? "active" : ""}" onclick="event.stopPropagation(); togglePartnerFavorite(${s.partnerId}, ${s.partnerId}, ${s.serviceIndex});" title="В избранное"><img src="images/izbrannoe.png" class="icon-img" alt="♥"></button>
      <img src="${s.image || ''}" class="product-card__img" onerror="this.src='https://via.placeholder.com/300x400/fbe9ea/c98b8f?text=Фото'">
      <div class="product-card__body">
        <div class="product-card__type">${s.partnerName}</div>
        <h3 class="product-card__title">${s.title}</h3>
        <div class="product-card__price">${s.price || 'Цена по запросу'}</div>
        <button class="product-card__btn" onclick="event.stopPropagation(); openPartnerBooking('${s.title.replace(/'/g, "\\'")}', '${s.partnerName.replace(/'/g, "\\'")}')">Записаться</button>
      </div>
    </div>
    `;
  }).join("");
}

// ========== ЗАПИСЬ НА УСЛУГУ ==========
window.openPartnerBooking = function(serviceTitle, partnerName) {
  const productTitle = `${serviceTitle} (Партнёр: ${partnerName})`;
  
  if (typeof openAppointmentModal === "function") {
    openAppointmentModal(null, productTitle, partnerName);
  } else {
    alert("Ошибка: форма записи не подключена. Проверьте, что на странице partners.html подключен js/appointment.js");
  }
};

// ========== МОДАЛКА ТОВАРА ПАРТНЁРА ==========
window.showPartnerProductDetails = async function(partnerId, title, image, price, serviceIndex) {
  const partners = await getPartners();
  const partner = partners.find(p => p.id === partnerId);
  if (!partner) return;

  document.getElementById("ppImage").src = image || 'https://via.placeholder.com/300x400?text=Фото';
  document.getElementById("ppTitle").textContent = title;
  document.getElementById("ppPrice").textContent = price || 'Цена по запросу';
  document.getElementById("ppPartnerName").textContent = partner.name;
  document.getElementById("ppAddress").textContent = partner.address ? `📍 ${partner.address}` : '';

  // Настройка кнопок
  document.getElementById("ppBookBtn").onclick = () => {
    document.getElementById("partnerProductModal").classList.remove("open");
    openPartnerBooking(title, partner.name);
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

// ========== ИЗБРАННОЕ ДЛЯ ПАРТНЁРОВ ==========
window.togglePartnerFavorite = function(id, partnerId, serviceIndex) {
  const existingIndex = favorites.findIndex(f => f.id === id && f.partnerId === partnerId && f.serviceIndex === serviceIndex);
  
  if (existingIndex !== -1) {
    favorites.splice(existingIndex, 1);
  } else {
    favorites.push({ id, partnerId, serviceIndex });
  }
  
  localStorage.setItem("favorites", JSON.stringify(favorites));
  
  // Обновляем бейджи (если есть)
  if (typeof updateBadges === "function") updateBadges();
  
  // Перерисовываем карточки, чтобы обновить сердечко
  renderPartnerServices();
};

// ========== ЗАКРЫТИЕ МОДАЛОК ==========
document.querySelectorAll('[data-close="partnerProductModal"]').forEach(btn => {
  btn.onclick = () => document.getElementById("partnerProductModal").classList.remove("open");
});
document.getElementById("partnerProductModal").onclick = (e) => {
  if (e.target.id === "partnerProductModal") document.getElementById("partnerProductModal").classList.remove("open");
};

// ========== СТАРТ ==========
loadPartnersData();