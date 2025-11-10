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
  const hamburger = document.querySelector('.hamburger');
  const sideNav = document.getElementById('sideNav');
  const closeBtn = document.querySelector('.close-btn');
  hamburger.addEventListener('click', () => sideNav.classList.add('active'));
  closeBtn.addEventListener('click', () => sideNav.classList.remove('active'));

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

  /* ================= EMBLA CAROUSEL ================= */
  const emblaNode = document.querySelector('.embla');
  const viewport = emblaNode.querySelector('.embla__viewport');
  const embla = EmblaCarousel(viewport, {
    loop: true,
    rtl: true,
    skipSnaps: false,
    align: 'start',
    containScroll: 'trimSnaps'
  });

  // Arrow buttons
  const prevBtn = emblaNode.querySelector('.embla__button--prev');
  const nextBtn = emblaNode.querySelector('.embla__button--next');
  prevBtn.addEventListener('click', () => embla.scrollPrev());
  nextBtn.addEventListener('click', () => embla.scrollNext());

  // Dots
  const dotsContainer = emblaNode.querySelector('.embla__dots');
  const slides = embla.slideNodes();
  slides.forEach((_, idx) => {
    const dot = document.createElement('button');
    dot.classList.add('embla__dot');
    dot.addEventListener('click', () => embla.scrollTo(idx));
    dotsContainer.appendChild(dot);
  });
  const dots = Array.from(dotsContainer.children);
  const setActiveDot = () => {
    const selectedIdx = embla.selectedScrollSnap();
    dots.forEach((dot, idx) => dot.classList.toggle('active', idx === selectedIdx));
  };
  embla.on('select', setActiveDot);
  embla.on('init', setActiveDot);
  setActiveDot();

  // Autoplay איטי
  const autoplay = () => {
    embla.scrollNext();
    setTimeout(autoplay, 6000); // 6 שניות בין תמונות
  };
  autoplay();

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
