// ============================================
// CONFIGURACIÓN DE RENDIMIENTO
// ============================================

export const PERFORMANCE_CONFIG = {
    // Mensajes
    MAX_MESSAGES_LOAD: 50,        // Cargar solo 50 mensajes iniciales
    MAX_MESSAGES_STORE: 100,      // Mantener máximo 100 en sala
    MESSAGE_BATCH_SIZE: 10,       // Procesar 10 mensajes a la vez
    MESSAGE_RENDER_DELAY: 0,      // Sin delay para mensajes
    
    // Caché
    CACHE_DURATION: 5 * 60 * 1000,  // 5 minutos
    CACHE_CLEANUP_INTERVAL: 60000,   // Limpiar cada minuto
    
    // Usuarios
    PRELOAD_USERS_LIMIT: 10,      // Pre-cargar solo 10 usuarios
    USER_BATCH_DELAY: 20,         // 20ms para agrupar consultas
    
    // Imágenes
    IMAGE_MAX_SIZE: 800,          // Máximo 800px
    IMAGE_QUALITY: 0.7,           // 70% calidad
    LAZY_LOAD_IMAGES: true,       // Activar lazy loading
    
    // Optimizaciones
    ENABLE_VIRTUAL_SCROLL: false, // Desactivado por ahora
    ENABLE_MESSAGE_QUEUE: true,   // Cola de mensajes activada
    DEBOUNCE_TYPING: 300,         // 300ms para typing indicator
};

// Función para ajustar configuración según dispositivo
export function adjustPerformanceConfig() {
    const isMobile = /mobile|android|iphone|ipad/i.test(navigator.userAgent);
    const isSlowConnection = navigator.connection?.effectiveType === '2g' || 
                            navigator.connection?.effectiveType === 'slow-2g';
    
    if (isMobile || isSlowConnection) {
        PERFORMANCE_CONFIG.MAX_MESSAGES_LOAD = 30;
        PERFORMANCE_CONFIG.PRELOAD_USERS_LIMIT = 5;
        PERFORMANCE_CONFIG.IMAGE_MAX_SIZE = 600;
        PERFORMANCE_CONFIG.IMAGE_QUALITY = 0.6;
    }
}

// Ejecutar al cargar
adjustPerformanceConfig();
