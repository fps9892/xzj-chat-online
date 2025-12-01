class Carousel {
  constructor() {
    this.currentSlide = 0;
    this.totalSlides = document.querySelectorAll('.carousel-slide').length;
    this.autoPlayInterval = null;
    this.autoPlayDelay = 15000;
    this.init();
  }

  init() {
    this.createDots();
    this.setupEventListeners();
    this.startAutoPlay();
  }

  createDots() {
    const dotsContainer = document.getElementById('carouselDots');
    if (!dotsContainer) return;
    
    for (let i = 0; i < this.totalSlides; i++) {
      const dot = document.createElement('div');
      dot.className = `carousel-dot ${i === 0 ? 'active' : ''}`;
      dot.addEventListener('click', () => this.goToSlide(i));
      dotsContainer.appendChild(dot);
    }
  }

  setupEventListeners() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) prevBtn.addEventListener('click', () => this.prevSlide());
    if (nextBtn) nextBtn.addEventListener('click', () => this.nextSlide());
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseAutoPlay();
      } else {
        this.startAutoPlay();
      }
    });
  }

  nextSlide() {
    this.goToSlide((this.currentSlide + 1) % this.totalSlides);
  }

  prevSlide() {
    this.goToSlide((this.currentSlide - 1 + this.totalSlides) % this.totalSlides);
  }

  goToSlide(index) {
    this.pauseAutoPlay();
    
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    
    slides.forEach(slide => slide.classList.remove('active', 'prev'));
    dots.forEach(dot => dot.classList.remove('active'));
    
    if (slides[this.currentSlide]) {
      slides[this.currentSlide].classList.add('prev');
    }
    
    this.currentSlide = index;
    slides[this.currentSlide].classList.add('active');
    dots[this.currentSlide].classList.add('active');
    
    this.resetProgressBar();
    this.startAutoPlay();
  }

  resetProgressBar() {
    const progress = document.querySelector('.carousel-progress');
    if (!progress) return;
    
    progress.style.animation = 'none';
    setTimeout(() => {
      progress.style.animation = 'progress 15s linear forwards';
    }, 10);
  }

  startAutoPlay() {
    this.pauseAutoPlay();
    this.autoPlayInterval = setInterval(() => {
      this.nextSlide();
    }, this.autoPlayDelay);
  }

  pauseAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new Carousel());
} else {
  new Carousel();
}
