(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile nav toggle
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');

  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', isOpen);
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Scroll-triggered reveal animations
  const revealEls = document.querySelectorAll('[data-reveal]');

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(el => el.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = entry.target.getAttribute('data-delay') || 0;
          entry.target.style.transitionDelay = `${delay * 90}ms`;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => revealObserver.observe(el));
  }

  // Header shrink + scroll progress + active nav link + back-to-top
  const header = document.getElementById('site-header');
  const progressBar = document.getElementById('scroll-progress');
  const backToTop = document.getElementById('back-to-top');
  const sections = document.querySelectorAll('main section[id]');
  const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

  function onScroll() {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
    progressBar.style.width = `${progress}%`;

    header.classList.toggle('scrolled', scrollY > 20);
    backToTop.classList.toggle('show', scrollY > 600);

    let currentId = '';
    sections.forEach(section => {
      const top = section.offsetTop - 140;
      if (scrollY >= top) currentId = section.id;
    });

    navAnchors.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === `#${currentId}`);
    });
  }

  let scrollScheduled = false;
  window.addEventListener('scroll', () => {
    if (scrollScheduled) return;
    scrollScheduled = true;
    setTimeout(() => { onScroll(); scrollScheduled = false; }, 50);
  });

  onScroll();

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });

  // Spotlight hover effect on cards
  if (!prefersReducedMotion) {
    document.querySelectorAll('[data-spotlight]').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
        card.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
      });
    });
  }

  // Testimonial form (Netlify Forms)
  const testimonialForm = document.getElementById('testimonial-form');
  if (testimonialForm) {
    testimonialForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('testimonial-error');
      errorEl.hidden = true;

      const data = new FormData(testimonialForm);
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data).toString()
      })
        .then((response) => {
          if (!response.ok) throw new Error(`Envio falhou (${response.status})`);
          testimonialForm.hidden = true;
          document.getElementById('testimonial-success').hidden = false;
        })
        .catch(() => {
          errorEl.textContent = 'Não foi possível enviar agora. Tente novamente ou chame no WhatsApp.';
          errorEl.hidden = false;
        });
    });
  }

  // Mouse parallax on floating hero cards
  const hero = document.querySelector('.hero');
  const parallaxEls = document.querySelectorAll('[data-parallax]');

  if (hero && parallaxEls.length && !prefersReducedMotion) {
    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const offsetX = (e.clientX - rect.left) / rect.width - 0.5;
      const offsetY = (e.clientY - rect.top) / rect.height - 0.5;

      parallaxEls.forEach(el => {
        const strength = Number(el.getAttribute('data-parallax-strength')) || 20;
        el.style.transform = `translate(${offsetX * strength}px, ${offsetY * strength}px)`;
      });
    });

    hero.addEventListener('mouseleave', () => {
      parallaxEls.forEach(el => {
        el.style.transform = '';
      });
    });
  }
})();
