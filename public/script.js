document.addEventListener('DOMContentLoaded', () => {

  /* ================= HERO SLIDER + PARALLAX ================= */
  const heroImgs = document.querySelectorAll('.parallax-img');
  let heroIndex = 0;

  setInterval(() => {
    heroImgs[heroIndex].classList.remove('active');
    heroIndex = (heroIndex + 1) % heroImgs.length;
    heroImgs[heroIndex].classList.add('active');
  }, 7000);

  const sections = document.querySelectorAll('section');
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    heroImgs.forEach(img => img.style.transform = `translateY(${scrollTop * 0.2}px)`);
    sections.forEach(sec => {
      if (sec.getBoundingClientRect().top < window.innerHeight * 0.8) sec.classList.add('visible');
    });
  });

  /* ================= SIDE NAV / HAMBURGER ================= */
  fetch('/public/lib/navbar.html')
    .then(r => r.text())
    .then(html => {
      document.getElementById('navbar').innerHTML = html;
      initHamburger();
    });

  function initHamburger() {
    const hamburger = document.querySelector('.hamburger');
    const sideNav = document.getElementById('sideNav');
    const closeBtn = document.querySelector('.close-btn');
    if (!hamburger || !sideNav || !closeBtn) return;

    hamburger.onclick = e => { e.stopPropagation(); sideNav.classList.add('active'); };
    closeBtn.onclick = () => sideNav.classList.remove('active');

    document.onclick = e => {
      if (sideNav.classList.contains('active') &&
        !sideNav.contains(e.target) &&
        !hamburger.contains(e.target)) {
        sideNav.classList.remove('active');
      }
    };
  }


  /* ================= CTA BUTTONS SMOOTH SCROLL ================= */
  document.querySelectorAll('.cta-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      if (targetId) {
        const target = document.getElementById(targetId);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
  //===מסדר את המיקום של כפתורי התזוזה בדעיוק לחצי מהתמונה====
// בחר את שני הכפתורים
const btn1 = document.querySelector('#carousel > div:nth-child(2) > button:nth-child(1)');
const btn2 = document.querySelector('#carousel > div:nth-child(2) > button:nth-child(2)');

// הגדר margin ל-0
if (btn1) btn1.style.margin = '0';
if (btn2) btn2.style.margin = '0';


const slides = document.querySelectorAll('#carousel .slide');
const viewport = document.getElementById('carousel'); // כנראה צריך עבור العرض של ה-carousel

  // Responsive slide width + fix תמונות גבוהות
  const resizeSlides = () => {
    const w = viewport.offsetWidth;
    let slidesToShow = 3; // מחשב
    if (w <= 992) slidesToShow = 2; // טאבלט
    if (w <= 768) slidesToShow = 1; // פלאפון
    const slideWidth = w / slidesToShow - 10; // -gap קטן
    slides.forEach(slide => {
      slide.style.minWidth = `${slideWidth}px`;
      const img = slide.querySelector('img');
      if (img) {
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.maxHeight = '350px'; // מגבלת גובה
      }
    });
  };
  resizeSlides();
  window.addEventListener('resize', resizeSlides);

});
const heroContent = document.querySelector('.hero-content');
const aboutSection = document.getElementById('about');

function positionHeroContent() {
  const heroContent = document.querySelector('.hero-content');
  const about = document.getElementById('about');
  if (!heroContent || !about) return;

  const aboutTop = about.offsetTop;
  const heroHeight = heroContent.offsetHeight;

  heroContent.style.top = `${aboutTop - heroHeight / 2}px`;
}

// הפעלה **מיידית**
positionHeroContent();

// עדכון בעת שינוי גודל חלון
window.addEventListener('resize', positionHeroContent);


  const addNewImagesToLightbox = () => {
    const lb = document.querySelector('body > div[role="dialog"]');
    const lbImg = lb ? lb.querySelector('img') : null;
    const newGalleryImages = document.querySelectorAll('.responsive-images img');

    if (!lb || !lbImg || newGalleryImages.length === 0) {
      // אם עדיין לא נוצר ה-lightbox, ננסה שוב אחרי 100ms
      setTimeout(addNewImagesToLightbox, 100);
      return;
    }

    // מוסיפים אירועים לכל תמונה חדשה
    newGalleryImages.forEach(img => {
      img.addEventListener('click', (e) => {
        lbImg.src = e.target.src;
        lb.style.opacity = "1";
        lb.style.pointerEvents = "auto";
        if (typeof stopAutoplay === 'function') stopAutoplay();
      });
    });

    lb.addEventListener('click', () => {
      lb.style.opacity = "0";
      lb.style.pointerEvents = "none";
      if (typeof startAutoplay === 'function') startAutoplay();
    });
  };

  addNewImagesToLightbox(); // הפעלה

  //update whatsapp links

  function openWhatsApp(group) {

    // קישורים מוצפנים ב-Base64 כדי לא להופיע בקוד HTML
    const links = {
      safra: "aHR0cHM6Ly9jaGF0LndoYXRzYXBwLmNvbS9ETVYxNVVZMDhCTzlIQzVUa2JiQlQy",
      mashav: "aHR0cHM6Ly9jaGF0LndoYXRzYXBwLmNvbS9JYWg2QWwyNzFHdjFVYlRGYVczRFI2"
    };

    const decoded = atob(links[group]);  // פענוח
    window.open(decoded, "_blank");      // פתיחה
  }

console.log(
  "%cנבנה על ידי\n%c😉%cאריאל פלישבסקי%c🔥",
  "font-size: 18px; color: #fff; padding: 4px 8px; border-radius: 4px;", // נבנה על ידי
    "font-size: 20px;", // האש 🔥 בלי צבע, נשארה טבעית
"font-size: 20px; font-weight: bold; background: linear-gradient(90deg, #ff7e5f, #feb47b); -webkit-background-clip: text; color: transparent;", // השם
  "font-size: 18px; color: #f0c674;" // האימוג'י 😉
);



const art = `
 _____                                             _____ 
( ___ )                                           ( ___ )
 |   |~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|   | 
 |   |    _           _         _   _   ___   ___  |   | 
 |   |   /_\\    _ _  (_)  ___  | | (_) ( _ ) ( _ ) |   | 
 |   |  / _ \\  | '_| | | / -_) | | | | / _ \\ / _ \\ |   | 
 |   | /_/ \\_\\ |_|   |_| \\___| |_| |_| \\___/ \\___/ |   | 
 |___|~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|___| 
(_____)                                           (_____)
`;

console.log("%c" + art, "color: orange; font-family: monospace; font-size:10px; font-weight: bold;  line-height: 1;");