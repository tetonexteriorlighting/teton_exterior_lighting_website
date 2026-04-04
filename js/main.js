/* =============================================
   TETON EXTERIOR LIGHTING — MAIN JS
   ============================================= */

// ---- Navbar scroll effect ----
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    navbar.style.background = 'rgba(8,12,24,0.98)';
  } else {
    navbar.style.background = 'rgba(8,12,24,0.96)';
  }
});

// ---- Mobile nav toggle ----
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');
navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  navToggle.innerHTML = navLinks.classList.contains('open') ? '&#10005;' : '&#9776;';
});
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.innerHTML = '&#9776;';
  });
});

// ---- Hero light nodes ----
(function createLightNodes() {
  const container = document.querySelector('.hero-lights');
  if (!container) return;

  const colors = [
    'rgba(245,166,35,',   // gold
    'rgba(74,144,226,',   // blue
    'rgba(255,100,100,',  // red
    'rgba(100,200,100,',  // green
    'rgba(180,100,255,',  // purple
  ];

  for (let i = 0; i < 60; i++) {
    const node = document.createElement('div');
    node.classList.add('light-node');
    const color  = colors[Math.floor(Math.random() * colors.length)];
    const size   = 3 + Math.random() * 6;
    const opacity = 0.4 + Math.random() * 0.6;
    node.style.cssText = `
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      width: ${size}px;
      height: ${size}px;
      background: ${color}${opacity});
      box-shadow: 0 0 ${size * 3}px ${size}px ${color}0.3);
      --dur: ${2 + Math.random() * 4}s;
      --delay: ${-Math.random() * 4}s;
    `;
    container.appendChild(node);
  }
})();

// ---- FAQ accordion ----
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item     = btn.closest('.faq-item');
    const isOpen   = item.classList.contains('open');

    // Close all
    document.querySelectorAll('.faq-item.open').forEach(open => {
      open.classList.remove('open');
    });

    // Open clicked (if it wasn't already open)
    if (!isOpen) item.classList.add('open');
  });
});

// ---- Scroll reveal ----
const revealEls = document.querySelectorAll(
  '.why-card, .step, .testimonial-card, .stat-item, .app-features-list li, .faq-item'
);

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity    = '1';
      entry.target.style.transform  = 'translateY(0)';
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

revealEls.forEach(el => {
  el.style.opacity   = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  revealObserver.observe(el);
});

// ---- Quote form ----
const quoteForm    = document.getElementById('quoteForm');
const quoteSuccess = document.getElementById('quoteSuccess');

if (quoteForm) {
  quoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(quoteForm);

    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data).toString(),
      });

      if (res.ok) {
        quoteForm.style.display    = 'none';
        quoteSuccess.style.display = 'block';
        quoteSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        alert('Something went wrong. Please call or text us directly!');
      }
    } catch {
      alert('Something went wrong. Please call or text us directly!');
    }
  });
}

// ---- Stats counter animation ----
const statNumbers = document.querySelectorAll('.stat-number');

const countObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('counted');
      countObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

statNumbers.forEach(el => countObserver.observe(el));

// ---- Active nav link on scroll ----
const sections = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navAnchors.forEach(a => a.classList.remove('active'));
      const active = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
      if (active) active.classList.add('active');
    }
  });
}, { rootMargin: '-50% 0px -50% 0px' });

sections.forEach(s => sectionObserver.observe(s));
