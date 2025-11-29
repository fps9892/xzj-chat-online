// Animación de Navidad
let snowflakeCount = 0;
const MAX_SNOWFLAKES = 15;

export function triggerChristmasAnimation(messageElement) {
  // Añadir clase de glow al mensaje
  messageElement.classList.add('christmas-message');
  
  // Crear copos de nieve (limitados para evitar lag)
  const snowflakesToCreate = Math.min(8, MAX_SNOWFLAKES - snowflakeCount);
  
  for (let i = 0; i < snowflakesToCreate; i++) {
    setTimeout(() => createSnowflake(), i * 150);
  }
}

function createSnowflake() {
  if (snowflakeCount >= MAX_SNOWFLAKES) return;
  
  const snowflake = document.createElement('div');
  snowflake.className = 'snowflake';
  snowflake.textContent = ['❄', '❅', '❆'][Math.floor(Math.random() * 3)];
  snowflake.style.left = Math.random() * 100 + '%';
  snowflake.style.fontSize = (Math.random() * 1 + 0.8) + 'em';
  snowflake.style.animationDuration = (Math.random() * 3 + 3) + 's';
  
  document.body.appendChild(snowflake);
  snowflakeCount++;
  
  setTimeout(() => {
    snowflake.remove();
    snowflakeCount--;
  }, 6000);
}

export function checkChristmasKeywords(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  const keywords = ['navidad', 'fiestas', 'feliz navidad', 'felices fiestas'];
  
  return keywords.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(lowerText);
  });
}
