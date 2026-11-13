<div align="center">

# 🛡️ Visibility Privacy Guard

**Stop pages from watching when you switch tabs.**
A small userscript for people who'd rather not hand over their attention data.

[![Version](https://img.shields.io/badge/version-1.2.0-4c8bf5?style=for-the-badge)](#)
[![License: MIT](https://img.shields.io/badge/license-MIT-2ea44f?style=for-the-badge)](LICENSE)
[![Userscript](https://img.shields.io/badge/Tampermonkey-Violentmonkey-black?style=for-the-badge)](#-install)
[![Purpose](https://img.shields.io/badge/purpose-privacy%20audit-8957e5?style=for-the-badge)](#-what-this-is-and-what-it-isnt)
[![Not for](https://img.shields.io/badge/NOT%20for-bypassing%20proctoring-d73a4a?style=for-the-badge)](#-responsible-use)

**🇬🇧 English** · [🇷🇺 Русский](readme-ru.md)

</div>

> [!IMPORTANT]
> **This is a privacy tool, not a bypass tool.** It was built to audit and limit how much behavioral data pages collect about you. It is **not** designed, tested or supported for getting around exam proctoring, anti-cheat, integrity checks or any rule that says "keep this tab in focus". Please don't use it that way. [More below.](#-responsible-use)

---

## 📖 Contents

[Why it exists](#-why-it-exists) · [What it does](#-what-it-does) · [What this is and what it isn't](#-what-this-is-and-what-it-isnt) · [Install](#-install) · [Configure](#-configure) · [Check it works](#-check-it-works) · [Limitations](#-limitations) · [FAQ](#-faq) · [Responsible use](#-responsible-use)

---

## 🔍 Why it exists

Open a tab, switch away, come back. To you that's nothing. To a page, it's a signal: `document.hidden` flips, `visibilitychange` fires, a `blur` event goes out, and a beacon quietly reports how long you were gone.

Multiply that by every site you visit and you get a detailed picture of your habits, built without you ever clicking anything. This script closes that particular leak and lets you see what a page tries to do with it.

## ⚙️ What it does

| | Module | What happens |
|---|---|---|
| 🔒 | **State isolation** | `document.hidden` and `visibilityState` (plus the `webkit` twins) always say "active". `document.hasFocus()` returns `true`. |
| 🔇 | **Event suppression** | Listeners for `visibilitychange`, `pagehide`, `freeze` and `resume` are dropped on any `EventTarget`. `blur` is dropped on `window`, `document`, `<html>` and `<body>`. The `on…` properties are neutralized too. |
| 📡 | **Telemetry filter** | `fetch`, `sendBeacon` and `XMLHttpRequest` calls that match analytics markers get a fake "everything's fine" response, so trackers don't see failed requests. |
| ⏱️ | **Virtual clocks** | `performance.now()`, `requestAnimationFrame` and `setInterval` get smoothed so a long pause doesn't show up as a huge time gap when you return. |

All of it runs at `document-start`, in plain JavaScript, with zero dependencies.

## 🧭 What this is and what it isn't

| ✅ It is | ❌ It is not |
|---|---|
| A **privacy** tool that limits tab-activity tracking | An exam or proctoring bypass |
| A way to **audit** what a page does with visibility signals | A way to hide activity from platforms that forbid it |
| A readable, hackable example of API-level hardening | A stealth tool: it makes no attempt to hide itself from pages |
| A complement to a tracker blocker | A replacement for uBlock Origin or similar |

## 📥 Install

<details open>
<summary><b>💻 Desktop: Chrome, Edge, Brave, Opera, Firefox</b></summary>

1. Install a userscript manager: [Tampermonkey](https://www.tampermonkey.net/) or the open-source [Violentmonkey](https://violentmonkey.github.io/).
2. Open the raw script:
   **`https://raw.githubusercontent.com/legoninjago161514-a11y/visibility-privacy-guard/main/visibility-privacy-guard.user.js`**
3. Your manager shows an install page. Hit **Install**.
4. On Chrome or Edge, if scripts don't run, turn on Developer mode at `chrome://extensions` and allow user scripts in the extension's settings.
5. Reload your open tabs.

Prefer doing it by hand? Tampermonkey → **Create a new script** → paste the file → **Ctrl+S**.

</details>

<details>
<summary><b>📱 Android</b></summary>

Chrome for Android and most Chromium-based mobile browsers don't support extensions, so you need one that does:

1. Install **Firefox for Android** (Nightly works too).
2. Menu → **Add-ons** → install **Tampermonkey** or **Violentmonkey**.
3. Open the raw script link in Firefox and confirm.

</details>

<details>
<summary><b>🍎 iOS</b></summary>

1. Get the **Userscripts** Safari extension from the App Store.
2. Enable it under *Settings → Safari → Extensions* and pick a folder for your scripts.
3. Drop `visibility-privacy-guard.user.js` into that folder.

</details>

## 🎛️ Configure

Everything lives in the `CONFIG` object at the top of the file.

| Option | Default | What it does |
|---|---|---|
| `telemetryPattern` | `/visibility\|focus\|blur\|telemetry\|analytics\|tracking\|heartbeat\|presence/i` | Regex tested against request URLs and bodies. |
| `fakeResponseBody` | `{"ok":true}` | What stubbed requests get back. |
| `patchDateNow` | `false` | Also shifts `Date.now()`. Leave it off unless you know why: it can break token expiry and clocks. |
| `debug` | `false` | Prints every blocked listener and stubbed request as `[VPG]` in the console. |

A site misbehaving? Set `debug: true`, reload, and watch the console. Most of the time the culprit is a keyword in `telemetryPattern` matching a harmless URL.

## ✅ Check it works

Paste this into DevTools on any page:

```js
document.hidden          // false
document.visibilityState // "visible"
document.hasFocus()      // true
```

Now switch to another tab and come back. Nothing should change. Turn on `debug` to see telemetry getting stubbed in real time.

## ⚠️ Limitations

No script that lives inside the page can promise total protection, and this one doesn't try to.

- **Side effects are real.** Background videos won't pause, chats and games act like you never left, and your battery pays for it.
- **`blur` is blocked only on global targets.** On form fields it drives validation and autocomplete, so breaking it would break the web.
- **The keyword filter is blunt.** A URL containing `focus` will get stubbed. Tighten `telemetryPattern` if that bites you.
- **Not covered:** `WebSocket`, request bodies sent as `Blob`/`ArrayBuffer`/`Stream`, Web Workers, `new Date()`, `setTimeout`, the Page Lifecycle API, `IntersectionObserver`, and anything that happens on the server.
- **Browser throttling still happens.** Chrome slows background timers and stops `requestAnimationFrame`. A detector that counts ticks instead of measuring time deltas will still notice.
- **The overrides are detectable.** That's by design: this project aims at privacy, not at being invisible.

## ❓ FAQ

**Will this help me get through an online exam?**
No, and please don't try. Proctoring platforms forbid hiding your activity, they have other ways to detect it, and this script isn't built or tested for that. The consequences land on you.

**Is it a stealth or anti-detection tool?**
No. It doesn't try to hide itself from pages, and there are no plans to add features aimed at that.

**Does it replace uBlock Origin?**
No. uBlock blocks at the network level, by domain. This script works on the page's own APIs. They complement each other.

**A site broke after installing. What now?**
Set `debug: true`, reload, and see which listener or request was stubbed. Narrow `telemetryPattern` or disable the script for that site in your manager.

**Why is my laptop battery draining faster?**
Pages think the tab is always active, so they never throttle their own background work. Switch the script off for sites you leave open all day.

## 🤝 Responsible use

Visibility Privacy Guard exists so you can reduce how much a page learns about your habits and audit what it tries to collect. That's the whole point.

It is **not** meant for:

- bypassing exam proctoring or online testing platforms,
- defeating anti-cheat or anti-fraud systems,
- hiding activity where a platform's rules require it to be visible,
- anything else that breaks the terms you agreed to.

If the rules of a site or an exam say "stay on this tab", stay on this tab. Responsibility for how the script gets used sits with you.

## 🧪 Contributing

Issues and PRs are welcome, especially for false positives in the telemetry filter and for new limitations worth documenting. Changes aimed at making the script undetectable by pages, or at helping bypass proctoring, will be declined.

## 📄 License

[MIT](LICENSE). Use it, fork it, improve it, and use it responsibly.