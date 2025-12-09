// Función global para limpiar todos los tags de rango del chat
export function cleanAllRankTags() {
    const messages = document.querySelectorAll('.message-container');
    messages.forEach(msg => {
        const header = msg.querySelector('.message-header');
        if (header) {
            header.querySelectorAll('.admin-tag, .mod-tag, .dev-tag').forEach(tag => {
                tag.remove();
            });
        }
    });
}
