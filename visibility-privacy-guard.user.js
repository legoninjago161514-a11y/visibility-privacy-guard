// ==UserScript==
// @name         Visibility Privacy Guard
// @namespace    local.privacy.audit
// @version      1.2.0
// @description  Фиксирует состояние активной вкладки, подавляет слушатели lifecycle-событий, глушит телеметрию (fetch/beacon/XHR), вводит виртуальные часы
// @match        *://*/*
// @run-at       document-start
// @grant        none
// @inject-into  page
// ==/UserScript==

(() => {
  'use strict';

  /* ───────── Конфигурация ───────── */
  const CONFIG = {
    // Эти события бывают только у window/document, поэтому блокируем на ЛЮБОМ EventTarget
    lifecycleEvents: new Set([
      'visibilitychange', 'webkitvisibilitychange', 'pagehide', 'freeze', 'resume',
    ]),
    // blur срабатывает и на элементах форм: блокируем только на глобальных целях
    focusEvents: new Set(['blur']),
    telemetryPattern: /visibility|focus|blur|telemetry|analytics|tracking|heartbeat|presence/i,
    fakeResponseBody: '{"ok":true}',
    patchDateNow: false, // true сдвигает Date.now() и ломает сроки токенов/часы на сайтах
    debug: false,
  };

  const log = (...a) => CONFIG.debug && console.debug('[VPG]', ...a);

  /* ───────── Утилиты ───────── */
  const nativeToString = Function.prototype.toString;
  const masked = new WeakMap();

  const mask = (fake, original, name = original.name) => {
    masked.set(fake, `function ${name}() { [native code] }`);
    return fake;
  };

  Function.prototype.toString = mask(function toString() {
    return masked.has(this) ? masked.get(this) : nativeToString.call(this);
  }, nativeToString, 'toString');

  const defineGetter = (obj, prop, value) => {
    const desc = Object.getOwnPropertyDescriptor(obj, prop);
    if (!desc) return;
    const getter = mask(() => value, desc.get || (() => {}), `get ${prop}`);
    Object.defineProperty(obj, prop, { configurable: true, enumerable: desc.enumerable, get: getter });
  };

  const isGlobalTarget = (t) =>
    t === window || t === document ||
    t === document.documentElement || t === document.body;

  const native = {
    addEventListener: EventTarget.prototype.addEventListener,
    hiddenGetter: Object.getOwnPropertyDescriptor(Document.prototype, 'hidden').get,
    perfNow: Performance.prototype.now,
    dateNow: Date.now,
    setInterval: window.setInterval,
    setTimeout: window.setTimeout,
    raf: window.requestAnimationFrame,
  };
  const realHidden = () => native.hiddenGetter.call(document);

  /* ───────── Модуль 1: изоляция состояния ───────── */
  const lockVisibility = () => {
    const proto = Document.prototype;
    defineGetter(proto, 'hidden', false);
    defineGetter(proto, 'visibilityState', 'visible');
    defineGetter(proto, 'webkitHidden', false);
    defineGetter(proto, 'webkitVisibilityState', 'visible');

    const origHasFocus = proto.hasFocus;
    proto.hasFocus = mask(function hasFocus() { return true; }, origHasFocus);
  };

  /* ───────── Модуль 2: подавление событий ───────── */
  const guardListeners = () => {
    const proto = EventTarget.prototype;
    const origAdd = native.addEventListener;

    const shouldBlock = (type, target) => {
      const t = String(type).toLowerCase();
      if (CONFIG.lifecycleEvents.has(t)) return true;
      return CONFIG.focusEvents.has(t) && isGlobalTarget(target);
    };

    proto.addEventListener = mask(function addEventListener(type, listener, options) {
      if (shouldBlock(type, this)) {
        log('blocked listener:', type);
        return;
      }
      return origAdd.call(this, type, listener, options);
    }, origAdd);

    // on* свойства
    const neutralize = (target, props) => props.forEach((p) => {
      try {
        Object.defineProperty(target, p, { configurable: true, get: () => null, set: () => {} });
      } catch (_) {}
    });
    neutralize(window, ['onblur', 'onpagehide', 'onfreeze', 'onresume']);
    neutralize(document, ['onvisibilitychange', 'onfreeze', 'onresume']);

    // Нативные события гасим первыми (capture), до любых чужих слушателей
    const all = [...CONFIG.lifecycleEvents, ...CONFIG.focusEvents];
    all.forEach((type) => {
      const stop = (e) => {
        if (CONFIG.lifecycleEvents.has(type) || isGlobalTarget(e.target)) {
          e.stopImmediatePropagation();
        }
      };
      origAdd.call(window, type, stop, true);
      origAdd.call(document, type, stop, true);
    });
  };

  /* ───────── Модуль 3: сетевой фильтр ───────── */
  const bodyToText = (body) => {
    if (typeof body === 'string') return body;
    if (body instanceof URLSearchParams) return body.toString();
    if (body instanceof FormData) {
      let s = '';
      for (const [k, v] of body) s += `${k}=${typeof v === 'string' ? v : ''}&`;
      return s;
    }
    return '';
  };

  const isTelemetry = (url, body) =>
    CONFIG.telemetryPattern.test(String(url)) ||
    CONFIG.telemetryPattern.test(bodyToText(body));

  const filterNetwork = () => {
    // fetch
    const origFetch = window.fetch;
    window.fetch = mask(function fetch(input, init) {
      try {
        const url = input instanceof Request ? input.url : input;
        if (isTelemetry(url, init && init.body)) {
          log('fetch stubbed:', url);
          return Promise.resolve(new Response(CONFIG.fakeResponseBody, {
            status: 200, headers: { 'Content-Type': 'application/json' },
          }));
        }
      } catch (_) {}
      return origFetch.apply(this, arguments);
    }, origFetch);

    // sendBeacon
    const origBeacon = Navigator.prototype.sendBeacon;
    Navigator.prototype.sendBeacon = mask(function sendBeacon(url, data) {
      try {
        if (isTelemetry(url, data)) {
          log('beacon stubbed:', url);
          return true;
        }
      } catch (_) {}
      return origBeacon.apply(this, arguments);
    }, origBeacon);

    // XMLHttpRequest
    const xhrProto = XMLHttpRequest.prototype;
    const origOpen = xhrProto.open;
    const origSend = xhrProto.send;
    const xhrMeta = new WeakMap();

    xhrProto.open = mask(function open(method, url, async) {
      try { xhrMeta.set(this, { url: String(url), async: async !== false }); } catch (_) {}
      return origOpen.apply(this, arguments);
    }, origOpen);

    const fakeXhrResponse = (xhr, async) => {
      const values = {
        readyState: 4, status: 200, statusText: 'OK',
        response: CONFIG.fakeResponseBody, responseText: CONFIG.fakeResponseBody, responseURL: '',
      };
      for (const [k, v] of Object.entries(values)) {
        try { Object.defineProperty(xhr, k, { configurable: true, get: () => v }); } catch (_) {}
      }
      const fire = () => ['readystatechange', 'load', 'loadend'].forEach((name) => {
        try {
          xhr.dispatchEvent(name === 'readystatechange' ? new Event(name) : new ProgressEvent(name));
        } catch (_) {}
      });
      if (async) native.setTimeout.call(window, fire, 0); else fire();
    };

    xhrProto.send = mask(function send(body) {
      try {
        const meta = xhrMeta.get(this);
        if (meta && isTelemetry(meta.url, body)) {
          log('xhr stubbed:', meta.url);
          fakeXhrResponse(this, meta.async);
          return;
        }
      } catch (_) {}
      return origSend.apply(this, arguments);
    }, origSend);
  };

  /* ───────── Модуль 4: виртуальные часы ───────── */
  const smoothTiming = () => {
    let hiddenTotal = 0;
    let hiddenSince = null;
    let credit = 0;
    let lastVirtual = 0;

    const rawNow = () => native.perfNow.call(performance);

    const syncState = () => {
      const t = rawNow();
      const h = realHidden();
      if (h && hiddenSince === null) hiddenSince = t;
      else if (!h && hiddenSince !== null) { hiddenTotal += t - hiddenSince; hiddenSince = null; }
      return t;
    };

    const offset = (t) => hiddenTotal + (hiddenSince !== null ? t - hiddenSince : 0) - credit;

    const virtualNow = () => {
      const t = syncState();
      const v = Math.max(t - offset(t), lastVirtual);
      lastVirtual = v;
      return v;
    };

    const addCredit = (ms) => {
      const t = syncState();
      if (hiddenSince === null) return;
      credit = Math.min(credit + ms, hiddenTotal + (t - hiddenSince));
    };

    native.addEventListener.call(document, 'visibilitychange', syncState, true);
    native.addEventListener.call(window, 'pagehide', syncState, true);
    syncState();

    Object.defineProperty(Performance.prototype, 'now', {
      configurable: true, writable: true, enumerable: true,
      value: mask(function now() { return virtualNow(); }, native.perfNow),
    });

    if (CONFIG.patchDateNow) {
      Date.now = mask(function now() {
        return native.dateNow.call(Date) - offset(syncState());
      }, native.dateNow);
    }

    window.setInterval = mask(function setInterval(handler, delay, ...args) {
      if (typeof handler !== 'function') return native.setInterval.apply(this, arguments);
      const d = Math.max(Number(delay) || 0, 0);
      return native.setInterval.call(this, function () {
        if (realHidden()) addCredit(d);
        return handler.apply(this, args);
      }, delay);
    }, native.setInterval);

    window.requestAnimationFrame = mask(function requestAnimationFrame(cb) {
      if (typeof cb !== 'function') return native.raf.apply(this, arguments);
      return native.raf.call(this, () => cb(virtualNow()));
    }, native.raf);
  };

  /* ───────── Запуск ───────── */
  smoothTiming();   // первым, чтобы его слушатель стоял раньше stop-слушателей
  lockVisibility();
  guardListeners();
  filterNetwork();
})();
