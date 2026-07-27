/*
  qr-router.js — читає швидкий знімок catalog.json із GitHub і відкриває
  потрібний товар та магазин за адресою:
    https://ваш-домен.ua/?qr=inhaler_r1

  Google Apps Script не викликається під час звичайного відкриття сторінки.
  Він потрібен для синхронізації catalog.json, заявок на дзвінок і
  повідомлень про несправний QR-код.
*/
(function () {
  "use strict";

  let catalog = {};
  let activeErrorType = "";
  const accounts = (window.CONTACTS && window.CONTACTS.accounts) || {};
  const service = window.CALLBACK_SERVICE || {};
  const isOn = value => String(value || "").trim().toUpperCase() === "ON";
  const text = value => String(value == null ? "" : value).trim();

  function localConfig(qrId) {
    const route = catalog.routes && catalog.routes[qrId];
    if (!route || !isOn(route.active)) return null;

    const product = catalog.products && catalog.products[route.product_id];
    const store = catalog.stores && catalog.stores[route.store_id];
    if (!product || !store) return null;
    if (product.active && !isOn(product.active)) return null;
    if (store.active && !isOn(store.active)) return null;

    return {
      ok: true,
      source: "local",
      qr_id: route.qr_id,
      product_id: route.product_id,
      store_id: route.store_id,
      callback_enabled: route.callback_enabled,
      review_url: route.review_url,
      reviews_enabled: route.reviews_enabled,
      route: route,
      product: product,
      store: store,
      contacts: {
        phone: (catalog.contacts && catalog.contacts[store.phone_key]) || {},
        viber: (catalog.contacts && catalog.contacts[store.viber_key]) || {},
        telegram: (catalog.contacts && catalog.contacts[store.telegram_key]) || {},
        whatsapp: (catalog.contacts && catalog.contacts[store.whatsapp_key]) || {}
      }
    };
  }

  function setLink(id, href, subtitle, visible) {
    const link = document.getElementById(id);
    if (!link) return;
    link.hidden = !visible;
    if (!visible) return;
    link.href = href || "#";
    const subtitleNode = link.querySelector(".action-sub");
    if (subtitleNode && subtitle !== undefined) subtitleNode.textContent = subtitle;
  }

  function makeReviewButton(url) {
    const reviewHost = document.getElementById("reviewButtons");
    if (!reviewHost) return;
    reviewHost.textContent = "";
    if (!url) return;

    const link = document.createElement("a");
    link.className = "action action-soft-review";
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener";

    const icon = document.createElement("span");
    icon.className = "icon tone-gold";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "★★★★★";
    icon.style.cssText = "font-size:10px;letter-spacing:-1px;line-height:1;";

    const actionText = document.createElement("span");
    actionText.className = "action-text";

    const title = document.createElement("p");
    title.className = "action-title";
    title.textContent = "Залишити відгук";

    const subtitle = document.createElement("p");
    subtitle.className = "action-sub";
    subtitle.textContent = "Нам дуже важлива Ваша думка";

    const chev = document.createElement("span");
    chev.className = "chev";
    chev.setAttribute("aria-hidden", "true");
    chev.textContent = "›";
    chev.style.fontSize = "25px";

    actionText.append(title, subtitle);
    link.append(icon, actionText, chev);
    reviewHost.appendChild(link);
  }

  function drawBarcode(qrId) {
    const host = document.getElementById("barcode");
    if (!host) return;
    host.textContent = "";

    let seed = 0;
    for (let i = 0; i < qrId.length; i += 1) {
      seed = (seed * 31 + qrId.charCodeAt(i)) >>> 0;
    }

    for (let i = 0; i < 40; i += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const bar = document.createElement("span");
      bar.style.height = 10 + (seed % 15) + "px";
      bar.style.opacity = String(0.45 + ((seed >>> 8) % 50) / 100);
      host.appendChild(bar);
    }
  }

  function seasonalBackground() {
    const month = new Date().getMonth() + 1;

    if (month === 12 || month <= 2) {
      return {
        name: "winter",
        symbol: "❄",
        image:
          "radial-gradient(circle at 18% 22%, rgba(255,255,255,.95) 0 7%, transparent 8%)," +
          "radial-gradient(circle at 82% 18%, rgba(255,255,255,.75) 0 5%, transparent 6%)," +
          "linear-gradient(135deg, #EAF4FA 0%, #F8FBFD 58%, #DDECF5 100%)"
      };
    }

    if (month >= 3 && month <= 5) {
      return {
        name: "spring",
        symbol: "🌿",
        image:
          "radial-gradient(circle at 20% 25%, rgba(255,255,255,.86) 0 12%, transparent 13%)," +
          "radial-gradient(circle at 82% 22%, rgba(218,239,224,.85) 0 14%, transparent 15%)," +
          "linear-gradient(135deg, #EEF8F1 0%, #FFF9F1 62%, #E4F1E7 100%)"
      };
    }

    if (month >= 6 && month <= 8) {
      return {
        name: "summer",
        symbol: "☀",
        image:
          "radial-gradient(circle at 78% 18%, rgba(255,226,139,.62) 0 12%, transparent 13%)," +
          "radial-gradient(circle at 18% 70%, rgba(202,237,226,.75) 0 17%, transparent 18%)," +
          "linear-gradient(135deg, #EFF9F4 0%, #FFF8E7 58%, #E7F5F0 100%)"
      };
    }

    return {
      name: "autumn",
      symbol: "🍂",
      image:
        "radial-gradient(circle at 78% 24%, rgba(238,198,140,.38) 0 14%, transparent 15%)," +
        "radial-gradient(circle at 18% 70%, rgba(211,228,201,.72) 0 17%, transparent 18%)," +
        "linear-gradient(135deg, #F5EFE4 0%, #FFF9EE 58%, #E8EFDF 100%)"
    };
  }

  function applyProductPhoto(head, photoUrl) {
    if (!head) return;

    head.classList.remove("no-product-photo");
    delete head.dataset.season;
    delete head.dataset.seasonSymbol;

    const rawPhotoUrl = text(photoUrl);
    if (rawPhotoUrl) {
      const safePhotoUrl = rawPhotoUrl.replace(/["\\\n\r]/g, "");
      head.style.backgroundImage =
        'linear-gradient(180deg, rgba(255,255,255,.02) 42%, rgba(251,249,244,.72) 100%),' +
        'url("' + safePhotoUrl + '")';
      return;
    }

    const season = seasonalBackground();
    head.classList.add("no-product-photo");
    head.dataset.season = season.name;
    head.dataset.seasonSymbol = season.symbol;
    head.style.backgroundImage = season.image;
  }

  function applyConfig(config) {
    const product = config.product || {};
    const store = config.store || {};
    const route = config.route || {};
    const productName = text(product.name) || "ПІДТРИМКА ТОВАРУ";

    document.documentElement.dataset.qrId = text(config.qr_id);
    document.documentElement.dataset.productId = text(config.product_id);
    document.documentElement.dataset.storeId = text(config.store_id);
    document.title = productName + " — підтримка";

    const productNameNode = document.getElementById("productName");
    if (productNameNode) productNameNode.textContent = productName;

    const head = document.querySelector(".head");
    applyProductPhoto(head, product.photo_url);

    const instructionUrl = text(product.instruction_url);
    setLink(
      "instructionLink",
      instructionUrl,
      "Покрокова інструкція у PDF",
      isOn(product.instruction_enabled) && Boolean(instructionUrl)
    );

    const videoUrl = text(product.video_url);
    setLink(
      "videoLink",
      videoUrl,
      "Дивитись відеоінструкцію",
      isOn(product.video_enabled) && Boolean(videoUrl)
    );

    const phoneAcc = config.contacts && config.contacts.phone
      ? config.contacts.phone
      : accounts[store.phone_key] || {};
    const viberAcc = config.contacts && config.contacts.viber
      ? config.contacts.viber
      : accounts[store.viber_key] || {};
    const telegramAcc = config.contacts && config.contacts.telegram
      ? config.contacts.telegram
      : accounts[store.telegram_key] || {};
    const whatsappAcc = config.contacts && config.contacts.whatsapp
      ? config.contacts.whatsapp
      : accounts[store.whatsapp_key] || {};

    const phoneSubtitle = text(phoneAcc.display);
    setLink(
      "phoneLink",
      "tel:" + text(phoneAcc.tel || phoneAcc.value),
      phoneSubtitle,
      Boolean(text(phoneAcc.tel || phoneAcc.value))
    );
    const phoneHoursNode = document.getElementById("phoneHours");
    if (phoneHoursNode) {
      phoneHoursNode.textContent = text(phoneAcc.hours);
      phoneHoursNode.hidden = !text(phoneAcc.hours);
    }
    setLink(
      "viberLink",
      "viber://chat?number=%2B" + text(viberAcc.number || viberAcc.value).replace(/\D/g, ""),
      text(viberAcc.display),
      Boolean(text(viberAcc.number || viberAcc.value))
    );
    setLink(
      "telegramLink",
      text(telegramAcc.link || telegramAcc.value),
      text(telegramAcc.display),
      Boolean(text(telegramAcc.link || telegramAcc.value))
    );
    setLink(
      "whatsappLink",
      "https://wa.me/" + text(whatsappAcc.number || whatsappAcc.value).replace(/\D/g, ""),
      text(whatsappAcc.display),
      Boolean(text(whatsappAcc.number || whatsappAcc.value))
    );

    const messengerGroup = document.querySelector(".msg-group");
    if (messengerGroup) {
      messengerGroup.hidden = !(
        text(viberAcc.number || viberAcc.value) ||
        text(telegramAcc.link || telegramAcc.value) ||
        text(whatsappAcc.number || whatsappAcc.value)
      );
    }

    const reviewUrl = text(
      route.review_url || config.review_url || store.review_url
    );
    const reviewsEnabled =
      route.reviews_enabled || config.reviews_enabled || store.reviews_enabled;
    makeReviewButton(
      isOn(reviewsEnabled) ? reviewUrl : ""
    );
    drawBarcode(text(config.qr_id));

    window.PRODUCT_CALLBACK = {
      enabled: route.callback_enabled || config.callback_enabled || "ON",
      productId: text(config.product_id),
      qrId: text(config.qr_id),
      storeId: text(config.store_id),
      telegramRouteId: text(store.telegram_route_id)
    };

    if (typeof window.initCallback === "function") {
      window.initCallback();
    }

    const loadState = document.getElementById("loadState");
    const pageContent = document.getElementById("pageContent");
    if (loadState) loadState.hidden = true;
    if (pageContent) pageContent.hidden = false;
  }

  function resetErrorReport() {
    const button = document.getElementById("errorReportButton");
    const message = document.getElementById("errorReportMessage");
    activeErrorType = "";
    if (button) {
      button.hidden = true;
      button.disabled = false;
      button.textContent = "Повідомити про помилку";
    }
    if (message) {
      message.hidden = true;
      message.textContent = "";
      message.className = "error-report-message";
    }
  }

  function showLoading() {
    const loadState = document.getElementById("loadState");
    const pageContent = document.getElementById("pageContent");
    const title = document.getElementById("loadTitle");
    const description = document.getElementById("loadText");
    const retry = document.getElementById("retryButton");

    if (pageContent) pageContent.hidden = true;
    if (loadState) {
      loadState.hidden = false;
      loadState.classList.add("is-loading");
    }
    if (title) title.textContent = "Завантажуємо інформацію";
    if (description) {
      description.textContent =
        "Зачекайте кілька секунд — готуємо сторінку Вашого товару.";
    }
    if (retry) retry.hidden = true;
    resetErrorReport();
  }

  function showError(type) {
    const loadState = document.getElementById("loadState");
    const title = document.getElementById("loadTitle");
    const description = document.getElementById("loadText");
    const retry = document.getElementById("retryButton");
    const reportButton = document.getElementById("errorReportButton");
    const reportMessage = document.getElementById("errorReportMessage");
    activeErrorType = type;

    if (loadState) {
      loadState.hidden = false;
      loadState.classList.remove("is-loading");
    }
    if (title) {
      title.textContent = type === "route_not_found"
        ? "QR-код тимчасово недоступний"
        : "Не вдалося завантажити сторінку";
    }
    if (description) {
      description.textContent = type === "route_not_found"
        ? "Наразі цей QR-код неактивний. Спробуйте відкрити сторінку трохи пізніше.\n\nЯкщо повідомлення з’явиться повторно, натисніть «Повідомити про помилку».\n\nДякуємо за розуміння!"
        : "Перевірте інтернет-з’єднання та спробуйте ще раз. Якщо проблема повторюється, натисніть «Повідомити про помилку».";
    }
    if (retry) retry.hidden = false;
    if (reportButton) {
      reportButton.hidden = !text(service.endpoint);
      reportButton.disabled = false;
      reportButton.textContent = "Повідомити про помилку";
    }
    if (reportMessage) {
      reportMessage.hidden = true;
      reportMessage.textContent = "";
      reportMessage.className = "error-report-message";
    }
  }

  function showQrStartPage() {
    const loadState = document.getElementById("loadState");
    const pageContent = document.getElementById("pageContent");
    const title = document.getElementById("loadTitle");
    const description = document.getElementById("loadText");
    const retry = document.getElementById("retryButton");

    document.title = "Підтримка товару";
    if (pageContent) pageContent.hidden = true;
    if (loadState) {
      loadState.hidden = false;
      loadState.classList.remove("is-loading");
    }
    if (title) title.textContent = "Відскануйте QR-код";
    if (description) {
      description.textContent =
        "Щоб відкрити інструкцію та підтримку, відскануйте QR-код на упаковці товару.";
    }
    if (retry) retry.hidden = true;
    resetErrorReport();
  }

  async function reportCurrentError() {
    const button = document.getElementById("errorReportButton");
    const message = document.getElementById("errorReportMessage");
    const endpoint = text(service.endpoint);
    if (!button || !message || !endpoint || !activeErrorType) return;

    const params = new URLSearchParams(window.location.search);
    const payload = new URLSearchParams();
    payload.set("action", "report_error");
    payload.set("errorType", activeErrorType);
    payload.set("qrId", text(params.get("qr")));
    payload.set("pageUrl", window.location.href);
    payload.set("website", "");
    payload.set("reportedAt", new Date().toISOString());

    button.disabled = true;
    button.textContent = "Надсилаємо…";
    message.hidden = true;
    message.textContent = "";
    message.className = "error-report-message";

    try {
      await fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: payload.toString(),
        referrerPolicy: "no-referrer"
      });
      button.textContent = "Повідомлення надіслано";
      message.textContent =
        "Дякуємо! Ми отримали адресу сторінки та перевіримо QR-код.";
      message.hidden = false;
    } catch (error) {
      button.disabled = false;
      button.textContent = "Повідомити про помилку";
      message.textContent =
        "Не вдалося надіслати повідомлення. Перевірте інтернет і спробуйте ще раз.";
      message.className = "error-report-message is-error";
      message.hidden = false;
    }
  }

  function catalogUrl() {
    const url = new URL(text(service.catalogUrl) || "catalog.json", window.location.href);
    url.searchParams.set("_", String(Date.now()));
    return url.toString();
  }

  async function loadCatalog() {
    const response = await fetch(catalogUrl(), {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" }
    });
    if (!response.ok) throw new Error("catalog_load_failed");

    const payload = await response.json();
    if (!payload || !payload.products || !payload.stores || !payload.routes) {
      throw new Error("invalid_catalog");
    }
    return payload;
  }

  function wait(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }

  async function loadCatalogWithRetry() {
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await loadCatalog();
      } catch (error) {
        lastError = error;
        if (attempt < 2) await wait(500 + attempt * 500);
      }
    }
    throw lastError || new Error("catalog_load_failed");
  }

  async function start() {
    const params = new URLSearchParams(window.location.search);
    const requestedQrId = text(params.get("qr"));
    if (!requestedQrId) {
      showQrStartPage();
      return;
    }

    showLoading();
    try {
      catalog = await loadCatalogWithRetry();
      const config = localConfig(requestedQrId);
      if (!config) {
        showError("route_not_found");
        return;
      }
      applyConfig(config);
    } catch (error) {
      console.error("Catalog load failed:", error);
      showError("catalog_load_failed");
    }
  }

  const retryButton = document.getElementById("retryButton");
  if (retryButton) retryButton.addEventListener("click", start);
  const errorReportButton = document.getElementById("errorReportButton");
  if (errorReportButton) {
    errorReportButton.addEventListener("click", reportCurrentError);
  }
  start();
})();
