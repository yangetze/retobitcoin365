document.addEventListener('DOMContentLoaded', () => {

    // Mapping inputs to display elements
    const bindings = [
        { input: 'input-username', display: 'disp-username' },
        { input: 'input-days', display: 'disp-days' },
        { input: 'input-invested', display: 'disp-invested' },
        { input: 'input-sats', display: 'disp-sats' }, // We need to handle the " SAT" suffix
        { input: 'input-btc', display: 'disp-btc' },   // Handle " BTC" suffix
        { input: 'input-current-value', display: 'disp-current-value' },
        { input: 'input-avg-price', display: 'disp-avg-price' },
        { input: 'input-max-price', display: 'disp-max-price-sm' }, // Using the small display in advantage card
        { input: 'input-max-price', display: 'disp-max-price-chart' }, // Added for chart overlay
        { input: 'input-min-price', display: 'disp-min-price' }, // Added per review
        { input: 'input-top-month-name', display: 'disp-top-month-name' },
        { input: 'input-top-month-val', display: 'disp-top-month-val' },
        { input: 'input-min-month-name', display: 'disp-min-month-name' },
        { input: 'input-min-month-val', display: 'disp-min-month-val' }
    ];

    // Add event listeners for text inputs
    bindings.forEach(bind => {
        const inputEl = document.getElementById(bind.input);
        const displayEl = document.getElementById(bind.display);

        if (inputEl && displayEl) {
            inputEl.addEventListener('input', () => {
                // Special handling for Suffixes if needed,
                // but currently the HTML structure has the suffix outside the span for some, inside for others.
                // Let's check HTML:
                // <span id="disp-sats">360.809 SAT</span> -> Wait, I put SAT inside the span text in HTML initially?
                // Let's check: <span id="disp-sats">360.809 SAT</span>.
                // If I replace textContent, I lose " SAT".
                // Correction: I should update the plan to ensure suffixes are handled or just append them here.

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

});
