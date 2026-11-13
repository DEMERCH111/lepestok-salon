import { getProductById, getMainImage } from './store.js';

// Берём функции избранного из глобальной области (их туда кладёт script.js)
const favorites = window.favorites || [];
const toggleFavorite = window.toggleFavorite || function() { console.warn("toggleFavorite не найдена"); };

// Переменные на уровне модуля, чтобы были видны в changeMainImage и других функциях
let currentProduct = null;
let currentImageIndex = 0;

async function initProductPage() {
  const params = new URLSearchParams(window.location.search);
  const productId = parseInt(params.get("id"));
  currentProduct = await getProductById(productId);

  if (!currentProduct) {
    document.getElementById("productPage").innerHTML = `<div class="empty-msg" style="padding:80px 0"><h2>Товар не найден</h2><p><a href="index.html#catalog" class="btn btn--primary" style="margin-top:20px">Вернуться в каталог</a></p></div>`;
    return;
  }

  const product = currentProduct;
  const isFav = favorites.some(f => f.id === product.id && f.partnerId === null);
  document.title = product.title + " — Лепесток";
  
  const images = product.images || [];

  document.getElementById("productPage").innerHTML = `
    <div class="product-view">
      <div class="product-view__gallery" style="position:relative;">
        ${images.length > 1 ? `
          <button id="prevImgBtn" class="gallery-arrow gallery-arrow--left">←</button>
          <button id="nextImgBtn" class="gallery-arrow gallery-arrow--right">→</button>
        ` : ""}
        
        <img id="mainProductImg" src="${getMainImage(product)}" alt="${product.title}" class="product-view__img" onerror="this.src='https://via.placeholder.com/500x650/fbe9ea/c98b8f?text=Фото'">
        
        <div class="product-thumbnails">
          ${images.map((img, i) => `
            <img src="${img}" class="product-thumbnail ${i === 0 ? 'active' : ''}" data-index="${i}" onclick="changeMainImage(${i}, this)" onerror="this.style.display='none'">
          `).join("")}
        </div>
      </div>
      <div class="product-view__info">
        <div class="product-card__type">${product.type}</div>
        <h1 class="product-view__title">${product.title}</h1>
        <div class="product-view__price">${product.price > 0 ? Number(product.price).toLocaleString("ru-RU") + ' ₽' : 'Цена по запросу'}</div>
        <div class="product-view__desc"><p>${product.description || "Описание скоро появится."}</p></div>
        ${product.sizes && product.sizes.length ? `<div class="product-view__sizes"><strong>Размеры:</strong>${product.sizes.map(s => `<button class="size-btn">${s}</button>`).join("")}</div>` : ""}
        <div class="product-view__actions">
          <button class="btn btn--primary" id="appointmentBtn">Записаться на примерку</button>
          <button class="btn btn--outline ${isFav ? "active" : ""}" id="favBtn">${isFav ? "♥ В избранном" : "♡ В избранное"}</button>
        </div>
        <div class="product-view__back"><a href="index.html#catalog">← Вернуться в каталог</a></div>
      </div>
    </div>
  `;

  // Кнопка "Записаться"
  document.getElementById("appointmentBtn").onclick = () => { 
    if (typeof window.openAppointmentModal === "function") {
      window.openAppointmentModal(product.id, product.title); 
    }
  };

  // Кнопка "В избранное"
  document.getElementById("favBtn").onclick = () => {
    if (typeof window.toggleFavorite === "function") {
      window.toggleFavorite(product.id);
      const btn = document.getElementById("favBtn");
      const nowFav = (window.favorites || []).some(f => f.id === product.id && f.partnerId === null);
      btn.classList.toggle("active", nowFav); 
      btn.textContent = nowFav ? "♥ В избранном" : "♡ В избранное";
    }
  };

  // Листание стрелками
  if (images.length > 1) {
    document.getElementById("prevImgBtn").onclick = () => {
      currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
      updateGallery();
    };
    document.getElementById("nextImgBtn").onclick = () => {
      currentImageIndex = (currentImageIndex + 1) % images.length;
      updateGallery();
    };
  }
  
  function updateGallery() {
    document.getElementById("mainProductImg").src = images[currentImageIndex];
    document.querySelectorAll(".product-thumbnail").forEach((t, i) => {
      t.classList.toggle("active", i === currentImageIndex);
    });
  }

  // Клик по главному фото — полноэкранный просмотр
  const productImg = document.querySelector(".product-view__img");
  if (productImg) {
    productImg.style.cursor = "zoom-in";
    productImg.onclick = () => {
      document.getElementById("imageModalImg").src = document.getElementById("mainProductImg").src;
      document.getElementById("imageModal").classList.add("open");
    };
  }
}

// Глобальная функция для смены миниатюры (вызывается из onclick в HTML)
window.changeMainImage = function(index, el) {
  if (!currentProduct || !currentProduct.images) return;
  currentImageIndex = index;
  document.getElementById("mainProductImg").src = currentProduct.images[index];
  document.querySelectorAll(".product-thumbnail").forEach(t => t.classList.remove("active"));
  el.classList.add("active");
};

// Инициализация
initProductPage().then(() => {
  // Обновляем бейджи после загрузки товара
  if (typeof window.updateBadges === "function") window.updateBadges();

  // Обработчики модалок
  const favBtn = document.getElementById("favoritesBtn");
  if (favBtn && typeof window.openModal === "function") {
    favBtn.onclick = () => {
      window.openModal("favModal");
      if (typeof window.renderFavorites === "function") window.renderFavorites();
    };
  }

  document.querySelectorAll('[data-close="imageModal"]').forEach(btn => { 
    btn.onclick = () => document.getElementById("imageModal").classList.remove("open"); 
  });
  const imageModal = document.getElementById("imageModal");
  if (imageModal) {
    imageModal.onclick = (e) => { if (e.target.id === "imageModal") imageModal.classList.remove("open"); };
  }
  
  document.querySelectorAll("[data-close]").forEach(btn => { 
    btn.onclick = () => { if (typeof window.closeModal === "function") window.closeModal(btn.dataset.close); }; 
  });
  document.querySelectorAll(".modal").forEach(modal => { 
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove("open"); }; 
  });
});