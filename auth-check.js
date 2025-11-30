// auth-check.js - DISABLED TEMPORARILY
(function() {
    console.log('Auth check disabled');
    const hash = window.location.hash;
    if (!hash || hash === '#') {
        history.replaceState(null, null, '#general');
    }
})();
