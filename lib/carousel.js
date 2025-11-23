// carousel.js

/**
 * Creates a custom, responsive, and infinite image carousel.
 * @param {string} containerSelector The CSS selector for the carousel container element.
 * @param {string[]} images Array of image URLs.
 * @param {object} options Configuration options for the carousel.
 */
function createCarousel(containerSelector, images, options = {}) {
  const container = document.querySelector(containerSelector);
  if (!container) {
    console.error("Carousel container not found:", containerSelector);
    return;
  }

  // --- 1. Settings ---
  const settings = Object.assign(
    {
      autoplay: true,
      delay: 3000,
      lightbox: true,
      roundCorner: "10px",
      gap: 10, // Gap in pixels
    },
    options
  );

  const originalSlides = images;
  const totalSlides = originalSlides.length;
  let slidesPerView = 3; // Default, will be updated by responsive settings
  const slidesToClone = 3; // Number of clones on each end for smooth looping
  let currentIndex = slidesToClone; // Start index is offset by the prepended clones
  let autoplayInterval;
  let isTransitioning = false;

  // --- 2. Build Basic Structure & CSS Properties ---
  container.style.position = "relative";
  container.style.overflow = "hidden";
  container.style.width = "100%";
  container.style.display = "block";
  container.style.setProperty("--slide-gap", `${settings.gap}px`);

  // --- 3. יצירת wrapper עם RTL ---
  const wrapper = document.createElement("div");
  wrapper.classList.add("carousel-wrapper");
  wrapper.style.display = "flex";
  wrapper.style.gap = `var(--slide-gap)`;
  wrapper.style.flexDirection = "row-reverse"; // ← RTL
  container.appendChild(wrapper);

  // --- 4. Preload כל התמונות ברקע ---
  function preloadImages() {
    originalSlides.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }
  preloadImages(); // טוען את כל התמונות מיד

  // --- 5. Create Slide Function ---
  function createSlide(src, isClone = false) {
    const imgWrapper = document.createElement("div");
    imgWrapper.classList.add("carousel-slide");
    if (isClone) imgWrapper.classList.add("carousel-clone");

    const slideWidthCalc =
      "calc((100% - (var(--slides-per-view) - 1) * var(--slide-gap)) / var(--slides-per-view))";

    imgWrapper.style.flex = `0 0 ${slideWidthCalc}`;
    imgWrapper.style.maxWidth = slideWidthCalc;
    imgWrapper.style.position = "relative";
    imgWrapper.style.overflow = "hidden";
    imgWrapper.style.borderRadius = settings.roundCorner;
    imgWrapper.style.aspectRatio = "4 / 3";

    const img = document.createElement("img");
    img.src = src;
    img.loading = "eager"; // ← טוען את כל התמונות מיד
    img.alt = isClone ? `Gallery image (clone)` : `Gallery image`;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.style.cursor = settings.lightbox ? "pointer" : "default";

    imgWrapper.appendChild(img);
    return imgWrapper;
  }

  // --- 6. Create Clones & Slides ---
  const clonesStart = originalSlides
    .slice(-slidesToClone)
    .map((src) => createSlide(src, true));
  const slides = originalSlides.map((src) => createSlide(src));
  const clonesEnd = originalSlides
    .slice(0, slidesToClone)
    .map((src) => createSlide(src, true));

  wrapper.append(...clonesStart, ...slides, ...clonesEnd);

  // --- 7. Responsive Settings ---
  function updateResponsiveSettings() {
    const containerWidth = container.offsetWidth;
    if (containerWidth >= 1024) {
      slidesPerView = 3;
    } else if (containerWidth >= 768) {
      slidesPerView = 2;
    } else {
      slidesPerView = 1;
    }
    container.style.setProperty("--slides-per-view", slidesPerView);
  }

  // --- 8. Navigation & Position Logic ---
  function setPosition(index, withTransition = true) {
    wrapper.style.transition = withTransition ? "transform 0.5s ease" : "none";

    const slideWidthPercent = 100 / slidesPerView;
    const offset = index * slideWidthPercent * -1;

    wrapper.style.transform = `translateX(${offset}%)`;

    currentIndex = index;
    updateDots();
  }

  function moveNext() {
    if (isTransitioning) return;
    isTransitioning = true;
    setPosition(currentIndex + 1);
  }

  function movePrev() {
    if (isTransitioning) return;
    isTransitioning = true;
    setPosition(currentIndex - 1);
  }

  // --- 9. Transitionend לשמירה על הלולאה האינסופית ---
  wrapper.addEventListener("transitionend", () => {
    isTransitioning = false;

    // אם עברתי לקלון הראשון → להחזיר לבסיס
    if (currentIndex === totalSlides + slidesToClone) {
      setPosition(slidesToClone, false); // teleport
    }

    // אם עברתי לקלון האחרון → להחזיר לסוף האמיתי
    if (currentIndex === slidesToClone - 1) {
      setPosition(totalSlides + slidesToClone - 1, false);
    }
  });

  // --- 10. Create Controls (Arrows) ---
  const controlsWrapper = document.createElement("div");
  controlsWrapper.style.position = "fixed";
  controlsWrapper.style.top = "60%";
  controlsWrapper.style.transform = "translateY(-50%)";
  controlsWrapper.style.width = "82%";
  controlsWrapper.style.display = "flex";
  controlsWrapper.style.flexDirection = "row"; // כפתורים תמיד LTR
  controlsWrapper.style.justifyContent = "space-between";
  controlsWrapper.style.pointerEvents = "none";
  controlsWrapper.style.zIndex = "10";

  const prevBtn = document.createElement("button");
  const nextBtn = document.createElement("button");

  // החץ השמאלי = הבא (RTL), החץ הימני = קודם (RTL)
  [prevBtn, nextBtn].forEach((btn, i) => {
    btn.innerHTML = i === 0 ? "&lt;" : "&gt;";
    btn.setAttribute("aria-label", i === 0 ? "Next Slide" : "Previous Slide"); // הפוך ל-RTL
    btn.style.margin = "0 10px";
    btn.style.padding = "8px 12px";
    btn.style.borderRadius = "50%";
    btn.style.background = "rgb(166 124 82)";
    btn.style.color = "white";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.style.pointerEvents = "auto";
    btn.style.fontSize = "1.5rem";
    btn.style.lineHeight = "1";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.width = "50px";
    btn.style.height = "50px";
  });

  controlsWrapper.appendChild(prevBtn);
  controlsWrapper.appendChild(nextBtn);
  container.appendChild(controlsWrapper);

  const resetAutoplay = () => {
    stopAutoplay();
    startAutoplay();
  };

  // החץ השמאלי = הבא, החץ הימני = קודם (RTL)
  prevBtn.addEventListener("click", () => {
    moveNext(); // ← הפוך ל-RTL
    resetAutoplay();
  });
  nextBtn.addEventListener("click", () => {
    movePrev(); // ← הפוך ל-RTL
    resetAutoplay();
  });

  // --- 11. Create Dots ---
  const dotsWrapper = document.createElement("div");
  dotsWrapper.style.position = "fixed";
  dotsWrapper.style.bottom = "42px";
  dotsWrapper.style.left = "50%";
  dotsWrapper.style.transform = "translateX(-50%)";
  dotsWrapper.style.display = "flex";
  dotsWrapper.style.flexDirection = "row-reverse"; // ← RTL
  dotsWrapper.style.justifyContent = "center";
  container.appendChild(dotsWrapper);
  let dots = [];

  function createDots() {
    dotsWrapper.innerHTML = "";
    dots = [];
    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement("button");
      dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
      // dot.style.width = "50px";
      // dot.style.height = "50px";
      // dot.style.borderRadius = "50%";
      // dot.style.background = "#d2b48c";
      // dot.style.border = "2px solid #d4af37";
      // dot.style.padding = "0";
      // dot.style.margin = "0 5px";
      // dot.style.cursor = "pointer";
      dot.style.transition = "background 0.3s";
      dot.classList.add("carousel-dot");
      dot.addEventListener("click", () => {
        setPosition(i + slidesToClone);
        resetAutoplay();
      });
      dotsWrapper.appendChild(dot);
      dots.push(dot);
    }
  }

  function updateDots() {
    let realIndex = (currentIndex - slidesToClone) % totalSlides;
    if (realIndex < 0) realIndex += totalSlides;
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === realIndex);
    });
  }

  // --- 12. Autoplay ---
  const startAutoplay = () => {
    if (!settings.autoplay) return;
    stopAutoplay();
    autoplayInterval = setInterval(moveNext, settings.delay);
  };

  const stopAutoplay = () => {
    clearInterval(autoplayInterval);
  };

  container.addEventListener("mouseenter", stopAutoplay);
  container.addEventListener("mouseleave", startAutoplay);

  // --- 13. Lightbox ---
  if (settings.lightbox) {
    const lightbox = document.createElement("div");
    Object.assign(lightbox.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.85)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: "0",
      pointerEvents: "none",
      transition: "opacity 0.3s",
      zIndex: "9999",
    });
    lightbox.setAttribute("role", "dialog");

    const lbImg = document.createElement("img");
    Object.assign(lbImg.style, {
      maxWidth: "90%",
      maxHeight: "90%",
      borderRadius: "8px",
    });

    lightbox.appendChild(lbImg);
    document.body.appendChild(lightbox);

    wrapper.querySelectorAll(".carousel-slide img").forEach((img) => {
  img.addEventListener("click", (e) => {
    lbImg.src = e.target.src;
    lightbox.style.opacity = "1";
    lightbox.style.pointerEvents = "auto";
    stopAutoplay();
  });
});


    lightbox.addEventListener("click", () => {
      lightbox.style.opacity = "0";
      lightbox.style.pointerEvents = "none";
      startAutoplay();
    });
  }

  // --- 14. Initial Load and Resize Listener ---
  function initialize() {
    updateResponsiveSettings();
    createDots();
    currentIndex = slidesToClone;
    setPosition(currentIndex, false);
    startAutoplay();
  }

  window.addEventListener("resize", () => {
    updateResponsiveSettings();
    currentIndex = slidesToClone;
    setPosition(currentIndex, false);
  });

  // המתנה קצרה עד שהדף מרנדר את ה-DOM
  setTimeout(() => initialize(), 50);
}
