// auth-check.js - Verificación de autenticación y routing
(function() {
    const currentUser = localStorage.getItem('currentUser');
    const hash = window.location.hash;
    
    if (!currentUser) {
        window.location.replace('/login.html');
        return;
    }
    
    if (!hash || hash === '#') {
        window.location.hash = 'general';
    }
})();
