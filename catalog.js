/*
  catalog.js — локальний резервний каталог.

  Сторінка спочатку показує дані звідси, тому поточний QR відкривається
  швидко навіть тоді, коли Google Apps Script тимчасово недоступний.
  Основний каталог для великої кількості товарів зберігатиметься у
  Google Таблиці та завантажуватиметься через Apps Script.

  product_id — постійний внутрішній код товару.
  store_id   — постійний код магазину.
  qr_id      — код конкретного QR-маршруту.
*/
window.QR_CATALOG = {
  defaultQrId: "inhaler_r1",

  products: {
    inhaler: {
      product_id: "inhaler",
      name: "ІНГАЛЯТОР",
      photo_url: "product-hero.webp",
      instruction_url: "instruction.pdf",
      instruction_enabled: "ON",
      video_url: "",
      video_enabled: "OFF",
      active: "ON"
    }
  },

  stores: {
    rozetka1: {
      store_id: "rozetka1",
      name: "Rozetka 1",
      phone_key: "phone_a",
      viber_key: "viber_a",
      telegram_key: "telegram_a",
      whatsapp_key: "whatsapp_a",
      telegram_route_id: "team_1",
      active: "ON"
    }
  },

  routes: {
    inhaler_r1: {
      qr_id: "inhaler_r1",
      product_id: "inhaler",
      store_id: "rozetka1",
      callback_enabled: "ON",
      review_url: "",
      reviews_enabled: "OFF",
      active: "ON"
    }
  }
};
