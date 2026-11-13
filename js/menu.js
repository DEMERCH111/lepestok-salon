document.addEventListener("DOMContentLoaded", () => {
  const burgerBtn = document.getElementById("burgerBtn");
  const mobileNav = document.getElementById("mobileNav");

  if (burgerBtn && mobileNav) {
    burgerBtn.addEventListener("click", () => {
      burgerBtn.classList.toggle("active");
      mobileNav.classList.toggle("active");
    });

    mobileNav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", (e) => {
              if (link.id === "mobileFavBtn") {
          e.preventDefault();
          burgerBtn.classList.remove("active");
          mobileNav.classList.remove("active");
          if (typeof openModal === "function") {
            openModal("favModal");
            // Вызываем отрисовку (важно для страницы товара и магазина)
            if (typeof window.renderFavorites === "function") window.renderFavorites();
          } else {
            // Страховка: на страницах без script.js (например shop.html)
            const favModal = document.getElementById("favModal");
            if (favModal) {
              favModal.classList.add("open");
              if (typeof window.renderFavorites === "function") window.renderFavorites();
            }
          }
        }
        
        // === ДОБАВЛЯЕМ ОТКРЫТИЕ ОКНА "О САЛОНЕ" ===
        else if (link.getAttribute("href") === "#about") {
          e.preventDefault();
          burgerBtn.classList.remove("active");
          mobileNav.classList.remove("active");
          
          const aboutModal = document.getElementById("aboutModal");
          if (aboutModal) {
            aboutModal.classList.add("open");
          }
        } 
        else {
          burgerBtn.classList.remove("active");
          mobileNav.classList.remove("active");
        }
      });
    });
  }
});