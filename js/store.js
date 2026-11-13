// ========== РАБОТА С SUPABASE ==========
import { supabase } from './supabase.js';

// --- ТОВАРЫ ---
async function getProducts() {
  const { data, error } = await supabase.from('products').select('*').order('id', { ascending: true });
  if (error) { console.error(error); return []; }
  return data;
}

async function saveProducts(list) {
  for (const p of list) {
    await supabase.from('products').update(p).eq('id', p.id);
  }
}

async function addProduct(product) {
  const { data, error } = await supabase.from('products').insert([product]).select();
  if (error) throw error;
  return data[0];
}

async function updateProduct(id, updated) {
  const { error } = await supabase.from('products').update(updated).eq('id', id);
  if (error) throw error;
}

async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

async function getProductById(id) {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
  if (error) return null;
  return data;
}

function getMainImage(product) {
  if (!product) return "";
  if (product.images && product.images.length > 0) return product.images[0];
  if (product.image) return product.image;
  return "";
}

const CATEGORY_NAMES = { wedding: "Свадебное", evening: "Вечернее", jewelry: "Украшение", accessories: "Аксессуар" };

// --- ЗАЯВКИ (КОРЗИНА) ---
const ORDER_STATUSES = {
  new: { label: "Новая", color: "#e67e22" },
  processing: { label: "В обработке", color: "#3498db" },
  confirmed: { label: "Подтверждена", color: "#27ae60" },
  done: { label: "Выполнена", color: "#95a5a6" },
  cancelled: { label: "Отменена", color: "#e63946" }
};

async function getOrders() { return []; }
async function saveOrders(l) { }
async function createOrder(customer, items) { return null; }
async function setOrderStatus(id, status) { }
async function deleteOrder(id) { }
async function getOrderById(id) { return null; }
function formatOrderDate(iso) { const d = new Date(iso); const p = n => String(n).padStart(2,"0"); return `${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}`; }

// --- ЗАПИСИ НА ПРИМЕРКУ ---
function getAllTimeSlots() { const s = []; for (let h = 10; h < 18; h++) s.push(String(h).padStart(2,"0") + ":00"); return s; }

async function getAppointments() {
  const { data, error } = await supabase.from('appointments').select('*').order('date', { ascending: true });
  if (error) return [];
  return data;
}

async function saveAppointments(l) { }

async function getBusySlots(date) {
  const { data, error } = await supabase.from('appointments').select('time').eq('date', date);
  if (error) return [];
  return data.map(a => a.time);
}

async function isSlotFree(date, time) {
  const busy = await getBusySlots(date);
  return !busy.includes(time);
}

async function createAppointment(data) {
  // 1. Клиентская проверка (быстрая)
  const free = await isSlotFree(data.date, data.time);
  if (!free) throw new Error("Это время уже занято, выберите другое.");

  const payload = {
    product_id: data.productId ? Number(data.productId) : null,
    product_title: data.productTitle || "",
    partner_name: data.partnerName || null,
    name: data.name,
    phone: data.phone,
    date: data.date,
    time: data.time,
    promo_code: data.promoCode || "",
    status: "new"
  };

  const { data: inserted, error } = await supabase.from('appointments').insert([payload]).select();
  
  // 2. Если база данных вернула ошибку (например, если сработал уникальный индекс)
  if (error) {
    console.error("Ошибка Supabase:", error);
    if (error.code === '23505') { // Код ошибки уникальности в Postgres
      throw new Error("Упс! Кто-то только что занял это время. Пожалуйста, выберите другое.");
    }
    throw new Error("Не удалось записаться. Попробуйте позже.");
  }
  return inserted[0];
}

async function deleteAppointment(id) {
  await supabase.from('appointments').delete().eq('id', id);
}

async function setAppointmentStatus(id, status) {
  await supabase.from('appointments').update({ status }).eq('id', id);
}

function formatAppointmentDate(dateStr) { 
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-"); 
  return `${d}.${m}.${y}`; 
}

function getTodayString() { const d = new Date(); const p = n => String(n).padStart(2,"0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }

// --- ПОСТУПЛЕНИЯ ---
async function getIncomings() {
  const { data, error } = await supabase.from('incomings').select('*').order('date', { ascending: false });
  if (error) return [];
  return data;
}

async function saveIncomings(l) { }

async function addIncoming(data) {
  const { data: inserted, error } = await supabase.from('incomings').insert([data]).select();
  if (error) throw error;
  return inserted[0];
}

async function deleteIncoming(id) {
  await supabase.from('incomings').delete().eq('id', id);
}

// --- ПРОДАЖИ ---
async function getSales() {
  const { data, error } = await supabase.from('sales').select('*').order('date', { ascending: false });
  if (error) return [];
  return data;
}

async function saveSales(l) { }

async function addSale(data) {
  const payload = {
    product_id: data.product_id || null,
    product_title: data.product_title || "",
    amount: data.amount,
    payment_method: data.payment_method || "",
    customer_name: data.customer_name || "",
    customer_phone: data.customer_phone || "",
    items: data.items || [],
    sale_type: data.sale_type || "Продажа",
    rental_date_out: data.rental_date_out || null,
    rental_date_return: data.rental_date_return || null,
    rental_status: data.sale_type === "Аренда" ? (data.rental_status || "active") : null
  };
  const { data: inserted, error } = await supabase.from('sales').insert([payload]).select();
  if (error) throw error;
  return inserted[0];
}

async function updateSale(id, updated) {
  const { error } = await supabase.from('sales').update(updated).eq('id', id);
  if (error) throw error;
}

// --- АРЕНДЫ (выборка из sales по типу) ---
async function getRentals() {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('sale_type', 'Аренда')
    .order('rental_date_out', { ascending: false });
  if (error) return [];
  return data;
}

async function setRentalStatus(id, status) {
  const { error } = await supabase.from('sales').update({ rental_status: status }).eq('id', id);
  if (error) throw error;
}

async function deleteSale(id) {
  await supabase.from('sales').delete().eq('id', id);
}

// --- КЛИЕНТЫ ---
async function getClients() {
  const { data, error } = await supabase.from('clients').select('*').order('id', { ascending: false });
  if (error) return [];
  return data;
}

async function saveClients(l) { }

async function addClient(data) {
  const { data: existing } = await supabase.from('clients').select('id').eq('phone', data.phone);
  if (existing && existing.length > 0) {
    alert("Клиент с таким телефоном уже есть!");
    return null;
  }
  const { data: inserted, error } = await supabase.from('clients').insert([data]).select();
  if (error) throw error;
  return inserted[0];
}

async function deleteClient(id) {
  await supabase.from('clients').delete().eq('id', id);
}

// --- СОТРУДНИКИ ---
async function getStaff() {
  const { data, error } = await supabase.from('staff').select('*').order('id', { ascending: true });
  if (error) return [];
  return data;
}

async function saveStaff(l) {
  for (const s of l) {
    // Обновляем только те поля, которые точно есть в таблице
    const { error } = await supabase
      .from('staff')
      .update({
        name: s.name,
        login: s.login,
        password: s.password,
        role: s.role
      })
      .eq('id', s.id);
    
    if (error) {
      console.error("Ошибка обновления staff:", error);
      throw new Error(error.message);
    }
  }
}

async function addStaff(data) {
  const { data: existing } = await supabase.from('staff').select('id').eq('login', data.login);
  if (existing && existing.length > 0) throw new Error("Логин занят");

  const { data: inserted, error } = await supabase.from('staff').insert([data]).select();
  if (error) throw error;
  return inserted[0];
}

async function deleteStaff(id) {
  await supabase.from('staff').delete().eq('id', id);
}

async function updateStaffRole(id, role) {
  await supabase.from('staff').update({ role }).eq('id', id);
}

// --- ПАРТНЁРЫ ---
async function getPartners() {
  const { data, error } = await supabase.from('partners').select('*').order('id', { ascending: true });
  if (error) return [];
  return data;
}

async function savePartners(list) {
  for (const p of list) {
    // Если промокод пустой — ставим null, чтобы не было дубликатов
    const promo = (p.promo && p.promo.trim() !== "") ? p.promo.trim() : null;
    
    // Обновляем только нужные поля (чтобы не затереть другие)
    const { error } = await supabase.from('partners').update({
      category: p.category,
      name: p.name,
      promo: promo,
      bonus: p.bonus,
      address: p.address,
      phone: p.phone,
      description: p.description,
      logo: p.logo,
      services: p.services
    }).eq('id', p.id);
    
    if (error) throw error;
  }
}

async function addPartner(data) {
  if (data.promo && data.promo.trim() !== "") {
    const { data: existing } = await supabase.from('partners').select('id').eq('promo', data.promo);
    if (existing && existing.length > 0) throw new Error("Такой промокод уже существует");
  }

  const { data: inserted, error } = await supabase.from('partners').insert([data]).select();
  if (error) throw error;
  return inserted[0];
}

async function updatePartnerServices(partnerId, services) {
  await supabase.from('partners').update({ services }).eq('id', partnerId);
}

async function deletePartner(id) {
  await supabase.from('partners').delete().eq('id', id);
}

async function getPartnerByPromo(promo) {
  if (!promo) return null;
  const { data, error } = await supabase.from('partners').select('*').eq('promo', promo).single();
  if (error) return null;
  return data;
}

// --- ПРОФИЛЬ САЛОНА ---
async function getShopProfile() {
  const { data, error } = await supabase.from('shop_profile').select('*').eq('id', 1).single();
  if (error) return { name: "Салон «Лепесток»", address: "", phone: "", vk: "", tg: "", whatsapp: "", max: "" };
  return data;
}

async function saveShopProfile(data) {
  await supabase.from('shop_profile').update(data).eq('id', 1);
}

// --- РАСХОДЫ ---
async function getExpenses() {
  const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
  if (error) return [];
  return data;
}

async function addExpense(data) {
  const payload = {
    title: data.title,
    amount: data.amount,
    note: data.note || null
  };
  const { data: inserted, error } = await supabase.from('expenses').insert([payload]).select();
  if (error) throw error;
  return inserted[0];
}

async function updateExpense(id, updated) {
  const { error } = await supabase.from('expenses').update(updated).eq('id', id);
  if (error) throw error;
}

async function deleteExpense(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

// Экспорт функций в глобальную область, чтобы обычные скрипты (admin.js, script.js и т.д.) могли их использовать
window.getProducts = getProducts;
window.saveProducts = saveProducts;
window.addProduct = addProduct;
window.updateProduct = updateProduct;
window.deleteProduct = deleteProduct;
window.getProductById = getProductById;
window.getMainImage = getMainImage;
window.CATEGORY_NAMES = CATEGORY_NAMES;
window.ORDER_STATUSES = ORDER_STATUSES;
window.getOrders = getOrders;
window.saveOrders = saveOrders;
window.createOrder = createOrder;
window.setOrderStatus = setOrderStatus;
window.deleteOrder = deleteOrder;
window.getOrderById = getOrderById;
window.formatOrderDate = formatOrderDate;
window.getAllTimeSlots = getAllTimeSlots;
window.getAppointments = getAppointments;
window.saveAppointments = saveAppointments;
window.getBusySlots = getBusySlots;
window.isSlotFree = isSlotFree;
window.createAppointment = createAppointment;
window.deleteAppointment = deleteAppointment;
window.setAppointmentStatus = setAppointmentStatus;
window.formatAppointmentDate = formatAppointmentDate;
window.getTodayString = getTodayString;
window.getIncomings = getIncomings;
window.saveIncomings = saveIncomings;
window.addIncoming = addIncoming;
window.deleteIncoming = deleteIncoming;
window.getSales = getSales;
window.getExpenses = getExpenses;
window.addExpense = addExpense;
window.deleteExpense = deleteExpense;
window.saveSales = saveSales;
window.addSale = addSale;
window.updateSale = updateSale;
window.deleteSale = deleteSale;
window.getRentals = getRentals;
window.setRentalStatus = setRentalStatus;
window.getClients = getClients;
window.saveClients = saveClients;
window.addClient = addClient;
window.deleteClient = deleteClient;
window.getStaff = getStaff;
window.saveStaff = saveStaff;
window.addStaff = addStaff;
window.deleteStaff = deleteStaff;
window.updateStaffRole = updateStaffRole;
window.getPartners = getPartners;
window.savePartners = savePartners;
window.addPartner = addPartner;
window.updatePartnerServices = updatePartnerServices;
window.deletePartner = deletePartner;
window.getPartnerByPromo = getPartnerByPromo;
window.getShopProfile = getShopProfile;
window.saveShopProfile = saveShopProfile;

// Экспорт для модулей (admin.js, script.js и т.д.)
export {
  getProducts, saveProducts, addProduct, updateProduct, deleteProduct, getProductById,
  getMainImage, CATEGORY_NAMES, ORDER_STATUSES, getOrders, saveOrders, createOrder,
  setOrderStatus, deleteOrder, getOrderById, formatOrderDate, getAllTimeSlots,
  getAppointments, saveAppointments, getBusySlots, isSlotFree, createAppointment,
  deleteAppointment, setAppointmentStatus, formatAppointmentDate, getTodayString,
  getIncomings, saveIncomings, addIncoming, deleteIncoming, 
  getSales, saveSales, addSale, updateSale, deleteSale, getRentals, setRentalStatus,
  getExpenses, addExpense, updateExpense, deleteExpense,
  getClients, saveClients, addClient, deleteClient,
  getStaff, saveStaff, addStaff, deleteStaff, updateStaffRole,
  getPartners, savePartners, addPartner, updatePartnerServices, deletePartner,
  getPartnerByPromo, getShopProfile, saveShopProfile
};