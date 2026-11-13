import { getPartners, getAppointments, updatePartnerServices, savePartners } from './store.js';

async function initPartnerCabinet() {
  // ========== ПРОВЕРКА ВХОДА ==========
  if (localStorage.getItem("adminLoggedIn") !== "true" || localStorage.getItem("adminRole") !== "partner") {
    window.location.href = "admin-login.html";
    return;
  }

  const partnerId = Number(localStorage.getItem("partnerId"));
  const allPartners = await getPartners(); // Ждём загрузки
  let partner = allPartners.find(p => p.id === partnerId);

  if (!partner) {
    alert("Ошибка: партнёр не найден");
    localStorage.clear();
    window.location.href = "admin-login.html";
    return;
  }

  document.getElementById("partnerNameLabel").textContent = partner.name;

  // ========== ВЫХОД ==========
  document.getElementById("logoutBtn").onclick = () => {
    if (confirm("Выйти из кабинета?")) {
      localStorage.removeItem("adminLoggedIn");
      localStorage.removeItem("adminUser");
      localStorage.removeItem("adminRole");
      localStorage.removeItem("partnerId");
      window.location.href = "admin-login.html";
    }
  };

  // ========== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК ==========
  const tabServices = document.getElementById("tabServices");
  const tabPromo = document.getElementById("tabPromo");
  const tabRequests = document.getElementById("tabRequests");
  const tabProfile = document.getElementById("tabProfile");

  const blockServices = document.getElementById("blockServices");
  const blockPromo = document.getElementById("blockPromo");
  const blockRequests = document.getElementById("blockRequests");
  const blockProfile = document.getElementById("blockProfile");

  function hideAllBlocks() {
    blockServices.style.display = "none";
    blockPromo.style.display = "none";
    blockRequests.style.display = "none";
    if(blockProfile) blockProfile.style.display = "none";
    
    tabServices.classList.remove("active");
    tabPromo.classList.remove("active");
    tabRequests.classList.remove("active");
    if(tabProfile) tabProfile.classList.remove("active");
  }

  tabServices.onclick = (e) => {
    e.preventDefault();
    hideAllBlocks();
    tabServices.classList.add("active");
    blockServices.style.display = "block";
  };

  tabPromo.onclick = (e) => {
    e.preventDefault();
    hideAllBlocks();
    tabPromo.classList.add("active");
    blockPromo.style.display = "block";
    renderPromoBlock();
  };

  tabRequests.onclick = (e) => {
    e.preventDefault();
    hideAllBlocks();
    tabRequests.classList.add("active");
    blockRequests.style.display = "block";
    renderMyRequests();
  };

  if (tabProfile) {
    tabProfile.onclick = (e) => {
      e.preventDefault();
      hideAllBlocks();
      tabProfile.classList.add("active");
      blockProfile.style.display = "block";
      
      document.getElementById("profName").value = partner.name || "";
      document.getElementById("profAddress").value = partner.address || "";
      document.getElementById("profPhone").value = partner.phone || "";
      document.getElementById("profDesc").value = partner.description || "";
      document.getElementById("profLogoUrl").value = partner.logo || "";
      document.getElementById("profPromo").value = partner.promo || "";
      document.getElementById("profBonus").value = partner.bonus || "";
      
      const logoPrev = document.getElementById("logoPreview");
      if (partner.logo) {
        logoPrev.innerHTML = `<img src="${partner.logo}" style="max-width:100px; border-radius:8px;">`;
      } else {
        logoPrev.innerHTML = "";
      }
    };
  }

  // ========== РАБОТА С УСЛУГАМИ ==========
  function renderMyServices() {
    const tbody = document.getElementById("partnerServicesBody");
    const services = partner.services || [];

    if (services.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#8a7a7a">У вас пока нет услуг. Нажмите «+ Добавить».</td></tr>`;
      return;
    }

    tbody.innerHTML = services.map((s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><img src="${s.image || ''}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;" onerror="this.src='https://via.placeholder.com/60x60?text=—'"></td>
        <td><strong>${s.title}</strong></td>
        <td>${s.price || '—'}</td>
        <td><button class="btn-icon btn-icon--danger" onclick="deleteMyService(${i})"><img src="images/musorka.png" class="icon-img" alt="Удал."></button></td>
      </tr>
    `).join("");
  }

  window.deleteMyService = async function(index) {
    if (!confirm("Удалить услугу?")) return;
    partner.services.splice(index, 1);
    await updatePartnerServices(partner.id, partner.services);
    renderMyServices();
  };

  const serviceModal = document.getElementById("serviceModal");
  const serviceForm = document.getElementById("serviceForm");

  document.getElementById("addServiceBtn").onclick = () => {
    serviceForm.reset();
    serviceModal.classList.add("open");
  };

  document.querySelectorAll('[data-close="serviceModal"]').forEach(btn => {
    btn.onclick = () => serviceModal.classList.remove("open");
  });
  serviceModal.onclick = (e) => { if (e.target.id === "serviceModal") serviceModal.classList.remove("open"); };

  function compressImage(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url); let { width, height } = img;
        if (width > maxWidth) { height = Math.round((maxWidth / width) * height); width = maxWidth; }
        const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = url;
    });
  }

  serviceForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("srvTitle").value.trim();
    const price = document.getElementById("srvPrice").value.trim();
    const imageUrl = document.getElementById("srvImage").value.trim();
    const fileInput = document.getElementById("srvImageFile");
    const file = fileInput.files[0];

    const saveService = async (finalImageUrl) => {
      const currentServices = partner.services || [];
      currentServices.push({ title, price, image: finalImageUrl });
      await updatePartnerServices(partner.id, currentServices);
      partner.services = currentServices;
      serviceModal.classList.remove("open");
      renderMyServices();
    };

    if (file) {
      compressImage(file).then(dataUrl => saveService(dataUrl));
    } else {
      await saveService(imageUrl);
    }
  });

  // ========== ПРОМОКОД И QR ==========
  function renderPromoBlock() {
    document.getElementById("promoDisplay").textContent = partner.promo || "—";
    document.getElementById("bonusDisplay").textContent = partner.bonus || "—";
    
    const link = window.location.origin + "/promo.html?promo=" + partner.promo;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;
    document.getElementById("qrImage").src = qrUrl;
  }

  const promoModal = document.getElementById("promoModal");
  const promoForm = document.getElementById("promoForm");

  document.getElementById("changePromoBtn").onclick = () => {
    document.getElementById("newPromoInput").value = partner.promo || "";
    promoModal.classList.add("open");
  };

  document.querySelectorAll('[data-close="promoModal"]').forEach(btn => {
    btn.onclick = () => promoModal.classList.remove("open");
  });
  promoModal.onclick = (e) => { if (e.target.id === "promoModal") promoModal.classList.remove("open"); };

  promoForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newPromo = document.getElementById("newPromoInput").value.trim().toUpperCase();
    
    if (!newPromo) return;
    
    const allP = await getPartners();
    if (allP.some(p => p.promo === newPromo && p.id !== partner.id)) {
      alert("Этот промокод уже занят другим партнёром! Придумайте другой.");
      return;
    }

    const updatedList = allP.map(p => p.id === partner.id ? { ...p, promo: newPromo } : p);
    await savePartners(updatedList);
    
    partner.promo = newPromo;
    
    promoModal.classList.remove("open");
    renderPromoBlock();
    alert("Промокод успешно изменен!");
  });

  // ========== ЗАЯВКИ ==========
  async function renderMyRequests() {
    const tbody = document.getElementById("partnerRequestsBody");
    const allAppointments = await getAppointments();
    
    const myRequests = allAppointments.filter(a => a.partner_name === partner.name);

    if (myRequests.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#8a7a7a">Пока нет заявок</td></tr>`;
      return;
    }

    tbody.innerHTML = myRequests.map(a => {
      const dateStr = formatAppointmentDate(a.date);
      const status = a.status === "new" ? "Новая" : a.status === "done" ? "Выполнена" : "Отменена";
      return `
        <tr>
          <td>${dateStr} в ${a.time}</td>
          <td><strong>${a.name}</strong></td>
          <td><a href="tel:${a.phone}">${a.phone}</a></td>
          <td>${a.product_title}</td>
          <td>${status}</td>
        </tr>
      `;
    }).join("");
  }

  // ========== ЛОГОТИП И ПРОФИЛЬ ==========
  const profLogoFile = document.getElementById("profLogoFile");
  if (profLogoFile) {
    profLogoFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      const preview = document.getElementById("logoPreview");
      if (!file) { preview.innerHTML = ""; return; }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        preview.innerHTML = `<img src="${event.target.result}" style="max-width:100px; border-radius:8px;">`;
      };
      reader.readAsDataURL(file);
    });
  }

  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const fileInput = document.getElementById("profLogoFile");
      const file = fileInput.files[0];
      const logoUrl = document.getElementById("profLogoUrl").value.trim();
      
      const save = async (finalLogo) => {
        const updatedPartners = (await getPartners()).map(p => {
          if (p.id === partner.id) {
            return {
              ...p,
              name: document.getElementById("profName").value.trim(),
              address: document.getElementById("profAddress").value.trim(),
              phone: document.getElementById("profPhone").value.trim(),
              description: document.getElementById("profDesc").value.trim(),
              logo: finalLogo,
              promo: document.getElementById("profPromo").value.trim().toUpperCase(),
              bonus: document.getElementById("profBonus").value.trim()
            };
          }
          return p;
        });
          
        await savePartners(updatedPartners);
        partner.name = document.getElementById("profName").value.trim();
        document.getElementById("partnerNameLabel").textContent = partner.name;
        
        alert("Профиль сохранен! Теперь клиенты увидят ваши контакты.");
      };

      if (file) {
        compressImage(file).then(dataUrl => save(dataUrl));
      } else {
        await save(logoUrl);
      }
    });
  }

  // Функция для форматирования даты (можно вынести в store.js, но пока здесь)
  function formatAppointmentDate(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}.${m}.${y}`;
  }

  // ========== СТАРТ ==========
  renderMyServices();
}

// Запускаем
initPartnerCabinet();