// Open user profile on nickname click
document.querySelectorAll('.chat-nickname').forEach(nickname => {
  nickname.addEventListener('click', (event) => {
    const userId = event.target.dataset.userId; // Assuming data-user-id is set
    openUserProfile(userId);
  });
});

function openUserProfile(userId) {
  // Logic to open the user profile
  console.log(`Opening profile for user ID: ${userId}`);
}

// Copy message on long press
document.querySelectorAll('.message-text').forEach(message => {
  let pressTimer;
  message.addEventListener('mousedown', () => {
    pressTimer = setTimeout(() => {
      navigator.clipboard.writeText(message.textContent).then(() => {
        alert('Mensaje copiado');
      });
    }, 500); // Long press duration
  });

  message.addEventListener('mouseup', () => clearTimeout(pressTimer));
  message.addEventListener('mouseleave', () => clearTimeout(pressTimer));
});