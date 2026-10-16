const elements = [...document.querySelectorAll('[data-about-reveal]')];
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: .08, rootMargin: '0px 0px 24px 0px' });
  for (const element of elements) {
    element.classList.add('about-reveal-ready');
    observer.observe(element);
  }
}
