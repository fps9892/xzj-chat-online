// Sistema de opciones y respuestas de mensajes
export let replyingTo = null;

export function setupMessageOptions(messageEl, message, currentUser, sendMessage, deleteMessage, showNotification) {
    const optionsBtn = messageEl.querySelector('.message-options-btn');
    if (!optionsBtn || !message.text) return;

    optionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Cerrar otros menús abiertos
        document.querySelectorAll('.message-options-menu').forEach(menu => menu.remove());
        
        // Crear menú
        const menu = document.createElement('div');
        menu.className = 'message-options-menu';
        
        const isOwn = message.userId === currentUser.userId;
        
        // Opción copiar
        const copyOption = document.createElement('div');
        copyOption.className = 'message-option-item';
        copyOption.innerHTML = 'Copiar';
        copyOption.addEventListener('click', () => {
            navigator.clipboard.writeText(message.text || '').then(() => {
                showNotification('Mensaje copiado', 'success');
                menu.remove();
            });
        });
        menu.appendChild(copyOption);
        
        // Opción responder
        const replyOption = document.createElement('div');
        replyOption.className = 'message-option-item';
        replyOption.innerHTML = 'Responder';
        replyOption.addEventListener('click', () => {
            setReplyTo(message);
            menu.remove();
        });
        menu.appendChild(replyOption);
        
        // Opción eliminar (solo para mensajes propios)
        if (isOwn) {
            const deleteOption = document.createElement('div');
            deleteOption.className = 'message-option-item delete';
            deleteOption.innerHTML = 'Eliminar';
            deleteOption.addEventListener('click', async () => {
                if (confirm('¿Eliminar este mensaje?')) {
                    try {
                        await deleteMessage(message.id);
                        showNotification('Mensaje eliminado', 'success');
                    } catch (error) {
                        showNotification('Error al eliminar', 'error');
                    }
                }
                menu.remove();
            });
            menu.appendChild(deleteOption);
        }
        
        optionsBtn.appendChild(menu);
    });
}

export function setReplyTo(message) {
    if (!message.text) return;
    
    replyingTo = {
        id: message.id,
        userId: message.userId,
        userName: message.userName || 'Usuario',
        text: message.text
    };
    
    showReplyBanner();
}

export function clearReply() {
    replyingTo = null;
    const banner = document.querySelector('.reply-banner');
    if (banner) banner.remove();
}

function showReplyBanner() {
    // Eliminar banner anterior si existe
    const existingBanner = document.querySelector('.reply-banner');
    if (existingBanner) existingBanner.remove();
    
    const banner = document.createElement('div');
    banner.className = 'reply-banner';
    banner.innerHTML = `
        <div class="reply-banner-content">
            <img src="/images/reply.svg" class="reply-banner-icon" />
            <div class="reply-banner-text">
                <span class="reply-banner-username">${replyingTo.userName}</span>
                <span class="reply-banner-message">${replyingTo.text.substring(0, 50)}${replyingTo.text.length > 50 ? '...' : ''}</span>
            </div>
        </div>
        <button class="reply-banner-close">×</button>
    `;
    
    document.body.appendChild(banner);
    
    banner.querySelector('.reply-banner-close').addEventListener('click', clearReply);
}

// Cerrar menús al hacer click fuera
document.addEventListener('click', () => {
    document.querySelectorAll('.message-options-menu').forEach(menu => menu.remove());
});
