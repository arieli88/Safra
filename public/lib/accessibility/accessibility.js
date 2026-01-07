/* accessibility.js - final fixes with Clean Google Translate & Manual Dict */

/* config */
const ACC_KEY = "accessibility_v4_settings";
const TEXT_STEP = 0.10;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.0;
const SAT_ORDER = ["normal", "grayscale", "low", "high"];
const CURSOR_ORDER = ["normal", "2x", "3x"];
const DYSLEXIC_FONT_URL = "https://cdn.jsdelivr.net/gh/antijingoist/OpenDyslexic@latest/fonts/OpenDyslexic3-Regular.ttf";

/* Manual Translation Dictionary */
const I18N_DICT = {
  "lesson_wind": {
    "he": "משב רוח",
    "en": "Mashav Ruach",
    "ru": "Машав Руах",
    // Add other languages if needed, fallback will be Hebrew or Google's output
  }
};

(function () {
  "use strict";
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
  else main();

  function main() {
    // Inject dyslexic font (once)
    injectDyslexicFont();

// --------------------------------------------------------
    // TIKUN: Push Navbar Down when Translated
    // --------------------------------------------------------
    function fixGoogleTranslateLayout() {
      const style = document.createElement("style");
      style.id = "gt-layout-fix";
      style.innerHTML = `
        /* 1. דוחף את הגוף למטה ב-50 פיקסלים כשהתרגום פעיל */
        .translated-ltr body, .translated-rtl body {
            top: 50px !important;
        }

        /* 2. מזיז את ה-NAVBAR למטה. 
           הוספתי פה את הסלקטורים הנפוצים, אם ה-Navbar שלך משתמש ב-ID אחר, שנה את #navbar 
        */
        .translated-ltr #navbar, .translated-rtl #navbar, 
        .translated-ltr nav, .translated-rtl nav,
        .translated-ltr header, .translated-rtl header,
        .translated-ltr .navbar, .translated-rtl .navbar {
            top: 50px !important;
            transition: top 0.3s ease; /* אנימציה חלקה */
        }

        /* תיקון לפס של גוגל שייראה מסודר למעלה */
        .goog-te-banner-frame {
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            z-index: 100000 !important;
        }
      `;
      document.head.appendChild(style);
    }
    fixGoogleTranslateLayout(); // הפעלה

    // inject svg filters (kept for possible future usage)
    injectSVGDefs();

    // build root
    const root = document.createElement("div");
    root.id = "accessibility-root";
    document.body.appendChild(root);

    root.innerHTML = buildMarkup();

    const panel = root.querySelector(".acc-panel");
    const fab = root.querySelector(".acc-fab");
    const closeBtn = root.querySelector(".acc-close");
    const resetBtn = root.querySelector(".acc-reset");
    const controls = Array.from(root.querySelectorAll("[data-action]"));
    const langSelect = root.querySelector("#acc-lang");
    const translateBtn = root.querySelector("#acc-gt-btn");
    const ttsStart = root.querySelector("#acc-tts-start");
    const ttsPause = root.querySelector("#acc-tts-pause");
    const ttsStop = root.querySelector("#acc-tts-stop");

    // initial state (load if exists)
    const state = {
      scale: 1.0,
      dyslexic: false,
      cursor: "normal",
      strongFocus: false,
      darkMode: false,
      highlightLinks: false,
      pauseAnimations: false,
      lineSpacing: false,
      saturation: "normal",
      lang: document.documentElement.lang || "he"
    };
    loadState(state);

    // capture original font sizes for px-based elements
    captureOriginalFontSizes();

    // apply loaded state
    applyState();

    // Apply language from state immediately if saved
    if (state.lang && state.lang !== "he") {
      // Small delay to ensure Google Translate script availability if cached
      setTimeout(() => translatePage(state.lang), 500);
    } else {
      // Even if Hebrew, ensure manual terms are correct
      applyManualTranslations("he");
    }

    // event listeners
    fab.addEventListener("click", togglePanel);
    closeBtn.addEventListener("click", closePanel);
    resetBtn.addEventListener("click", doReset);

    controls.forEach(c => {
      c.addEventListener("click", (e) => {
        const action = c.getAttribute("data-action");
        handleAction(action, c);
      });
      c.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); c.click(); }
      });
    });

    langSelect.value = state.lang || "he";
    langSelect.addEventListener("change", () => {
      // Just update UI, button click triggers action
    });

    // Translate button click
    translateBtn.addEventListener("click", () => {
      const lang = langSelect.value;
      translatePage(lang);
    });

    // TTS
    ttsStart.addEventListener("click", startTTS);
    ttsPause.addEventListener("click", pauseResumeTTS);
    ttsStop.addEventListener("click", stopTTS);

    // Close panel on outside click
    document.addEventListener("click", (e) => {
      if (!panel.classList.contains("open")) return;
      const path = e.composedPath?.() || (e.path || []);
      if (path.includes(panel) || path.includes(fab) || panel.contains(e.target) || fab.contains(e.target)) return;
      closePanel();
    });

    // handle actions
    function handleAction(action, el) {
      switch (action) {
        case "text-increase": incText(); break;
        case "text-decrease": decText(); break;
        case "dyslexic-toggle": toggleDyslexic(el); break;
        case "cursor-cycle": cycleCursor(el); break;
        case "strong-focus-toggle": toggleStrongFocus(el); break;
        case "darkmode-toggle": toggleDarkMode(el); break;
        case "highlight-links-toggle": toggleHighlightLinks(el); break;
        case "pause-animations-toggle": togglePauseAnimations(el); break;
        case "line-spacing-toggle": toggleLineSpacing(el); break;
        case "saturation-cycle": cycleSaturation(el); break;
        default: break;
      }
    }

    /* ---------------- Text scale ---------------- */
    function captureOriginalFontSizes() {
      const sel = "p,li,span,a,h1,h2,h3,h4,h5,h6,button,label,strong,em,td,th,small";
      document.querySelectorAll(sel).forEach(n => {
        if (n.closest && n.closest("#accessibility-root")) return;
        if (n.hasAttribute("data-acc-orig-fontsize")) return;
        const cs = getComputedStyle(n);
        const f = cs.fontSize;
        if (f && f.endsWith("px")) {
          n.setAttribute("data-acc-orig-fontsize", parseFloat(f).toString());
        }
      });
      const html = document.documentElement;
      if (!html.hasAttribute("data-acc-root-fontsize")) {
        const rootSize = parseFloat(getComputedStyle(html).fontSize) || 16;
        html.setAttribute("data-acc-root-fontsize", rootSize.toString());
      }
    }

    function applyScaleToAll() {
      const html = document.documentElement;
      const rootOrig = parseFloat(html.getAttribute("data-acc-root-fontsize")) || parseFloat(getComputedStyle(html).fontSize) || 16;
      html.style.fontSize = (rootOrig * state.scale) + "px";
      document.querySelectorAll("[data-acc-orig-fontsize]").forEach(n => {
        if (n.closest && n.closest("#accessibility-root")) return;
        const orig = parseFloat(n.getAttribute("data-acc-orig-fontsize"));
        if (!isNaN(orig)) n.style.fontSize = (orig * state.scale) + "px";
      });
      announce(`גודל טקסט: ${Math.round(state.scale * 100)}%`);
      saveState();
    }
    function incText() { state.scale = Math.min(MAX_SCALE, +(state.scale + TEXT_STEP).toFixed(2)); applyScaleToAll(); }
    function decText() { state.scale = Math.max(MIN_SCALE, +(state.scale - TEXT_STEP).toFixed(2)); applyScaleToAll(); }

    /* ---------------- Dyslexic ---------------- */
    function toggleDyslexic(el) {
      state.dyslexic = !state.dyslexic;
      document.documentElement.classList.toggle("acc-dyslexic", state.dyslexic);
      document.body.classList.toggle("acc-dyslexic", state.dyslexic);
      if (el) el.setAttribute("aria-checked", String(state.dyslexic));
      announce(state.dyslexic ? "Dyslexic font enabled" : "Dyslexic font disabled");
      saveState();
    }

    function injectDyslexicFont() {
      if (document.getElementById("acc-dyslexic-font")) return;
      const style = document.createElement("style");
      style.id = "acc-dyslexic-font";
      style.innerHTML = `
        @font-face {
          font-family: "OpenDyslexic";
          src: url("${DYSLEXIC_FONT_URL}") format("truetype");
          font-weight: normal; font-style: normal; font-display: swap;
        }
      `;
      document.head.appendChild(style);
    }

    /* ---------------- Cursor cycle ---------------- */
    function cycleCursor(el) {
      const idx = CURSOR_ORDER.indexOf(state.cursor);
      const next = CURSOR_ORDER[(idx + 1) % CURSOR_ORDER.length];
      state.cursor = next;
      document.documentElement.classList.remove("acc-cursor-2x", "acc-cursor-3x");
      if (next === "2x") document.documentElement.classList.add("acc-cursor-2x");
      if (next === "3x") document.documentElement.classList.add("acc-cursor-3x");
      announce(`Cursor: ${next}`);
      saveState();
    }

    /* ---------------- Strong focus ---------------- */
    function toggleStrongFocus(el) {
      state.strongFocus = !state.strongFocus;
      document.documentElement.classList.toggle("acc-strong-focus", state.strongFocus);
      if (el) el.setAttribute("aria-checked", String(state.strongFocus));
      announce(state.strongFocus ? "Strong focus enabled" : "Strong focus disabled");
      saveState();
    }

    /* ---------------- Dark mode ---------------- */
    function toggleDarkMode(el) {
      state.darkMode = !state.darkMode;
      document.documentElement.classList.toggle("acc-dark-mode", state.darkMode);
      document.body.classList.toggle("acc-dark-mode", state.darkMode);
      if (el) el.setAttribute("aria-checked", String(state.darkMode));

      // icon swap
      const logoImg = document.querySelector("#navbar nav .logo a img");
      if (logoImg) logoImg.src = state.darkMode ? "/favicon-Dark.png" : "/favicon.png";

      announce(state.darkMode ? "Dark mode enabled" : "Dark mode disabled");
      saveState();
    }

    /* ---------------- Highlight links ---------------- */
    function toggleHighlightLinks(el) {
      state.highlightLinks = !state.highlightLinks;
      document.documentElement.classList.toggle("acc-highlight-links", state.highlightLinks);
      document.body.classList.toggle("acc-highlight-links", state.highlightLinks);
      if (el) el.setAttribute("aria-checked", String(state.highlightLinks));
      announce(state.highlightLinks ? "Links highlighted" : "Links reset");
      saveState();
    }

    /* ---------------- Pause animations ---------------- */
    function togglePauseAnimations(el) {
      state.pauseAnimations = !state.pauseAnimations;
      document.documentElement.classList.toggle("acc-pause-animations", state.pauseAnimations);
      if (state.pauseAnimations) {
        if (!document.getElementById("acc-pause-style")) {
          const st = document.createElement("style");
          st.id = "acc-pause-style";
          st.innerHTML = `
            *, *::before, *::after {
              animation-play-state: paused !important;
              transition-duration: 0s !important;
              transition-delay: 0s !important;
            }
          `;
          document.head.appendChild(st);
        }
      } else {
        const s = document.getElementById("acc-pause-style");
        if (s) s.remove();
      }
      if (el) el.setAttribute("aria-checked", String(state.pauseAnimations));
      announce(state.pauseAnimations ? "Animations paused" : "Animations resumed");
      saveState();
    }

    /* ---------------- Line spacing ---------------- */
    function toggleLineSpacing(el) {
      state.lineSpacing = !state.lineSpacing;
      document.documentElement.classList.toggle("acc-line-spacing", state.lineSpacing);
      if (el) el.setAttribute("aria-checked", String(state.lineSpacing));
      announce(state.lineSpacing ? "Line spacing increased" : "Line spacing reset");
      saveState();
    }

    /* ---------------- Saturation cycle ---------------- */
    function cycleSaturation(el) {
      const idx = SAT_ORDER.indexOf(state.saturation || "normal");
      const next = SAT_ORDER[(idx + 1) % SAT_ORDER.length];
      state.saturation = next;
      if (next === "normal") document.documentElement.removeAttribute("data-sat");
      else if (next === "grayscale") document.documentElement.setAttribute("data-sat", "grayscale");
      else if (next === "low") document.documentElement.setAttribute("data-sat", "low");
      else if (next === "high") document.documentElement.setAttribute("data-sat", "high");
      announce(`Color mode: ${next}`);
      saveState();
      if (el) el.setAttribute("aria-label", `Color ${next}`);
    }

    /* ========================================================== */
    /* GOOGLE TRANSLATE & MANUAL OVERRIDES            */
    /* ========================================================== */
    let gtReady = false;

    // 1. Define Init Function globally
    window.googleTranslateElementInit = function () {
      gtReady = true;
      let el = document.getElementById("google_translate_element");
      if (!el) {
        el = document.createElement("div");
        el.id = "google_translate_element";
        el.style.display = "none";
        document.body.appendChild(el);
      }
      new google.translate.TranslateElement(
        {
          pageLanguage: "he",
          includedLanguages: "he,en,ar,ru,fr,de,es",
          autoDisplay: false
        },
        "google_translate_element"
      );
    };

    // 2. Load Script Once
    function loadGoogleTranslateOnce() {
      if (gtReady || document.getElementById("gt-script")) return;
      const s = document.createElement("script");
      s.id = "gt-script";
      s.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      s.async = true;
      document.body.appendChild(s);
    }

    // 3. Main Translate Logic
    function translatePage(lang) {
      // Logic for Hebrew (Reset)
      if (lang === "he") {
        const combo = document.querySelector(".goog-te-combo");
        if (combo && combo.value !== "he" && combo.value !== "iw") {
            // Attempt to switch back to Hebrew/Auto via Google
            combo.value = "iw"; // Google uses 'iw' for Hebrew often
            combo.dispatchEvent(new Event("change"));
        }
        document.documentElement.lang = "he";
        document.documentElement.dir = "rtl";
        state.lang = "he";
        saveState();
        applyManualTranslations("he");
        // Force reload if we want to clear artifacts perfectly, but trying simple way first
        return;
      }

      // Logic for Foreign Languages
      if (!gtReady) {
        loadGoogleTranslateOnce();
        setTimeout(() => translatePage(lang), 600);
        return;
      }

      const combo = document.querySelector(".goog-te-combo");
      if (!combo) {
          // Retry if script loaded but DOM not fully ready
          setTimeout(() => translatePage(lang), 300);
          return;
      }

      // Set Google Translate value
      combo.value = lang;
      combo.dispatchEvent(new Event("change"));

      // Update Page Attributes
      document.documentElement.lang = lang;
      document.documentElement.dir = (lang === "ar") ? "rtl" : "ltr";
      state.lang = lang;
      saveState();

      // Apply Manual Translations (Wait briefly for GT to render, then override)
      setTimeout(() => {
        applyManualTranslations(lang);
      }, 1000); 
      // Reinforce again later in case network was slow
      setTimeout(() => {
        applyManualTranslations(lang);
      }, 3000);
    }

    // 4. Apply Manual Dictionary
    function applyManualTranslations(lang) {
      // Find all elements with data-i18n attribute
      const elements = document.querySelectorAll("[data-i18n]");
      elements.forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (I18N_DICT[key]) {
           // Get translation or fallback to Hebrew
           let txt = I18N_DICT[key][lang] || I18N_DICT[key]["he"];
           // If English is requested but not found, check if exists in dict, else leave as is
           if (txt) {
             // For input/placeholder
             if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
               el.placeholder = txt;
             } else {
               // Normal text
               el.innerText = txt;
             }
             // Mark as manually translated to prevent GT from overwriting (optional technique)
             el.classList.add("notranslate"); 
           }
        }
      });
    }

    /* ---------------- TTS ---------------- */
    // TTS should read the content *after* translation
    function startTTS() {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.resume();
        return;
    }
    // שליפת הטקסט מהדף (ניקוי תפריט הנגישות מההקראה)
    const textContent = document.body.innerText.replace(/נגישות[\s\S]*⏹/g, "");
    const utterance = new SpeechSynthesisUtterance(textContent);
    // זיהוי השפה הנבחרת מה-Select
    const selectedLang = document.getElementById("acc-lang").value;
    // מיפוי קודי שפה של גוגל לקודי שפה של TTS דפדפן
    const langMap = {
        "he": "he-IL",
        "en": "en-US",
        "ru": "ru-RU",
        "fr": "fr-FR",
        "es": "es-ES",
        "de": "de-DE",
        "ar": "ar-SA"
    };
    utterance.lang = langMap[selectedLang] || selectedLang;
    // אופציונלי: התאמת קצב דיבור
    utterance.rate = 1.0; 
    window.speechSynthesis.speak(utterance);
} 

    function pauseResumeTTS() {
       if (window.speechSynthesis.paused) window.speechSynthesis.resume();
       else window.speechSynthesis.pause();
    }

    function stopTTS() {
      window.speechSynthesis.cancel();
    }


    /* ---------------- panel control ---------------- */
    function togglePanel() {
      const open = panel.classList.toggle("open");
      fab.setAttribute("aria-expanded", String(open));
      panel.setAttribute("aria-hidden", String(!open));
      if (open) { setTimeout(()=>{ const first = panel.querySelector(".acc-tile"); if (first) first.focus(); }, 80); }
    }
    function closePanel() { panel.classList.remove("open"); fab.setAttribute("aria-expanded","false"); panel.setAttribute("aria-hidden","true"); fab.focus(); }

    /* ---------------- Reset ---------------- */
    function doReset() {
      document.querySelectorAll("[data-acc-orig-fontsize]").forEach(n => {
        const orig = n.getAttribute("data-acc-orig-fontsize");
        if (orig) n.style.fontSize = orig + "px";
        else n.style.fontSize = "";
        n.removeAttribute("data-acc-orig-fontsize");
      });
      const html = document.documentElement;
      if (html.hasAttribute("data-acc-root-fontsize")) {
        html.style.fontSize = html.getAttribute("data-acc-root-fontsize") + "px";
        html.removeAttribute("data-acc-root-fontsize");
      } else html.style.fontSize = "";

      html.classList.remove("acc-dyslexic","acc-cursor-2x","acc-cursor-3x","acc-strong-focus","acc-dark-mode",
        "acc-highlight-links","acc-pause-animations","acc-line-spacing");
      document.body.classList.remove("acc-dyslexic","acc-dark-mode","acc-highlight-links");
      html.removeAttribute("data-sat");

      const ps = document.getElementById("acc-pause-style"); if (ps) ps.remove();

      if (window.speechSynthesis) window.speechSynthesis.cancel();

      localStorage.removeItem(ACC_KEY);

      announce("איפוס הושלם — הדף ייטען מחדש");
      setTimeout(() => location.reload(), 700);
    }

    /* ---------------- persistence ---------------- */
    function saveState() {
      try { localStorage.setItem(ACC_KEY, JSON.stringify(state)); } catch (e) { console.warn("saveState err", e); }
    }
    function loadState(obj) {
      try {
        const raw = localStorage.getItem(ACC_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        Object.assign(obj, saved);
      } catch (e) { console.warn("loadState err", e); }
    }

    /* ---------------- apply loaded state ---------------- */
    function applyState() {
      if (state.scale && state.scale !== 1.0) applyScaleToAll();
      if (state.dyslexic) document.documentElement.classList.add("acc-dyslexic"), document.body.classList.add("acc-dyslexic");
      if (state.cursor === "2x") document.documentElement.classList.add("acc-cursor-2x");
      if (state.cursor === "3x") document.documentElement.classList.add("acc-cursor-3x");
      if (state.strongFocus) document.documentElement.classList.add("acc-strong-focus");
      if (state.darkMode) document.documentElement.classList.add("acc-dark-mode"), document.body.classList.add("acc-dark-mode");
      if (state.highlightLinks) document.documentElement.classList.add("acc-highlight-links"), document.body.classList.add("acc-highlight-links");
      if (state.pauseAnimations) {
        if (!document.getElementById("acc-pause-style")) {
          const st = document.createElement("style"); st.id = "acc-pause-style";
          st.innerHTML = `* { animation-play-state: paused !important; transition-duration: 0s !important; }`;
          document.head.appendChild(st);
        }
      }
      if (state.lineSpacing) document.documentElement.classList.add("acc-line-spacing");
      if (state.saturation && state.saturation !== "normal") document.documentElement.setAttribute("data-sat", state.saturation);
      // Lang is handled in main via translatePage now
    }

    /* ---------------- announce to SR ---------------- */
    function announce(text) {
      let live = document.getElementById("acc-live");
      if (!live) {
        live = document.createElement("div"); live.id = "acc-live"; live.className = "sr-only";
        live.setAttribute("aria-live", "polite"); document.body.appendChild(live);
      }
      live.textContent = text;
      setTimeout(()=>{ if (live) live.textContent = ""; }, 1600);
    }

    // helper to build markup string
    function buildMarkup() {
      return `
        <div class="acc-panel" role="dialog" aria-modal="false" aria-hidden="true">
          <div class="acc-header">
            <div class="acc-title">נגישות / Accessibility</div>
            <div style="display:flex;gap:8px;">
              <button class="acc-reset" title="איפוס" aria-label="איפוס">איפוס</button>
              <button class="acc-close" aria-label="סגור">✕</button>
            </div>
          </div>

          <div class="acc-controls" role="group" aria-label="Controls">
            <div class="acc-tile" data-action="text-decrease" tabindex="0"><div class="icon">A-</div><div class="meta"><div class="label">הקטן טקסט</div><div class="small">-10% כל לחיצה</div></div></div>
            <div class="acc-tile" data-action="text-increase" tabindex="0"><div class="icon">A+</div><div class="meta"><div class="label">הגדל טקסט</div><div class="small">+10% כל לחיצה</div></div></div>
            <div class="acc-tile" data-action="dyslexic-toggle" tabindex="0" role="switch" aria-checked="false"><div class="icon">𝓓</div><div class="meta"><div class="label">Dyslexia Font</div><div class="small">OpenDyslexic</div></div></div>
            <div class="acc-tile" data-action="cursor-cycle" tabindex="0"><div class="icon">🖱️</div><div class="meta"><div class="label">Cursor Size</div><div class="small">רגיל → 2x → 3x</div></div></div>
            <div class="acc-tile" data-action="strong-focus-toggle" tabindex="0" role="switch" aria-checked="false"><div class="icon">⌁</div><div class="meta"><div class="label">Strong Focus</div><div class="small">פוקוס חזק בכל הדף</div></div></div>
            <div class="acc-tile" data-action="darkmode-toggle" tabindex="0" role="switch" aria-checked="false"><div class="icon">🌙</div><div class="meta"><div class="label">Dark Mode</div><div class="small">כהה רך</div></div></div>
            <div class="acc-tile" data-action="highlight-links-toggle" tabindex="0" role="switch" aria-checked="false"><div class="icon">🔗</div><div class="meta"><div class="label">Highlight Links</div><div class="small">הדגש קישורים</div></div></div>
            <div class="acc-tile" data-action="pause-animations-toggle" tabindex="0" role="switch" aria-checked="false"><div class="icon">⏸</div><div class="meta"><div class="label">Pause Animations</div><div class="small">עצור אנימציות</div></div></div>
            <div class="acc-tile" data-action="line-spacing-toggle" tabindex="0" role="switch" aria-checked="false"><div class="icon">↕︎</div><div class="meta"><div class="label">Line Spacing</div><div class="small">הגדל ריווח</div></div></div>
            <div class="acc-tile" data-action="saturation-cycle" tabindex="0"><div class="icon">🎛️</div><div class="meta"><div class="label">Color Saturation</div><div class="small">Cycle: normal→gray→low→high</div></div></div>

            <div class="acc-tile acc-row" style="align-items:center">
              <select id="acc-lang" aria-label="שפה" style="flex:1;padding:8px;border-radius:8px;">
                <option value="he">עברית</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
                <option value="de">Deutsch</option>
                <option value="ar">العربية</option>
                <option value="ru">Русский</option>
              </select>
              <button class="btn" id="acc-gt-btn" style="margin-left:8px;padding:8px;border-radius:8px;">תרגם</button>
            </div>

            <div class="acc-tile acc-row" style="gap:6px;">
              <button id="acc-tts-start" class="btn">▶</button>
              <button id="acc-tts-pause" class="btn">⏸</button>
              <button id="acc-tts-stop" class="btn">⏹</button>
              <div style="flex:1"></div>
            </div>

          </div>
        </div>

        <button class="acc-fab" aria-haspopup="dialog" aria-controls="acc-panel" aria-expanded="false" aria-label="פתיחת תפריט נגישות">נגישות</button>
      `;
    }

    /* ---------------- helpers: SVG defs ---------------- */
    function injectSVGDefs() {
      if (document.getElementById("acc-svg-defs")) return;
      const div = document.createElement("div"); div.id = "acc-svg-defs"; div.style.display = "none";
      div.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg"><defs>
        <filter id="cb-deuteranopia"><feColorMatrix type="matrix" values="0.625,0.7,0,0,0 0.7,0.625,0,0,0 0,0,1,0,0 0,0,0,1,0"/></filter>
        <filter id="cb-protanopia"><feColorMatrix type="matrix" values="0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0"/></filter>
        <filter id="cb-tritanopia"><feColorMatrix type="matrix" values="0.95,0.05,0,0,0 0,0.433,0.567,0,0 0,0.475,0.525,0,0 0,0,0,1,0"/></filter>
      </defs></svg>`;
      document.body.appendChild(div);
    }

  } // end main
})(); // end IIFE