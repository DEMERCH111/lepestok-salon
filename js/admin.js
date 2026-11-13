// ========== АДМИНКА: ТОВАРЫ ==========
import { getProducts, addProduct, updateProduct, deleteProduct, getMainImage, CATEGORY_NAMES, getIncomings } from './store.js';

// Проверка входа
if (localStorage.getItem("adminLoggedIn") !== "true") {
  window.location.href = "admin-login.html";
}

document.getElementById("logoutBtn").onclick = () => {
  if (confirm("Выйти?")) { 
    localStorage.removeItem("adminLoggedIn"); 
    localStorage.removeItem("adminUser"); 
    localStorage.removeItem("adminRole"); 
    window.location.href = "admin-login.html"; 
  }
};

document.getElementById("adminUserLabel").textContent = localStorage.getItem("adminUser") || "admin";

let currentProducts = []; // Локальный кэш для работы
let currentEditImages = []; // Массив для хранения фото текущего товара при редактировании
let newFilesBuffer = []; // Буфер для новых файлов, которые выбрал пользователь

// ========== ЗАГРУЗКА И РЕНДЕР ==========
async function loadAdminProducts() {
  currentProducts = await getProducts();
  renderAdminProducts();
}

function renderAdminProducts() {
  const tbody = document.getElementById("adminProductsBody");
  if (currentProducts.length === 0) { 
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#8a7a7a">Товаров пока нет.</td></tr>`; 
    return; 
  }

  tbody.innerHTML = currentProducts.map(p => `
    <tr>
      <td>${p.id}</td>
      <td>
        <img src="${getMainImage(p)}" alt="${p.title}" class="admin-table__thumb" style="cursor: zoom-in;"
             data-zoom="${getMainImage(p)}" onerror="this.src='https://via.placeholder.com/60x60/fbe9ea/c98b8f?text=—'">
      </td>
      <td><strong>${p.title}</strong></td>
      <td>${CATEGORY_NAMES[p.category] || p.category}</td>
      <td>${p.type}</td>
      <td>${p.price.toLocaleString("ru-RU")}</td>
      <td>
        <button class="btn-icon" title="Вверх" data-up="${p.id}">↑</button>
        <button class="btn-icon" title="Вниз" data-down="${p.id}">↓</button>
        <button class="btn-icon" title="Редактировать" data-edit="${p.id}"><img src="images/karandash.png" class="icon-img" alt="Ред."></button>
        <button class="btn-icon btn-icon--danger" title="Удалить" data-del="${p.id}"><img src="images/musorka.png" class="icon-img" alt="Удал."></button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-zoom]").forEach(img => {
    img.onclick = () => { const src = img.dataset.zoom; if (src) { document.getElementById("adminImageModalImg").src = src; document.getElementById("adminImageModal").classList.add("open"); } };
  });
  
  tbody.querySelectorAll("[data-edit]").forEach(btn => { btn.onclick = () => openProductForm(+btn.dataset.edit); });
  
  tbody.querySelectorAll("[data-up]").forEach(btn => {
    btn.onclick = () => moveProduct(+btn.dataset.up, -1);
  });
  
  tbody.querySelectorAll("[data-down]").forEach(btn => {
    btn.onclick = () => moveProduct(+btn.dataset.down, 1);
  });
  
  tbody.querySelectorAll("[data-del]").forEach(btn => {
    btn.onclick = async () => {
      const id = +btn.dataset.del; 
      const product = currentProducts.find(x => x.id === id);
      if (confirm(`Удалить товар «${product.title}»?`)) { 
        await deleteProduct(id); 
        await loadAdminProducts(); 
      }
    };
  });
}

// ========== СЖАТИЕ ИЗОБРАЖЕНИЙ ==========
function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url); let { width, height } = img;
      if (width > maxWidth) { height = Math.round((maxWidth / width) * height); width = maxWidth; }
      const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Ошибка чтения файла")); img.src = url;
  });
}

// ========== ЗАГРУЗКА ПОСТУПЛЕНИЙ В ВЫПАДАЮЩИЙ СПИСОК ==========
async function loadIncomingsIntoSelect() {
  const select = document.getElementById("pfIncomingSelect");
  if (!select) return;
  
  const incomings = await getIncomings();
  
  if (incomings.length === 0) {
    select.innerHTML = `<option value="">-- Нет поступлений --</option>`;
    return;
  }
  
  // Группируем по названию товара (чтобы не было дублей)
  const uniqueProducts = {};
  incomings.forEach(inc => {
    if (!uniqueProducts[inc.product_title]) {
      uniqueProducts[inc.product_title] = [];
    }
    if (inc.size && !uniqueProducts[inc.product_title].includes(inc.size)) {
      uniqueProducts[inc.product_title].push(inc.size);
    }
  });
  
  select.innerHTML = `<option value="">-- Ввести вручную --</option>` + 
    Object.keys(uniqueProducts).map(title => 
      `<option value="${title}">${title} (размеры: ${uniqueProducts[title].join(", ") || "—"})</option>`
    ).join("");
  
  // Обработчик выбора
  select.onchange = () => {
    const selectedTitle = select.value;
    if (!selectedTitle) return;
    
    // Заполняем название
    document.getElementById("pfTitle").value = selectedTitle;
    
    // Заполняем размеры (если есть)
    const sizes = uniqueProducts[selectedTitle] || [];
    document.getElementById("pfSizes").value = sizes.join(", ");
  };
}

// ========== ОТКРЫТИЕ ФОРМЫ ==========
function openProductForm(id = null) {
  const modal = document.getElementById("productModal"); 
  const title = document.getElementById("productModalTitle"); 
  const form = document.getElementById("productForm");
  
  form.reset(); 
  document.getElementById("pfId").value = "";
  document.getElementById("pfImagePreview").innerHTML = "";
  document.getElementById("currentImagesList").innerHTML = "";
  currentEditImages = []; // Сбрасываем массив текущих фото
  newFilesBuffer = []; // Сбрасываем буфер новых файлов

  if (id === null) { 
    title.textContent = "Добавить товар"; 
  } else {
    const p = currentProducts.find(x => x.id === id); 
    if (!p) return;
    title.textContent = "Редактировать товар"; 
    document.getElementById("pfId").value = p.id;
    document.getElementById("pfTitle").value = p.title; 
    document.getElementById("pfCategory").value = p.category;
    document.getElementById("pfType").value = p.type; 
    document.getElementById("pfPrice").value = p.price;
    document.getElementById("pfSizes").value = (p.sizes || []).join(", ");
    document.getElementById("pfDescription").value = p.description || "";
    
    // Умная загрузка фото: берем из массива images или из старого поля image
    if (p.images && Array.isArray(p.images) && p.images.length > 0) {
      currentEditImages = [...p.images];
    } else if (p.image) {
      currentEditImages = [p.image];
    } else {
      currentEditImages = [];
    }
    
    renderCurrentImages();
  }
  modal.classList.add("open");
  
  // Загружаем поступления для подсказки
  loadIncomingsIntoSelect();
}

// Функция отрисовки текущих фото с кнопками удаления
function renderCurrentImages() {
  const container = document.getElementById("currentImagesList");
  if (!container) return;
  
  if (currentEditImages.length === 0) {
    container.innerHTML = `<span style="color:#8a7a7a; font-size: 13px;">Фото пока нет</span>`;
    return;
  }
  
  container.innerHTML = currentEditImages.map((img, index) => `
    <div style="position: relative; width: 70px; height: 70px; border-radius: 6px; overflow: hidden; border: 1px solid #eee;">
      <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://via.placeholder.com/70x70?text=Ошибка'">
      <button type="button" onclick="removeEditImage(${index})" style="position: absolute; top: 2px; right: 2px; background: #e63946; color: #fff; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; padding: 0; line-height: 1;">×</button>
    </div>
  `).join("");
}

window.removeEditImage = (index) => {
  currentEditImages.splice(index, 1);
  renderCurrentImages();
};

// ========== ДОБАВЛЕНИЕ ФАЙЛОВ В БУФЕР И ПРЕВЬЮ ==========
// Функция отрисовки превью новых файлов
function renderNewFilesPreview() {
  const preview = document.getElementById("pfImagePreview");
  if (newFilesBuffer.length === 0) {
    preview.innerHTML = `<span style="color:#8a7a7a; font-size: 13px;">Файлы не выбраны</span>`;
    return;
  }
  
  preview.innerHTML = newFilesBuffer.map((fileData, index) => `
    <div style="position: relative; width: 70px; height: 70px; border-radius: 6px; overflow: hidden; border: 1px solid #eee;">
      <img src="${fileData.url}" style="width: 100%; height: 100%; object-fit: cover;">
      <button type="button" onclick="removeNewFile(${index})" style="position: absolute; top: 2px; right: 2px; background: #e63946; color: #fff; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; padding: 0; line-height: 1;">×</button>
    </div>
  `).join("");
}

window.removeNewFile = (index) => {
  newFilesBuffer.splice(index, 1);
  renderNewFilesPreview();
};

document.getElementById("pfImageFile").addEventListener("change", (e) => {
  const files = e.target.files; 
  if (!files.length) return;
  
  // Добавляем новые файлы в буфер
  Array.from(files).forEach(file => {
    // Проверяем, нет ли уже такого файла в буфере (по имени и размеру)
    const isDuplicate = newFilesBuffer.some(f => f.name === file.name && f.size === file.size);
    if (!isDuplicate) {
      newFilesBuffer.push({
        file: file, // Сам файл для сжатия
        url: URL.createObjectURL(file), // Временная ссылка для превью
        name: file.name,
        size: file.size
      });
    }
  });
  
  // Очищаем input, чтобы можно было выбрать тот же файл снова, если нужно
  e.target.value = "";
  
  renderNewFilesPreview();
});

// ========== СОХРАНЕНИЕ ==========
document.getElementById("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("pfId").value;
  const sizesRaw = document.getElementById("pfSizes").value.trim();
  const fileInput = document.getElementById("pfImageFile");
  const files = fileInput.files;
  const urlInput = document.getElementById("pfImage").value.trim();

  // Определяем базовый массив картинок (для редактирования берем текущие, для нового - пустой)
  let finalImages = id ? [...currentEditImages] : [];

  // Если ввели ссылку на фото, и её еще нет в массиве — добавляем
  if (urlInput && !finalImages.includes(urlInput)) {
    finalImages.push(urlInput);
  }

  const save = async (newImagesArray) => {
    // Объединяем текущие и новые фото
    const combinedImages = [...finalImages, ...newImagesArray];

    const productData = {
      title: document.getElementById("pfTitle").value.trim(),
      category: document.getElementById("pfCategory").value,
      type: document.getElementById("pfType").value,
      price: document.getElementById("pfPrice").value ? Number(document.getElementById("pfPrice").value) : 0,
      sizes: sizesRaw ? sizesRaw.split(",").map(s => s.trim()).filter(Boolean) : [],
      images: combinedImages,
      description: document.getElementById("pfDescription").value.trim()
    };
    
    try {
      if (id) { 
        await updateProduct(Number(id), productData); 
      } else { 
        await addProduct(productData); 
      }
      document.getElementById("productModal").classList.remove("open");
      await loadAdminProducts();
    } catch (err) {
      alert("Ошибка сохранения: " + err.message);
    }
  };

  // Если в буфере есть новые файлы
  if (newFilesBuffer.length > 0) {
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Сжатие и сохранение...";
    submitBtn.disabled = true;

    // Достаем сами файлы из буфера
    const filesToCompress = newFilesBuffer.map(f => f.file);
    const promises = filesToCompress.map(f => compressImage(f));
    
    Promise.all(promises)
      .then(imagesArray => save(imagesArray))
      .catch(err => {
        alert("Ошибка обработки фото: " + err.message);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      });
  } else {
    // Если новых файлов нет, сохраняем только текущие (и введенную ссылку, если есть)
    save([]);
  }
});

document.getElementById("addProductBtn").onclick = () => openProductForm();
document.querySelectorAll('[data-close="productModal"]').forEach(btn => { btn.onclick = () => document.getElementById("productModal").classList.remove("open"); });
document.getElementById("productModal").onclick = (e) => { if (e.target.id === "productModal") document.getElementById("productModal").classList.remove("open"); };

// ========== ПЕРЕМЕЩЕНИЕ ТОВАРА ==========
async function moveProduct(id, direction) {
  const list = [...currentProducts];
  const index = list.findIndex(p => p.id === id);
  if (index === -1) return;

  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= list.length) return;

  const temp = list[index];
  list[index] = list[newIndex];
  list[newIndex] = temp;

  // Меняем id местами (или просто пересохраняем список). 
  // В базе порядок определяется id, поэтому просто обновим все элементы
  // Временное решение: меняем id у двух товаров, чтобы сохранить порядок
  // Но так как id — это primary key, мы не можем просто так их поменять.
  // Поэтому для сортировки нам нужно поле "sort_order". 
  // ПОКА ЧТО: сортировка работать не будет, так как id в базе фиксированные. 
  // Для простоты оставим кнопки неактивными.
  alert("Сортировка временно недоступна. Товары отображаются по порядку добавления.");
}

// ========== СТАРТ ==========
loadAdminProducts();