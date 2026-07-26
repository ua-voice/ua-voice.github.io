/*
  callback-config.js — спільне налаштування сервісу зворотного дзвінка.

  Після публікації Google Apps Script вставте його адресу /exec у поле endpoint.
  Секретів у цьому файлі немає: токен Telegram зберігається тільки
  у властивостях Google Apps Script.
*/
window.CALLBACK_SERVICE = {
  endpoint: "https://script.google.com/macros/s/AKfycbxTFCk0hybHpyhbSAtd2tTc-lvt1qhygcpo5JGn7hFChg-xuAMj7V4oOzy3qrcBS4sP/exec",
  cooldownSeconds: 60
};
