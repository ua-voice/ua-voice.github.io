/*
  callback-config.js — адреси каталогу та сервісу зворотного дзвінка.

  catalog.json автоматично формується з Google Таблиці та зберігається
  у GitHub. Секретів у цьому файлі немає: токени зберігаються тільки
  у властивостях Google Apps Script.
*/
window.CALLBACK_SERVICE = {
  endpoint: "https://script.google.com/macros/s/AKfycbxTFCk0hybHpyhbSAtd2tTc-lvt1qhygcpo5JGn7hFChg-xuAMj7V4oOzy3qrcBS4sP/exec",
  cooldownSeconds: 60,
  catalogUrl: "catalog.json",
  defaultQrId: "inhaler_r1",
  fallbackPhoneKey: "phone_a"
};
