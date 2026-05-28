// script.js

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
            })
            .catch(err => {
                console.error('ServiceWorker registration failed: ', err);
            });
    });
}
