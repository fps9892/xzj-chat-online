// Mejoras y efectos adicionales para el chat

// Efecto de ripple al hacer click en el chat
export function createRipple(event, element) {
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    element.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
}

// Efecto de partículas al enviar mensaje
export function createParticleBurst(element) {
    const particleCount = 12;
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const angle = (Math.PI * 2 * i) / particleCount;
        const velocity = 50 + Math.random() * 50;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;
        
        particle.style.left = centerX + 'px';
        particle.style.top = centerY + 'px';
        particle.style.setProperty('--tx', tx + 'px');
        particle.style.setProperty('--ty', ty + 'px');
        
        document.body.appendChild(particle);
        
        setTimeout(() => particle.remove(), 800);
    }
}

// Botón de scroll al final
export function initScrollToBottom() {
    const chatArea = document.querySelector('.chat-area');
    if (!chatArea) return;
    
    let scrollBtn = document.querySelector('.scroll-to-bottom');
    if (!scrollBtn) {
        scrollBtn = document.createElement('div');
        scrollBtn.className = 'scroll-to-bottom';
        document.body.appendChild(scrollBtn);
        
        scrollBtn.addEventListener('click', () => {
            chatArea.scrollTo({
                top: chatArea.scrollHeight,
                behavior: 'smooth'
            });
        });
    }
    
    chatArea.addEventListener('scroll', () => {
        const isNearBottom = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight < 100;
        scrollBtn.classList.toggle('visible', !isNearBottom);
    });
}

// Contador de caracteres con advertencia
export function updateCharCounter(input, counter) {
    const length = input.value.length;
    const maxLength = input.getAttribute('maxlength') || 250;
    
    counter.textContent = `${length}/${maxLength}`;
    
    counter.classList.remove('warning', 'danger');
    
    if (length > maxLength * 0.9) {
        counter.classList.add('danger');
    } else if (length > maxLength * 0.7) {
        counter.classList.add('warning');
    }
}

// Marcar mensajes nuevos
export function markAsNewMessage(messageElement) {
    messageElement.classList.add('new-message');
    setTimeout(() => {
        messageElement.classList.remove('new-message');
    }, 1000);
}

// Detectar scroll y aplicar fade a mensajes antiguos
export function initScrollFade() {
    const chatArea = document.querySelector('.chat-area');
    if (!chatArea) return;
    
    chatArea.addEventListener('scroll', () => {
        const messages = chatArea.querySelectorAll('.message-container');
        const scrollTop = chatArea.scrollTop;
        const viewportHeight = chatArea.clientHeight;
        
        messages.forEach(message => {
            const rect = message.getBoundingClientRect();
            const chatRect = chatArea.getBoundingClientRect();
            const messageTop = rect.top - chatRect.top + scrollTop;
            
            if (messageTop < scrollTop - 100) {
                message.classList.add('fading');
            } else {
                message.classList.remove('fading');
            }
        });
    });
}

// Efecto de escritura en tiempo real (simulado)
export function simulateTypingEffect(element, text, speed = 50) {
    element.textContent = '';
    element.classList.add('typing');
    let i = 0;
    
    const interval = setInterval(() => {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
        } else {
            clearInterval(interval);
            element.classList.remove('typing');
        }
    }, speed);
}

// Shake notification para mensajes importantes
export function shakeNotification(notification) {
    notification.classList.add('shake');
    setTimeout(() => {
        notification.classList.remove('shake');
    }, 500);
}

// Highlight mensaje al hacer click en mención
export function highlightMessage(messageId) {
    const message = document.querySelector(`[data-message-id="${messageId}"]`);
    if (message) {
        message.classList.add('highlighted');
        message.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => {
            message.classList.remove('highlighted');
        }, 3000);
    }
}

// Animación de conexión/desconexión de usuarios
export function animateUserConnection(userElement, isConnecting) {
    if (isConnecting) {
        userElement.classList.add('connecting');
        setTimeout(() => userElement.classList.remove('connecting'), 500);
    } else {
        userElement.classList.add('disconnecting');
        setTimeout(() => {
            userElement.classList.remove('disconnecting');
            userElement.remove();
        }, 500);
    }
}

// Animación de eliminación de mensaje
export function animateMessageDeletion(messageElement, callback) {
    messageElement.classList.add('deleting');
    setTimeout(() => {
        if (callback) callback();
        messageElement.remove();
    }, 500);
}

// Indicador de nuevos mensajes cuando no estás al final
let newMessagesCount = 0;
export function showNewMessagesIndicator() {
    const chatArea = document.querySelector('.chat-area');
    if (!chatArea) return;
    
    const isNearBottom = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight < 100;
    
    if (!isNearBottom) {
        newMessagesCount++;
        
        let indicator = document.querySelector('.new-messages-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'new-messages-indicator';
            document.body.appendChild(indicator);
            
            indicator.addEventListener('click', () => {
                chatArea.scrollTo({
                    top: chatArea.scrollHeight,
                    behavior: 'smooth'
                });
                indicator.remove();
                newMessagesCount = 0;
            });
        }
        
        indicator.textContent = `${newMessagesCount} nuevo${newMessagesCount > 1 ? 's' : ''} mensaje${newMessagesCount > 1 ? 's' : ''}`;
    }
}

// Efecto de hover en avatares
export function initAvatarEffects() {
    document.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('message-avatar')) {
            e.target.style.transform = 'scale(1.2) rotate(5deg)';
        }
    });
    
    document.addEventListener('mouseout', (e) => {
        if (e.target.classList.contains('message-avatar')) {
            e.target.style.transform = '';
        }
    });
}

// Smooth scroll para el chat
export function enableSmoothScroll() {
    const chatArea = document.querySelector('.chat-area');
    if (chatArea) {
        chatArea.classList.add('smooth-scroll');
    }
}

// Inicializar todas las mejoras
export function initChatEnhancements() {
    initScrollToBottom();
    initScrollFade();
    initAvatarEffects();
    enableSmoothScroll();
    
    // Agregar efecto de ripple al chat area
    const chatArea = document.querySelector('.chat-area');
    if (chatArea) {
        chatArea.addEventListener('click', (e) => {
            if (e.target === chatArea) {
                createRipple(e, chatArea);
            }
        });
    }
    
    // Actualizar contador de caracteres
    const messageInput = document.querySelector('.message-input');
    const charCounter = document.querySelector('.char-counter');
    if (messageInput && charCounter) {
        messageInput.addEventListener('input', () => {
            updateCharCounter(messageInput, charCounter);
        });
    }
    
    console.log('✨ Chat enhancements initialized');
}

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatEnhancements);
} else {
    initChatEnhancements();
}
