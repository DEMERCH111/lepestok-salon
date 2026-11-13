// ========== ГЛАВНАЯ СТРАНИЦА: КАТАЛОГ И ИЗБРАННОЕ ==========
import { getProducts, getMainImage, getShopProfile, getPartnerByPromo } from './store.js';

let products = []; // Сюда загрузятся товары из базы

// Если мы на странице товара, то products пустой. Принудительно грузим его для избранного.
async function initFavoritesOnProductPage() {
  if (window.location.pathname.includes("product.html")) {
    if (products.length === 0) {
      products = await getProducts();
    }
  }
}
initFavoritesOnProductPage();
let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");

// МИГРАЦИЯ: превращаем старый формат [1, 2] в [{id: 1, partnerId: null}, {id: 2, partnerId: null}]
favorites = favorites.map(f => {
  if (typeof f === 'number') return { id: f, partnerId: null };
  return f;
});
localStorage.setItem("favorites", JSON.stringify(favorites));

let currentFilter = "all";
let currentSizeFilter = "all"; // Добавляем переменную для фильтра по размеру

// ========== ЗАГРУЗКА ТОВАРОВ ==========
async function loadProducts() {
  products = await getProducts();
  renderSizeFilters(); // Генерируем кнопки размеров
  renderProducts();
}

// ========== ГЕНЕРАЦИЯ ФИЛЬТРОВ ПО РАЗМЕРАМ ==========
function renderSizeFilters() {
  const sizeBox = document.getElementById("sizeFilters");
  if (!sizeBox) return;

  // Собираем все уникальные размеры из всех товаров
  const allSizes = new Set();
  products.forEach(p => {
    if (p.sizes && Array.isArray(p.sizes)) {
      p.sizes.forEach(size => allSizes.add(size.trim()));
    }
  });

  if (allSizes.size === 0) {
    sizeBox.style.display = "none";
    return;
  }

  // Сортируем размеры (сначала числа по возрастанию, потом буквы)
  const sortedSizes = Array.from(allSizes).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB; // если оба числа
    return a.localeCompare(b); // если буквы
  });

  // Рисуем кнопки
  sizeBox.style.display = "flex";
  sizeBox.style.flexWrap = "wrap";
  sizeBox.innerHTML = `<span style="font-size: 14px; color: #8a7a7a; margin-right: 10px; align-self: center;">Размер:</span>` +
    `<button class="filter-btn ${currentSizeFilter === 'all' ? 'active' : ''}" data-size="all" style="padding: 6px 15px; font-size: 14px;">Все</button>` +
    sortedSizes.map(size => 
      `<button class="filter-btn ${currentSizeFilter === size ? 'active' : ''}" data-size="${size}" style="padding: 6px 15px; font-size: 14px; margin: 3px;">${size}</button>`
    ).join("");

  // Вешаем обработчики на кнопки размеров
  sizeBox.querySelectorAll("[data-size]").forEach(btn => {
    btn.onclick = () => {
      sizeBox.querySelectorAll("[data-size]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentSizeFilter = btn.dataset.size;
      renderProducts(); // Перерисовываем каталог
    };
  });
}

// ========== РЕНДЕР КАТАЛОГА ==========
function renderProducts() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;
  
  // Фильтруем по категории И по размеру
  let filtered = products;

  if (currentFilter !== "all") {
    filtered = filtered.filter(p => p.category === currentFilter);
  }

  if (currentSizeFilter !== "all") {
    filtered = filtered.filter(p => p.sizes && p.sizes.includes(currentSizeFilter));
  }

  if (filtered.length === 0) { 
    grid.innerHTML = '<p class="empty-msg">По вашему запросу ничего не найдено. Попробуйте другой размер или категорию.</p>'; 
    return; 
  }

  grid.innerHTML = filtered.map(p => `
    <div class="product-card" data-link="${p.id}">
      <button class="product-card__fav ${favorites.some(f => f.id === p.id && f.partnerId === null) ? "active" : ""}" data-fav="${p.id}" title="В избранное"><img src="images/izbrannoe.png" class="icon-img" alt="♥"></button>
      <img src="${getMainImage(p)}" alt="${p.title}" class="product-card__img" onerror="this.src='https://via.placeholder.com/300x400/fbe9ea/c98b8f?text=' + encodeURIComponent('${p.title}')">
      <div class="product-card__body">
        <div class="product-card__type">${p.type}</div>
        <h3 class="product-card__title">${p.title}</h3>
        <div class="product-card__price">${p.price > 0 ? p.price.toLocaleString("ru-RU") + ' ₽' : 'Цена по запросу'}</div>
        <button class="product-card__btn" data-appointment="${p.id}">Записаться на примерку</button>
      </div>
    </div>
  `).join("");

  grid.querySelectorAll("[data-appointment]").forEach(btn => {
    btn.onclick = (e) => { 
      e.stopPropagation(); 
      const id = +btn.dataset.appointment; 
      const product = products.find(x => x.id === id); 
      openAppointmentModal(id, product ? product.title : ""); 
    };
  });
  
  grid.querySelectorAll("[data-fav]").forEach(btn => {
    btn.onclick = (e) => { e.stopPropagation(); toggleFavorite(+btn.dataset.fav); };
  });
  
  grid.querySelectorAll("[data-link]").forEach(card => {
    card.onclick = () => { window.location.href = `product.html?id=${card.dataset.link}`; };
  });
}

// ========== ИЗБРАННОЕ ==========
function toggleFavorite(id, partnerId = null, serviceIndex = null) {
  const existingIndex = favorites.findIndex(f => f.id === id && f.partnerId === partnerId && f.serviceIndex === serviceIndex);
  
  if (existingIndex !== -1) {
    favorites.splice(existingIndex, 1);
  } else {
    favorites.push({ id, partnerId, serviceIndex });
  }
  
  localStorage.setItem("favorites", JSON.stringify(favorites));
  updateBadges(); 
  if(document.getElementById("productsGrid")) renderProducts(); 
  renderFavorites();
}

function renderFavorites() {
  const box = document.getElementById("favItems");
  if (!box) return;
  
  // Читаем актуальные данные из localStorage (на случай, если их добавили на другой странице)
  let currentFavs = JSON.parse(localStorage.getItem("favorites") || "[]");
  currentFavs = currentFavs.map(f => typeof f === 'number' ? { id: f, partnerId: null } : f);

  if (currentFavs.length === 0) { 
    box.innerHTML = '<p class="empty-msg">Пока пусто</p>'; 
    return; 
  }
  
  let html = "";
  
  currentFavs.forEach(fav => {
    let p, isPartner = false, partner = null, service = null;
    
    if (fav.partnerId === null) {
      // Защита: если товаров еще нет в кэше, пробуем загрузить их (на случай открытия прямо со страницы товара)
      p = products.find(x => x.id === fav.id);
      if (!p) return;
    } else {
      // Товар партнёра (загружаем асинхронно не будем, так как это в модалке. 
      // Для простоты в избранном на главной покажем только товары салона, если партнёров нет под рукой)
      return; 
    }
    
    html += `
      <div class="fav-item-card">
        <img src="${getMainImage(p)}" class="fav-item-card__img" onerror="this.src='https://via.placeholder.com/80x80/fbe9ea/c98b8f?text=Фото'" onclick="window.location.href='product.html?id=${p.id}'">
        <div class="fav-item-card__info">
          <h4 onclick="window.location.href='product.html?id=${p.id}'" style="cursor:pointer;">${p.title}</h4>
          <div class="fav-item-card__price">${p.price > 0 ? p.price.toLocaleString("ru-RU") + ' ₽' : 'Цена по запросу'}</div>
          <div class="fav-item-card__actions">
            <button class="btn btn--primary btn--sm" onclick="event.stopPropagation(); openAppointmentModal(${p.id}, '${p.title.replace(/'/g, "\\'")}')">Записаться</button>
            <a href="index.html#catalog" class="btn btn--outline btn--sm" style="text-decoration:none;">В магазин</a>
            <button class="btn-icon btn-icon--danger" onclick="event.stopPropagation(); toggleFavorite(${p.id});">Удал.</button>
          </div>
        </div>
      </div>
    `;
  });
  
  box.innerHTML = html || '<p class="empty-msg">Пока пусто</p>';
}

function updateBadges() { 
  const fc = document.getElementById("favCount");
  if(fc) fc.textContent = favorites.length; 
  const mfc = document.getElementById("mobileFavCount");
  if(mfc) mfc.textContent = favorites.length;
}

// ========== МОДАЛКИ ==========
function openModal(id) { 
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("open"); 
  if (id === "favModal") renderFavorites(); 
}

function closeModal(id) { 
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("open"); 
}

// ========== ФИЛЬТРЫ ПО КАТЕГОРИЯМ ==========
document.querySelectorAll(".filters:not(#sizeFilters) .filter-btn").forEach(btn => {
  btn.onclick = () => { 
    document.querySelectorAll(".filters:not(#sizeFilters) .filter-btn").forEach(b => b.classList.remove("active")); 
    btn.classList.add("active"); 
    currentFilter = btn.dataset.filter; 
    renderProducts(); 
  };
});

const favBtn = document.getElementById("favoritesBtn");
if (favBtn) {
  favBtn.onclick = () => openModal("favModal");
}

document.querySelectorAll("[data-close]").forEach(btn => { 
  btn.onclick = () => closeModal(btn.dataset.close); 
});

document.querySelectorAll(".modal").forEach(modal => { 
  modal.onclick = (e) => { if (e.target === modal) modal.classList.remove("open"); }; 
});

// ========== ОТРИСОВКА СОЦСЕТЕЙ И КОНТАКТОВ ==========
async function renderSocialsAndContacts() {
  const profile = await getShopProfile();
  
  // 1. Иконки в шапке
  const headerSocials = document.getElementById("headerSocials");
  if (headerSocials) {
    let socialsHtml = "";
    if (profile.vk) socialsHtml += `<a href="${profile.vk}" target="_blank" title="ВКонтакте"><img src="images/vk.png" alt="VK"></a>`;
    if (profile.tg) socialsHtml += `<a href="${profile.tg}" target="_blank" title="Телеграм"><img src="images/tg.png" alt="TG"></a>`;
    if (profile.whatsapp) socialsHtml += `<a href="${profile.whatsapp}" target="_blank" title="WhatsApp"><img src="images/whatsapp.png" alt="WhatsApp"></a>`;
    if (profile.max) socialsHtml += `<a href="${profile.max}" target="_blank" title="Макс"><img src="images/max.png" alt="Max"></a>`;
    if (profile.phone) {
      const telHref = "tel:" + profile.phone.replace(/[^\d+]/g, "");
      socialsHtml += `<a href="${telHref}" title="Позвонить: ${profile.phone}"><img src="images/tel.png" alt="Позвонить"></a>`;
    }
    headerSocials.innerHTML = socialsHtml;
  }

  // 2. Контакты в подвале
  const footerContacts = document.getElementById("footerContacts");
  if (footerContacts) {
    let contactsHtml = `<p style="margin: 0 0 5px 0;">© 2026 ${profile.name || "Лепесток"} — свадебный салон</p>`;
    if (profile.phone) contactsHtml += `<p style="margin: 0 0 5px 0;">Телефон: <a href="tel:${profile.phone.replace(/[^\d+]/g, '')}" style="color:inherit;text-decoration:none;">${profile.phone}</a></p>`;
    if (profile.address) contactsHtml += `<p style="font-size:14px; margin: 0 0 5px 0;">${profile.address}</p>`;
    contactsHtml += `<p style="margin: 8px 0 0 0; font-size:12px"><a href="admin-login.html" style="color:#c98b8f;text-decoration:none">⚙ Вход для администратора</a></p>`;

    let footerSocials = `<div class="footer-contacts__socials">`;
    if (profile.vk) footerSocials += `<a href="${profile.vk}" target="_blank"><img src="images/vk.png" style="width:30px;" alt="VK"></a>`;
    if (profile.tg) footerSocials += `<a href="${profile.tg}" target="_blank"><img src="images/tg.png" style="width:30px;" alt="TG"></a>`;
    if (profile.whatsapp) footerSocials += `<a href="${profile.whatsapp}" target="_blank"><img src="images/whatsapp.png" style="width:30px;" alt="WhatsApp"></a>`;
    if (profile.max) footerSocials += `<a href="${profile.max}" target="_blank"><img src="images/max.png" style="width:30px;" alt="Max"></a>`;
    footerSocials += `</div>`;

    footerContacts.innerHTML = `
      <div class="footer-contacts__text">${contactsHtml}</div>
      ${footerSocials}
    `;
  }
}

// ========== ЗАПУСК ==========
async function init() {
  if (document.getElementById("productsGrid")) { 
    await loadProducts(); 
  }
  updateBadges();
  await renderSocialsAndContacts();
}

init();

window.favorites = favorites;
window.toggleFavorite = toggleFavorite;
window.openModal = openModal;
window.closeModal = closeModal;
window.renderFavorites = renderFavorites;