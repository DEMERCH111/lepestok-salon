// ========== ФОРМА ЗАПИСИ НА ПРИМЕРКУ ==========

// Считываем промокод из ссылки
const urlParams = new URLSearchParams(window.location.search);
const promoFromUrl = urlParams.get("promo");
if (promoFromUrl) {
  localStorage.setItem("activePromo", promoFromUrl.toUpperCase());
}

// Товар, на который сейчас записываемся (выставляется при открытии модалки)
let currentAppointmentProduct = null;

// Открыть модалку записи на конкретный товар
async function openAppointmentModal(productId, productTitle, partnerName = null) {
  currentAppointmentProduct = { id: productId, title: productTitle, partnerName: partnerName };

  const form = document.getElementById("appointmentForm");
  if (!form) {
    alert("Ошибка: форма записи не найдена на этой странице. Обратитесь к администратору.");
    return;
  }

  // сброс формы
  form.reset();
  document.getElementById("apError").textContent = "";
  document.getElementById("appointmentProduct").textContent =
    productTitle ? `Товар: ${productTitle}` : "";

  // минимальная дата — сегодня
  const dateInput = document.getElementById("apDate");
  dateInput.min = getTodayString();
  dateInput.value = getTodayString();

  // обновить список доступных слотов
  await updateAvailableTimeSlots();

   // подставляем промокод из ссылки, если он есть
  const activePromo = localStorage.getItem("activePromo");
  document.getElementById("apPromo").value = activePromo || "";

  // открыть модалку
  document.getElementById("appointmentModal").classList.add("open");
}

// Обновить выпадающий список времени (убираем занятые слоты)
async function updateAvailableTimeSlots() {
  const date = document.getElementById("apDate").value;
  const timeSelect = document.getElementById("apTime");

  if (!date) {
    timeSelect.innerHTML = "";
    return;
  }

  const busy = await getBusySlots(date);
  const all = getAllTimeSlots();
  const free = all.filter(t => !busy.includes(t));

  if (free.length === 0) {
    timeSelect.innerHTML = `<option value="">Все слоты заняты</option>`;
    timeSelect.disabled = true;
    return;
  }

  timeSelect.disabled = false;
  timeSelect.innerHTML = free.map(t => `<option value="${t}">${t}</option>`).join("");
}

// Обработчик смены даты — пересчитываем слоты (только если форма записи есть на странице)
const apDateEl = document.getElementById("apDate");
if (apDateEl) {
  apDateEl.addEventListener("change", updateAvailableTimeSlots);
}

// Обработчик отправки формы
const apForm = document.getElementById("appointmentForm");
if (apForm) {
  apForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const errorEl = document.getElementById("apError");
    errorEl.textContent = "";

       const name = document.getElementById("apName").value.trim();
    const phone = document.getElementById("apPhone").value.trim();
    const date = document.getElementById("apDate").value;
    const time = document.getElementById("apTime").value;
    const promoCode = document.getElementById("apPromo").value.trim().toUpperCase();

    if (!name || !phone || !date || !time) {
      errorEl.textContent = "Заполните все поля";
      return;
    }

    // === ЗАЩИТА ОТ СПАМА ===
    const submitBtn = apForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Отправка...";
    }

    try {
              await createAppointment({
        productId: currentAppointmentProduct?.id || null,
        productTitle: currentAppointmentProduct?.title || "",
        partnerName: currentAppointmentProduct?.partnerName || null,
        name,
        phone,
        date,
        time,
        promoCode: promoCode
      });

        // Проверяем, к кому записался клиент
      if (currentAppointmentProduct?.partnerName) {
        alert(`Спасибо, ${name}!\nВаша заявка на услугу «${currentAppointmentProduct.title}» передана партнёру: ${currentAppointmentProduct.partnerName}.\nДата: ${formatAppointmentDate(date)} в ${time}.\nОн свяжется с вами для подтверждения.`);
      } else {
        alert(`Спасибо, ${name}!\nВы записаны на примерку ${formatAppointmentDate(date)} в ${time}.\nМы ждём вас в салоне «Лепесток».`);
      }

      document.getElementById("appointmentModal").classList.remove("open");
      
    } catch (err) {
      errorEl.textContent = err.message || "Не удалось записаться";
      updateAvailableTimeSlots();
      
      // Если ошибка — возвращаем кнопку в рабочее состояние
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Записаться";
      }
    }
  });
}

// Закрытие модалки
const apModal = document.getElementById("appointmentModal");
if (apModal) {
  document.querySelectorAll('[data-close="appointmentModal"]').forEach(btn => {
    btn.onclick = () => apModal.classList.remove("open");
  });
  apModal.onclick = (e) => {
    if (e.target.id === "appointmentModal") apModal.classList.remove("open");
  };
}