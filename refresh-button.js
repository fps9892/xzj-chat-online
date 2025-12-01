let scrollTimeout;
let lastScrollY = 0;

const refreshBtn = document.getElementById('refreshBtn');
const chatArea = document.querySelector('.chat-area');

if (refreshBtn && chatArea) {
  chatArea.addEventListener('scroll', () => {
    const currentScrollY = chatArea.scrollTop;
    
    if (currentScrollY > lastScrollY && currentScrollY > 100) {
      refreshBtn.classList.add('show');
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        refreshBtn.classList.remove('show');
      }, 10000);
    }
    
    lastScrollY = currentScrollY;
  });

  refreshBtn.addEventListener('click', () => {
    location.reload();
  });
}
