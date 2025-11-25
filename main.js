import { observeChatArea } from './scrollToBottom.js';

// Observa el área de chat después de que la página cargue
document.addEventListener('DOMContentLoaded', () => {
    observeChatArea('chat-area');
});
