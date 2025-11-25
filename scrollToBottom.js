// Función para desplazar el área de chat hacia el final
function scrollToBottom(chatAreaId) {
    const chatArea = document.getElementById(chatAreaId);
    if (chatArea) {
        chatArea.scrollTo({
            top: chatArea.scrollHeight,
            behavior: 'smooth', // Desplazamiento suave
        });
    }
}

// Observa cambios en el área de chat y desplaza automáticamente
function observeChatArea(chatAreaId) {
    const chatArea = document.getElementById(chatAreaId);
    if (chatArea) {
        const observer = new MutationObserver((mutations) => {
            const isUserAtBottom =
                chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight < 10;
            if (isUserAtBottom) {
                scrollToBottom(chatAreaId);
            }
        });
        observer.observe(chatArea, { childList: true });
    }
}

// Exporta las funciones para usarlas en otros scripts
export { scrollToBottom, observeChatArea };
