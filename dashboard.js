document.addEventListener('DOMContentLoaded', () => {

    // Mapping inputs to display elements
    // Note: Some inputs update multiple elements, handled separately or via multiple entries
    const bindings = [
        { input: 'input-username', display: 'disp-username' },
        { input: 'input-days', display: 'disp-days' },
        { input: 'input-invested', display: 'disp-invested' },
        { input: 'input-sats', display: 'disp-sats' }, // We need to handle the " SAT" suffix
        { input: 'input-btc', display: 'disp-btc' },   // Handle " BTC" suffix
        { input: 'input-current-value', display: 'disp-current-value' },
        { input: 'input-avg-price', display: 'disp-avg-price' },
        { input: 'input-max-price', display: 'disp-max-price-sm' }, // Using the small display in advantage card
        // { input: 'input-min-price', display: 'disp-min-price' }, // Removed, handled below with overlay
        { input: 'input-top-month-name', display: 'disp-top-month-name' },
        { input: 'input-top-month-val', display: 'disp-top-month-val' },
        { input: 'input-min-month-name', display: 'disp-min-month-name' },
        { input: 'input-min-month-val', display: 'disp-min-month-val' }
    ];

    // Helper to format integer (strip decimals after comma or dot)
    const formatInteger = (value) => {
        // If value has a comma, take the part before it
        if (value.includes(',')) {
            return value.split(',')[0];
        }
        // If value looks like "125.000" (thousands separator), we keep it.
        // But if user enters "125.50" (decimal dot), we might want to strip.
        // Given ambiguity, we'll assume European style: dot = thousands, comma = decimal.
        // So we only strip after comma.
        return value;
    };

    // Add event listeners for text inputs
    bindings.forEach(bind => {
        const inputEl = document.getElementById(bind.input);
        const displayEl = document.getElementById(bind.display);

        if (inputEl && displayEl) {
            inputEl.addEventListener('input', () => {
                if (bind.display === 'disp-sats') {
                    displayEl.textContent = inputEl.value + ' SAT';
                } else if (bind.display === 'disp-btc') {
                    displayEl.textContent = inputEl.value + ' BTC';
                } else {
                    displayEl.textContent = inputEl.value;
                }
            });
        }
    });

    // Special handling for Max/Min Overlay prices (Multiple targets and Integer formatting)
    const maxPriceInput = document.getElementById('input-max-price');
    const minPriceInput = document.getElementById('input-min-price');
    const maxPriceOverlay = document.getElementById('disp-max-price-overlay');
    const minPriceOverlay = document.getElementById('disp-min-price-overlay');

    if (maxPriceInput && maxPriceOverlay) {
        maxPriceInput.addEventListener('input', () => {
            maxPriceOverlay.textContent = formatInteger(maxPriceInput.value);
            // Also trigger the existing binding for disp-max-price-sm is handled above by bindings array
        });
        // Init value
         maxPriceOverlay.textContent = formatInteger(maxPriceInput.value);
    }

    if (minPriceInput && minPriceOverlay) {
        minPriceInput.addEventListener('input', () => {
            minPriceOverlay.textContent = formatInteger(minPriceInput.value);
        });
        // Init value
        minPriceOverlay.textContent = formatInteger(minPriceInput.value);
    }

    // Image Upload Handling
    const imageInput = document.getElementById('input-chart-image');
    const chartImg = document.getElementById('disp-chart-img');
    const chartPlaceholder = document.getElementById('chart-placeholder');

    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();

            reader.onload = function(e) {
                chartImg.src = e.target.result;
                chartImg.style.display = 'block';
                if (chartPlaceholder) {
                    chartPlaceholder.style.display = 'none';
                }
            }

            reader.readAsDataURL(file);
        }
    });

    // Download Functionality
    const downloadBtn = document.getElementById('btn-download');

    downloadBtn.addEventListener('click', () => {
        const captureTarget = document.getElementById('capture-target');

        // Use html2canvas to capture the element
        // Note: html2canvas must be loaded in the global scope via the script tag in HTML
        if (typeof html2canvas !== 'undefined') {
            html2canvas(captureTarget, {
                backgroundColor: null, // Transparent background if set in CSS, but card has color
                scale: 2, // Higher resolution
                useCORS: true // Attempt to load cross-origin images if any
            }).then(canvas => {
                // Create a dummy link to trigger download
                const link = document.createElement('a');
                link.download = 'btc-dca-dashboard.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            }).catch(err => {
                console.error('Error generating image:', err);
                alert('Hubo un error al generar la imagen. Asegúrate de que todos los recursos se hayan cargado.');
            });
        } else {
            alert('La librería html2canvas no está cargada.');
        }
    });

    // Share Functionality
    const shareBtn = document.getElementById('btn-share');

    shareBtn.addEventListener('click', () => {
        const captureTarget = document.getElementById('capture-target');

        // Get values for message
        const sats = document.getElementById('input-sats').value;
        const days = document.getElementById('input-days').value;
        const shareText = `¡He acumulado ${sats} SATs en ${days} días! 🚀 este es mi #RetoBitcoin365Wrapped`;

        if (typeof html2canvas !== 'undefined') {
            html2canvas(captureTarget, {
                backgroundColor: null,
                scale: 2,
                useCORS: true
            }).then(canvas => {
                canvas.toBlob(blob => {
                    const file = new File([blob], 'btc-dca-dashboard.png', { type: 'image/png' });

                    if (navigator.share) {
                        navigator.share({
                            title: 'BTC DCA Wrapped 2025',
                            text: shareText,
                            files: [file]
                        })
                        .catch(err => {
                            if (err.name !== 'AbortError') {
                                console.error('Error sharing:', err);
                                alert('Error al compartir. Intenta descargar la imagen manualmente.');
                            }
                        });
                    } else {
                        alert('Tu navegador no soporta la función de compartir nativa. Por favor usa el botón de Descargar.');
                    }
                }, 'image/png');
            }).catch(err => {
                console.error('Error generating image for share:', err);
                alert('Hubo un error al generar la imagen para compartir.');
            });
        } else {
            alert('La librería html2canvas no está cargada.');
        }
    });

});
