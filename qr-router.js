/*
  qr-router.js — відкриває потрібний товар і магазин за адресою:
    https://ваш-домен.ua/?qr=inhaler_r1

  Повні адреси GitHub у коді не зберігаються, тому надалі можна
  підключити власний домен без зміни product_id, store_id та qr_id.
*/
(function () {
  "use strict";

  const catalog = window.QR_CATALOG || {};
  const accounts = (window.CONTACTS && window.CONTACTS.accounts) || {};
  const service = window.CALLBACK_SERVICE || {};
  const isOn = value => String(value || "").trim().toUpperCase() === "ON";
  const text = value => String(value == null ? "" : value).trim();

  const params = new URLSearchParams(window.location.search);
  const requestedQrId = text(params.get("qr")) || text(catalog.defaultQrId);

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
      store: store
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

    const phoneSubtitle = text(phoneAcc.display) +
      (text(phoneAcc.hours) ? " · " + text(phoneAcc.hours) : "");
    setLink(
      "phoneLink",
      "tel:" + text(phoneAcc.tel || phoneAcc.value),
      phoneSubtitle,
      Boolean(text(phoneAcc.tel || phoneAcc.value))
    );
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
  }

  function showRouteError() {
    const productNameNode = document.getElementById("productName");
    if (productNameNode) productNameNode.textContent = "QR-КОД НЕ ЗНАЙДЕНО";

    const actions = document.querySelector(".actions");
    if (actions) {
      Array.from(actions.children).forEach(node => {
        node.hidden = true;
      });
    }

    const fallbackStore = catalog.stores &&
      catalog.routes &&
      catalog.routes[catalog.defaultQrId] &&
      catalog.stores[catalog.routes[catalog.defaultQrId].store_id];
    const fallbackPhone = fallbackStore
      ? accounts[fallbackStore.phone_key] || {}
      : {};

    if (actions && text(fallbackPhone.tel)) {
      const link = document.createElement("a");
      link.className = "action action-soft-phone";
      link.href = "tel:" + text(fallbackPhone.tel);
      link.innerHTML =
        '<span class="action-text"><p class="action-title">Зателефонувати</p>' +
        '<p class="action-sub">' + text(fallbackPhone.display) + "</p></span>";
      actions.appendChild(link);
    }

    const thanks = document.querySelector(".thanks");
    if (thanks) {
      thanks.textContent =
        "Цей QR-код неактивний або адреса введена неправильно. Зверніться до нашої підтримки.";
    }
  }

  function loadRemoteConfig(qrId) {
    const endpoint = text(service.endpoint);
    if (!endpoint) return Promise.reject(new Error("missing_endpoint"));

    return new Promise((resolve, reject) => {
      const callbackName = "__uaVoiceQr" + Date.now() +
        Math.random().toString(36).slice(2);
      const script = document.createElement("script");
      const timeoutMs = Math.max(1500, Number(service.configTimeoutMs) || 3500);
      let finished = false;

      function cleanup() {
        window.clearTimeout(timer);
        delete window[callbackName];
        script.remove();
      }

      function finish(handler, value) {
        if (finished) return;
        finished = true;
        cleanup();
        handler(value);
      }

      window[callbackName] = payload => {
        if (payload && payload.ok) {
          finish(resolve, payload);
        } else {
          finish(reject, new Error("route_not_found"));
        }
      };

      script.async = true;
      script.onerror = () => finish(reject, new Error("config_load_failed"));
      script.src = endpoint +
        (endpoint.includes("?") ? "&" : "?") +
        "action=config&qr=" + encodeURIComponent(qrId) +
        "&callback=" + encodeURIComponent(callbackName) +
        "&_=" + Date.now();

      const timer = window.setTimeout(
        () => finish(reject, new Error("config_timeout")),
        timeoutMs
      );
      document.head.appendChild(script);
    });
  }

  const fallback = localConfig(requestedQrId);
  if (fallback) applyConfig(fallback);

  loadRemoteConfig(requestedQrId)
    .then(applyConfig)
    .catch(() => {
      if (!fallback) showRouteError();
    });
})();
