import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabaseUrl = "https://jvktudyxysfmisichziu.supabase.co";
const supabaseKey = "sb_publishable_9ev3Zna9hPkuL5b0oM0mWQ_PzCRvJat";

// Экспортируем клиент для модулей
export const supabase = createClient(supabaseUrl, supabaseKey);

// Оставляем и в window — на случай, если какие-то скрипты не модули
window.supabaseClient = supabase;