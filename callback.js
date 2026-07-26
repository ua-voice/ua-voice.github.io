/*
  callback.js — спільна кнопка і форма «ПЕРЕТЕЛЕФОНУЙТЕ МЕНІ».

  Кожна товарна сторінка задає лише:
    window.PRODUCT_CALLBACK = { enabled: "ON", id: "product-id" };

  Назву товару визначає Google Apps Script за дозволеним id.
*/
(function () {
  "use strict";

  const product = window.PRODUCT_CALLBACK || {};
  const service = window.CALLBACK_SERVICE || {};
  const isOn = value => String(value).trim().toUpperCase() === "ON";
  const endpoint = String(service.endpoint || "").trim();

  if (!isOn(product.enabled) || !product.id || !endpoint) return;

  const actions = document.querySelector(".actions");
  if (!actions) return;

  const style = document.createElement("style");
  style.textContent = `
    .callback-action{
      width:100%;
      font:inherit;
      text-align:left;
      cursor:pointer;
    }
    .callback-action .action-title,
    .callback-action .action-sub{ display:block; }
    .callback-action .icon{
      background:rgba(226,163,61,0.18);
      color:#B87A16;
    }
    .callback-overlay{
      position:fixed;
      inset:0;
      z-index:9999;
      display:none;
      align-items:flex-end;
      justify-content:center;
      padding:16px;
      background:rgba(13,20,39,0.62);
      backdrop-filter:blur(4px);
    }
    .callback-overlay.is-open{ display:flex; }
    .callback-modal{
      width:100%;
      max-width:420px;
      max-height:calc(100vh - 32px);
      overflow:auto;
      border-radius:20px;
      padding:22px;
      background:#FBF9F4;
      color:#22262B;
      box-shadow:0 24px 60px -20px rgba(0,0,0,0.55);
    }
    .callback-head{
      display:flex;
      align-items:flex-start;
      gap:14px;
      margin-bottom:18px;
    }
    .callback-head-text{ flex:1; }
    .callback-title{
      margin:0 0 5px;
      color:#16213E;
      font-size:20px;
      font-weight:800;
      line-height:1.2;
    }
    .callback-description{
      margin:0;
      color:#6B6459;
      font-size:13px;
      line-height:1.5;
    }
    .callback-close{
      flex:0 0 auto;
      width:36px;
      height:36px;
      border:0;
      border-radius:10px;
      background:#F1EDE4;
      color:#16213E;
      font-size:24px;
      line-height:1;
      cursor:pointer;
    }
    .callback-field{ margin-bottom:14px; }
    .callback-label{
      display:block;
      margin:0 0 6px;
      color:#223058;
      font-size:13px;
      font-weight:700;
    }
    .callback-input,
    .callback-select{
      width:100%;
      min-height:48px;
      border:1px solid #C9C2B2;
      border-radius:12px;
      padding:11px 13px;
      background:#fff;
      color:#22262B;
      font:inherit;
      font-size:15px;
      outline:none;
    }
    .callback-input:focus,
    .callback-select:focus{
      border-color:#4C7A67;
      box-shadow:0 0 0 3px rgba(76,122,103,0.12);
    }
    .callback-consent{
      display:flex;
      align-items:flex-start;
      gap:9px;
      margin:4px 0 16px;
      color:#6B6459;
      font-size:11.5px;
      line-height:1.45;
    }
    .callback-consent input{
      flex:0 0 auto;
      width:17px;
      height:17px;
      margin:1px 0 0;
      accent-color:#4C7A67;
    }
    .callback-submit{
      width:100%;
      min-height:50px;
      border:0;
      border-radius:13px;
      padding:12px 16px;
      background:#16213E;
      color:#fff;
      font:inherit;
      font-size:14px;
      font-weight:800;
      letter-spacing:.02em;
      cursor:pointer;
    }
    .callback-submit:disabled{
      cursor:wait;
      opacity:.65;
    }
    .callback-message{
      display:none;
      margin:13px 0 0;
      border-radius:11px;
      padding:11px 12px;
      font-size:12.5px;
      line-height:1.45;
    }
    .callback-message.is-error{
      display:block;
      background:#FDECEC;
      color:#8D2525;
    }
    .callback-message.is-success{
      display:block;
      background:#E8F3ED;
      color:#285B45;
    }
    .callback-honeypot{
      position:absolute !important;
      left:-10000px !important;
      width:1px !important;
      height:1px !important;
      overflow:hidden !important;
    }
    @media (min-width:600px){
      .callback-overlay{ align-items:center; }
    }
  `;
  document.head.appendChild(style);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "action callback-action";
  button.setAttribute("aria-haspopup", "dialog");
  button.innerHTML = `
    <span class="icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07
          19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1
          4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0
          0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0
          0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
        <path d="M15 3h6v6"/>
        <path d="M21 3l-6 6"/>
      </svg>
    </span>
    <span class="action-text">
      <span class="action-title">ПЕРЕТЕЛЕФОНУЙТЕ МЕНІ</span>
      <span class="action-sub">Залиште номер — ми Вам зателефонуємо</span>
    </span>
    <span class="chev" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round"
        stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
    </span>
  `;

  const phoneLink = document.getElementById("phoneLink");
  if (phoneLink && phoneLink.parentNode === actions) {
    phoneLink.insertAdjacentElement("afterend", button);
  } else {
    actions.insertBefore(button, actions.firstChild);
  }

  const overlay = document.createElement("div");
  overlay.className = "callback-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <section class="callback-modal" role="dialog" aria-modal="true"
      aria-labelledby="callbackTitle">
      <div class="callback-head">
        <div class="callback-head-text">
          <h2 class="callback-title" id="callbackTitle">Замовити дзвінок</h2>
          <p class="callback-description">
            Залиште номер телефону — менеджер зв’яжеться з Вами у робочий час.
          </p>
        </div>
        <button class="callback-close" type="button" aria-label="Закрити">&times;</button>
      </div>

      <form class="callback-form" novalidate>
        <div class="callback-field">
          <label class="callback-label" for="callbackPhone">Номер телефону *</label>
          <input class="callback-input" id="callbackPhone" name="phone" type="tel"
            inputmode="tel" autocomplete="tel" placeholder="+38 0XX XXX XX XX"
            maxlength="20" required>
        </div>

        <div class="callback-field">
          <label class="callback-label" for="callbackName">Ваше ім’я</label>
          <input class="callback-input" id="callbackName" name="name" type="text"
            autocomplete="name" placeholder="Необов’язково" maxlength="60">
        </div>

        <div class="callback-field">
          <label class="callback-label" for="callbackTime">Коли зручно зателефонувати?</label>
          <select class="callback-select" id="callbackTime" name="preferredTime">
            <option value="Якнайшвидше">Якнайшвидше</option>
            <option value="09:00–12:00">З 09:00 до 12:00</option>
            <option value="12:00–15:00">З 12:00 до 15:00</option>
            <option value="15:00–18:00">З 15:00 до 18:00</option>
          </select>
        </div>

        <label class="callback-consent">
          <input name="consent" type="checkbox" required>
          <span>
            Надсилаючи запит, Ви погоджуєтеся на використання номера телефону
            виключно для зворотного дзвінка.
          </span>
        </label>

        <label class="callback-honeypot" aria-hidden="true">
          Не заповнюйте це поле
          <input name="website" type="text" tabindex="-1" autocomplete="off">
        </label>

        <button class="callback-submit" type="submit">НАДІСЛАТИ ЗАПИТ</button>
        <p class="callback-message" role="status" aria-live="polite"></p>
      </form>
    </section>
  `;
  document.body.appendChild(overlay);

  const form = overlay.querySelector(".callback-form");
  const closeButton = overlay.querySelector(".callback-close");
  const phoneInput = overlay.querySelector("#callbackPhone");
  const submitButton = overlay.querySelector(".callback-submit");
  const message = overlay.querySelector(".callback-message");
  let previousOverflow = "";

  function showMessage(text, type) {
    message.textContent = text;
    message.className = "callback-message is-" + type;
  }

  function openModal() {
    message.textContent = "";
    message.className = "callback-message";
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    window.setTimeout(() => phoneInput.focus(), 0);
  }

  function closeModal() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = previousOverflow;
    button.focus();
  }

  function normalizePhone(raw) {
    let digits = String(raw || "").replace(/\D/g, "");
    if (digits.length === 10 && digits.startsWith("0")) digits = "38" + digits;
    return digits.length === 12 && digits.startsWith("380") ? "+" + digits : "";
  }

  button.addEventListener("click", openModal);
  closeButton.addEventListener("click", closeModal);
  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeModal();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && overlay.classList.contains("is-open")) closeModal();
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    message.textContent = "";
    message.className = "callback-message";

    const data = new FormData(form);
    const phone = normalizePhone(data.get("phone"));
    const consent = form.elements.consent.checked;

    if (!phone) {
      showMessage("Перевірте номер. Введіть український номер у форматі +380.", "error");
      phoneInput.focus();
      return;
    }
    if (!consent) {
      showMessage("Потрібна згода на використання номера для зворотного дзвінка.", "error");
      return;
    }

    const cooldownSeconds = Math.max(30, Number(service.cooldownSeconds) || 60);
    const lastSent = Number(localStorage.getItem("uaVoiceCallbackLast") || 0);
    if (Date.now() - lastSent < cooldownSeconds * 1000) {
      showMessage("Запит уже надіслано. Будь ласка, зачекайте трохи.", "error");
      return;
    }

    const payload = new URLSearchParams();
    payload.set("productId", String(product.id));
    payload.set("phone", phone);
    payload.set("name", String(data.get("name") || "").trim());
    payload.set("preferredTime", String(data.get("preferredTime") || ""));
    payload.set("pageUrl", window.location.href);
    payload.set("website", String(data.get("website") || ""));
    payload.set("submittedAt", new Date().toISOString());

    submitButton.disabled = true;
    submitButton.textContent = "НАДСИЛАЄМО…";

    try {
      await fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: payload.toString(),
        referrerPolicy: "no-referrer"
      });

      localStorage.setItem("uaVoiceCallbackLast", String(Date.now()));
      form.reset();
      showMessage(
        "Дякуємо! Запит отримано. Менеджер зв’яжеться з Вами у робочий час.",
        "success"
      );
    } catch (error) {
      showMessage(
        "Не вдалося надіслати запит. Спробуйте ще раз або зателефонуйте нам.",
        "error"
      );
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "НАДІСЛАТИ ЗАПИТ";
    }
  });
})();
