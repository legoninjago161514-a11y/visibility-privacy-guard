# 🛡️ Visibility Privacy Guard

**🇷🇺 Русский** · [🇬🇧 English](#-english)

Userscript для Tampermonkey / Violentmonkey, который уменьшает объём сигналов о переключении вкладок и сворачивании окна, доступных веб-страницам, и глушит часть телеметрии видимости. Инструмент для **локального аудита приватности** и защиты цифрового следа.

> ⚠️ Скрипт **не даёт абсолютной защиты** и не предназначен для обхода прокторинга, экзаменов, антифрод-систем и правил платформ. Подробнее в разделе [Ограничения](#ограничения).

---

## Что делает

| Модуль | Описание |
|---|---|
| **Изоляция состояния** | `document.hidden`, `visibilityState` (и `webkit`-варианты) всегда показывают «вкладка активна», `document.hasFocus()` возвращает `true`. |
| **Подавление событий** | Блокирует регистрацию слушателей `visibilitychange`, `pagehide`, `freeze`, `resume` на любом `EventTarget`, а `blur` — на `window`/`document`/`html`/`body`. Также нейтрализует `onblur`, `onpagehide` и т. п. |
| **Фильтр телеметрии** | Перехватывает `fetch`, `navigator.sendBeacon` и `XMLHttpRequest`. Запросы с маркерами аналитики заменяются фиктивным успешным ответом. |
| **Виртуальные часы** | Сглаживает скачки дельты времени для `performance.now()`, `requestAnimationFrame` и `setInterval` при возврате на вкладку. |

## Установка

### 💻 ПК (Chrome, Edge, Brave, Opera, Firefox)

1. Установите менеджер userscript'ов:
   - [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Edge, Firefox, Opera, Safari)
   - или [Violentmonkey](https://violentmonkey.github.io/) (открытый код)
2. Откройте Raw-ссылку на скрипт:
   `https://raw.githubusercontent.com/YOUR_USERNAME/visibility-privacy-guard/main/visibility-privacy-guard.user.js`
3. Менеджер предложит установку — нажмите **Install**.
4. **Chrome / Edge:** если скрипты не запускаются, включите режим разработчика на странице `chrome://extensions` (и разрешите «Allow User Scripts» в настройках Tampermonkey, если браузер это требует).
5. Обновите открытые вкладки.

Ручная установка: Tampermonkey → **Create a new script** → вставьте содержимое файла → **Ctrl+S**.

### 📱 Android

Мобильный Chrome и большинство Chromium-браузеров для Android **не поддерживают расширения**, поэтому нужен браузер с их поддержкой:

1. Установите **Firefox для Android** (или Firefox Nightly).
2. Меню → **Расширения** → установите **Tampermonkey** или **Violentmonkey**.
3. Откройте Raw-ссылку на скрипт в Firefox и подтвердите установку.

### 🍎 iOS

1. Установите из App Store приложение **Userscripts** (Safari-расширение).
2. Включите его в *Настройки → Safari → Расширения* и выберите папку для скриптов.
3. Положите туда файл `visibility-privacy-guard.user.js`.

## Настройка

В начале файла находится объект `CONFIG`:

| Параметр | По умолчанию | Назначение |
|---|---|---|
| `telemetryPattern` | `/visibility\|focus\|blur\|telemetry\|analytics\|tracking\|heartbeat\|presence/i` | Регулярное выражение для поиска маркеров в URL и теле запроса. |
| `fakeResponseBody` | `{"ok":true}` | Тело фиктивного ответа. |
| `patchDateNow` | `false` | Сдвигать ли `Date.now()`. Включение может сломать сроки токенов и часы на сайтах. |
| `debug` | `false` | Логировать срабатывания в консоль (`[VPG]`). |

## Проверка работы

Откройте консоль DevTools на любой странице и выполните:

```js
document.hidden          // false
document.visibilityState // "visible"
document.hasFocus()      // true
```

Переключитесь на другую вкладку и вернитесь: значения не должны меняться. Для проверки телеметрии включите `debug: true` и смотрите сообщения `[VPG]`.

## Ограничения

Скрипт работает на уровне JavaScript-API страницы, поэтому:

- **Побочные эффекты:** видео не ставятся на паузу в фоне, чаты и игры ведут себя как в активной вкладке, возрастает расход батареи.
- **`blur` блокируется только на глобальных целях.** На элементах форм он нужен для валидации и автодополнения.
- **Фильтр по ключевым словам грубый:** возможны ложные срабатывания (например, URL со словом `focus`). Сужайте `telemetryPattern`.
- **Не покрыто:** `WebSocket`, тела запросов в `Blob`/`ArrayBuffer`/`Stream`, Web Workers, `new Date()`, `setTimeout`, Page Lifecycle API, `IntersectionObserver`, а также серверная аналитика.
- **Троттлинг браузера остаётся:** в фоне Chrome замедляет таймеры, а `requestAnimationFrame` не вызывается. Детектор, который считает тики, а не дельту времени, это увидит.
- **Подмена API обнаруживаема.** Скрипт не пытается быть незаметным для страниц.
- Скрипт **не заменяет** блокировщик трекеров. Для блокировки по доменам используйте [uBlock Origin](https://github.com/gorhill/uBlock).

## Ответственное использование

Проект создан для приватности и аудита. Не используйте его для обхода прокторинга, онлайн-экзаменов, проверок честности и других систем, правила которых запрещают скрывать активность. Ответственность за использование лежит на вас.

## Лицензия

[MIT](LICENSE)

---

# 🇬🇧 English

A Tampermonkey / Violentmonkey userscript that reduces the tab-visibility and focus signals exposed to web pages and stubs part of the visibility telemetry. Built as a **local privacy audit** tool.

> ⚠️ This is **not absolute protection** and is not intended for bypassing proctoring, exams, anti-fraud systems or platform rules. See [Limitations](#limitations).

## Features

| Module | Description |
|---|---|
| **State isolation** | `document.hidden` and `visibilityState` (plus `webkit` variants) always report an active tab; `document.hasFocus()` returns `true`. |
| **Event suppression** | Blocks listeners for `visibilitychange`, `pagehide`, `freeze`, `resume` on any `EventTarget`, and `blur` on `window`/`document`/`html`/`body`. Also neutralizes `onblur`, `onpagehide`, etc. |
| **Telemetry filter** | Intercepts `fetch`, `navigator.sendBeacon` and `XMLHttpRequest`. Requests matching analytics markers get a fake success response. |
| **Virtual clocks** | Smooths time deltas for `performance.now()`, `requestAnimationFrame` and `setInterval` after returning to the tab. |

## Installation

### 💻 Desktop (Chrome, Edge, Brave, Opera, Firefox)

1. Install a userscript manager: [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Open the raw script URL:
   `https://raw.githubusercontent.com/YOUR_USERNAME/visibility-privacy-guard/main/visibility-privacy-guard.user.js`
3. Click **Install** in the manager prompt.
4. **Chrome / Edge:** if scripts don't run, enable Developer mode on `chrome://extensions` (and allow user scripts in Tampermonkey's settings if the browser asks for it).
5. Reload open tabs.

Manual install: Tampermonkey → **Create a new script** → paste the file contents → **Ctrl+S**.

### 📱 Android

Mobile Chrome and most Chromium browsers for Android **don't support extensions**, so you need a browser that does:

1. Install **Firefox for Android** (or Firefox Nightly).
2. Menu → **Add-ons** → install **Tampermonkey** or **Violentmonkey**.
3. Open the raw script URL in Firefox and confirm the installation.

### 🍎 iOS

1. Install the **Userscripts** Safari extension from the App Store.
2. Enable it in *Settings → Safari → Extensions* and pick a scripts folder.
3. Put `visibility-privacy-guard.user.js` into that folder.

## Configuration

The `CONFIG` object at the top of the file:

| Option | Default | Purpose |
|---|---|---|
| `telemetryPattern` | `/visibility\|focus\|blur\|telemetry\|analytics\|tracking\|heartbeat\|presence/i` | Regex matched against request URL and body. |
| `fakeResponseBody` | `{"ok":true}` | Body of the fake response. |
| `patchDateNow` | `false` | Whether to shift `Date.now()`. May break token expiry and clocks on sites. |
| `debug` | `false` | Log stubbed requests and blocked listeners (`[VPG]`). |

## Verifying

Run this in DevTools on any page:

```js
document.hidden          // false
document.visibilityState // "visible"
document.hasFocus()      // true
```

Switch tabs and come back: the values must not change. Enable `debug: true` to see `[VPG]` log entries for telemetry.

## Limitations

The script works at the page's JavaScript API level, so:

- **Side effects:** background videos won't pause, chats and games behave as if the tab is active, battery use grows.
- **`blur` is blocked only on global targets.** Form elements need it for validation and autocomplete.
- **Keyword filtering is coarse:** false positives are possible (e.g. a URL containing `focus`). Narrow `telemetryPattern`.
- **Not covered:** `WebSocket`, request bodies in `Blob`/`ArrayBuffer`/`Stream`, Web Workers, `new Date()`, `setTimeout`, the Page Lifecycle API, `IntersectionObserver`, and server-side analytics.
- **Browser throttling remains:** Chrome slows timers in the background and doesn't fire `requestAnimationFrame`. A detector that counts ticks rather than time deltas will notice.
- **API overrides are detectable.** The script makes no attempt to be invisible to pages.
- It **does not replace** a tracker blocker. Use [uBlock Origin](https://github.com/gorhill/uBlock) for domain-level blocking.

## Responsible use

This project is for privacy and auditing. Do not use it to bypass proctoring, online exams, integrity checks or any system whose rules forbid hiding activity. You are responsible for how you use it.

## License

[MIT](LICENSE)
