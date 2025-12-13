/* accessibility.js - final fixes */

/* config */
const ACC_KEY = "accessibility_v4_settings";
const TEXT_STEP = 0.10;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.0;
const SAT_ORDER = ["normal", "grayscale", "low", "high"];
const CURSOR_ORDER = ["normal", "2x", "3x"];
const DYSLEXIC_FONT_URL = "https://cdn.jsdelivr.net/gh/antijingoist/OpenDyslexic@latest/fonts/OpenDyslexic3-Regular.ttf";

(function () {
  "use strict";
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main);
  else main();

  function main() {
    // Inject dyslexic font (once)
    injectDyslexicFont();

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

    // capture original font sizes for px-based elements (store as data-acc-orig-fontsize)
    captureOriginalFontSizes();

    // apply loaded state
    applyState();

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

    langSelect.value = state.lang || document.documentElement.lang || "he";
    langSelect.addEventListener("change", () => {
      const val = langSelect.value;
      state.lang = val;
      applyLanguage(val);
      saveState();
    });

    // Translate button: load google script dynamically if needed and apply translation
    translateBtn.addEventListener("click", () => {
      const target = langSelect.value;
      ensureGoogleTranslateLoaded().then(() => {
        // if google loaded, apply using combo
        applyGoogleTranslate(target);
      }).catch(err => {
        announce("לא ניתן לטעון את Google Translate: " + (err && err.message ? err.message : ""));
        console.warn("GT load error", err);
      });
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
      // target elements likely to contain text
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
      // store root original font-size
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

  // שינוי האייקון בלוגו
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

      // תופס הכל כולל ::before ::after
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

    /* ---------------- Google Translate dynamic loader ---------------- */
    let googleLoading = false;
    function ensureGoogleTranslateLoaded() {
      return new Promise((resolve, reject) => {
        if (window.google && window.google.translate && window.google.translate.TranslateElement) return resolve();
        if (googleLoading) {
          // poll until available
          const tries = {n:0};
          const poll = setInterval(() => {
            tries.n++;
            if (window.google && window.google.translate && window.google.translate.TranslateElement) {
              clearInterval(poll); resolve();
            } else if (tries.n > 20) { clearInterval(poll); reject(new Error("timeout")); }
          }, 300);
          return;
        }
        googleLoading = true;
        // define callback
        window.googleTranslateInit = function () {
          try {
            // create element container (hidden)
            let el = document.getElementById("google_translate_element");
            if (!el) {
              el = document.createElement("div");
              el.id = "google_translate_element";
              el.style.display = "none";
              document.body.appendChild(el);
            }
            new window.google.translate.TranslateElement({
              pageLanguage: (document.documentElement.lang || 'auto'),
              includedLanguages: 'en,fr,es,de,ru,ar,zh-CN,pt,it,he',
              layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
              autoDisplay: false
            }, 'google_translate_element');
            googleLoading = false;
            resolve();
          } catch (e) {
            googleLoading = false;
            reject(e);
          }
        };
        // inject script
        const s = document.createElement("script");
        s.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateInit";
        s.async = true;
        s.onerror = () => reject(new Error("failed to load google translate script"));
        document.head.appendChild(s);
      });
    }

    function applyGoogleTranslate(targetLang) {
      // attempt to use the combo select created by google
      const combo = document.querySelector(".goog-te-combo");
      if (!combo) {
        announce("Translate UI עדיין לא נטען");
        return;
      }
      if (targetLang === "auto") {
        combo.selectedIndex = 0;
      } else {
        // convert he to iw if present
        const val = (targetLang === "he") ? "iw" : targetLang;
        combo.value = val;
      }
      combo.dispatchEvent(new Event('change'));
      announce("Translating page...");
      // Wait a bit and then announce complete
      setTimeout(() => announce("תרגום הושלם (או בחן את התוצאה)"), 1600);
    }

    /* ---------------- TTS ---------------- */
    let synth = window.speechSynthesis;
    function startTTS() {
      if (!synth) { announce("TTS not supported"); return; }
      synth.cancel();
      const sel = window.getSelection();
      const text = sel && !sel.isCollapsed ? sel.toString().trim() : extractReadableText();
      if (!text) { announce("אין טקסט לקרוא"); return; }
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = document.documentElement.lang || state.lang || "he";
      synth.speak(utt);
      announce("Reading started");
    }
    function pauseResumeTTS() {
      if (!synth) return;
      if (synth.speaking && !synth.paused) { synth.pause(); announce("TTS paused"); }
      else if (synth.paused) { synth.resume(); announce("TTS resumed"); }
    }
    function stopTTS() { if (!synth) return; synth.cancel(); announce("TTS stopped"); }
    function extractReadableText() {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.parentElement) return NodeFilter.FILTER_REJECT;
          if (node.parentElement.closest("#accessibility-root")) return NodeFilter.FILTER_REJECT;
          const tag = node.parentElement.tagName.toLowerCase();
          if (["script","style","noscript","svg","iframe","textarea"].includes(tag)) return NodeFilter.FILTER_REJECT;
          if (!node.textContent || node.textContent.trim().length < 3) return NodeFilter.FILTER_REJECT;
          if (node.parentElement.closest("nav, footer")) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      let n, out = "";
      while (n = walker.nextNode()) out += n.textContent.trim() + " ";
      return out.trim();
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
      // restore px sizes from data attribute
      document.querySelectorAll("[data-acc-orig-fontsize]").forEach(n => {
        const orig = n.getAttribute("data-acc-orig-fontsize");
        if (orig) n.style.fontSize = orig + "px";
        else n.style.fontSize = "";
        n.removeAttribute("data-acc-orig-fontsize");
      });
      // restore root font-size
      const html = document.documentElement;
      if (html.hasAttribute("data-acc-root-fontsize")) {
        html.style.fontSize = html.getAttribute("data-acc-root-fontsize") + "px";
        html.removeAttribute("data-acc-root-fontsize");
      } else html.style.fontSize = "";

      // remove all classes & attributes added
      html.classList.remove("acc-dyslexic","acc-cursor-2x","acc-cursor-3x","acc-strong-focus","acc-dark-mode",
        "acc-highlight-links","acc-pause-animations","acc-line-spacing");
      document.body.classList.remove("acc-dyslexic","acc-dark-mode","acc-highlight-links");
      html.removeAttribute("data-sat");

      // remove injected pause style
      const ps = document.getElementById("acc-pause-style"); if (ps) ps.remove();

      // stop speech
      if (window.speechSynthesis) window.speechSynthesis.cancel();

      // clear saved settings
      localStorage.removeItem(ACC_KEY);

      // Attempt to remove google translate artifacts:
      const gtFrame = document.querySelector('.goog-te-banner-frame');
      // If translate used, reloading is the safest to fully clear translations and return to original DOM/css
      announce("איפוס הושלם — הדף ייטען מחדש כדי להחזיר הכל למצב המקורי");
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
      if (state.lang) { document.documentElement.lang = state.lang; document.documentElement.dir = (state.lang === "he" ? "rtl" : "ltr"); }
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

    /* ---------------- Utility: applyScaleToAll ---------------- */
    function applyScaleToAll() {
      const html = document.documentElement;
      if (!html.hasAttribute("data-acc-root-fontsize")) {
        const rootSize = parseFloat(getComputedStyle(html).fontSize) || 16;
        html.setAttribute("data-acc-root-fontsize", rootSize.toString());
      }
      const rootOrig = parseFloat(html.getAttribute("data-acc-root-fontsize")) || parseFloat(getComputedStyle(html).fontSize) || 16;
      html.style.fontSize = (rootOrig * state.scale) + "px";
      document.querySelectorAll("[data-acc-orig-fontsize]").forEach(n => {
        if (n.closest && n.closest("#accessibility-root")) return;
        const orig = parseFloat(n.getAttribute("data-acc-orig-fontsize"));
        if (!isNaN(orig)) n.style.fontSize = (orig * state.scale) + "px";
      });
      announce(`גודל טקסט: ${Math.round(state.scale*100)}%`);
      saveState();
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
                <option value="he">בקרוב</option>
                <option value="he">עברית</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
                <option value="de">Deutsch</option>
                <option value="ar">العربية</option>
                <option value="auto">Auto (Google)</option>
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
