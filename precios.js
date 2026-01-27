document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchPrices();
    setupRefresh();
    registerSW();
});

function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const icon = themeToggle.querySelector('i');
    const body = document.body;

    // Check saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }

    // Toggle event
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');

        if (isDark) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            localStorage.setItem('theme', 'dark');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            localStorage.setItem('theme', 'light');
        }
    });
}

function setupRefresh() {
    const refreshBtn = document.getElementById('refresh-btn');
    refreshBtn.addEventListener('click', () => {
        // Add rotation animation
        const icon = refreshBtn.querySelector('i');
        icon.classList.add('fa-spin');

        // Reset prices to loading state to give feedback
        const ids = ['price-btc', 'price-usdt', 'price-usd-bcv', 'price-eur-bcv'];
        ids.forEach(id => {
            document.getElementById(id).innerHTML = '<span class="loading">...</span>';
        });

        fetchPrices().then(() => {
            // Remove animation after a short delay so user sees it happened
            setTimeout(() => {
                icon.classList.remove('fa-spin');
            }, 500);
        });
    });
}

async function fetchPrices() {
    // 1. Bitcoin (USD)
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        const data = await res.json();
        const btcPrice = data.bitcoin.usd;
        updatePrice('price-btc', btcPrice, '$', 2);
    } catch (e) {
        console.error('BTC Error:', e);
        document.getElementById('price-btc').innerText = 'Error';
    }

    // 2. USDT Binance (VES)
    try {
        const res = await fetch('https://criptoya.com/api/usdt/ves/1');
        const data = await res.json();
        // Use binancep2p ask (lowest price to buy)
        const usdtPrice = data.binancep2p.ask;
        updatePrice('price-usdt', usdtPrice, 'Bs.', 2);
    } catch (e) {
        console.error('USDT Error:', e);
        document.getElementById('price-usdt').innerText = 'Error';
    }

    // 3. Dolar BCV (Oficial) and 4. Euro BCV (Derived)
    try {
        // Fetch BCV USD
        const resUSD = await fetch('https://ve.dolarapi.com/v1/dolares');
        const dataUSD = await resUSD.json();
        const oficialData = dataUSD.find(d => d.fuente === 'oficial');

        if (oficialData) {
            const usdVal = oficialData.promedio || oficialData.venta;
            updatePrice('price-usd-bcv', usdVal, 'Bs.', 2);

            // Fetch Global EUR/USD to calculate Euro BCV
            try {
                const resEur = await fetch('https://open.er-api.com/v6/latest/USD');
                const dataEur = await resEur.json();
                const eurRate = dataEur.rates.EUR; // This is USD -> EUR (e.g. 0.92)

                // We need EUR value in VES.
                // USD/VES = X
                // 1 EUR = (1 / EUR_RATE) USD
                // EUR/VES = (1 / EUR_RATE) * USD/VES

                const eurToUsd = 1 / eurRate;
                const eurVes = eurToUsd * usdVal;

                updatePrice('price-eur-bcv', eurVes, 'Bs.', 2);
            } catch (errEur) {
                console.error('Euro Calc Error:', errEur);
                document.getElementById('price-eur-bcv').innerText = 'Error';
            }

        } else {
            throw new Error('No official source found');
        }

    } catch (e) {
        console.error('BCV Error:', e);
        document.getElementById('price-usd-bcv').innerText = 'Error';
        document.getElementById('price-eur-bcv').innerText = 'Error';
    }
}

function updatePrice(elementId, value, prefix = '', decimals = 2) {
    const el = document.getElementById(elementId);
    // Format number: e.g. 3,500.00
    // Use Spanish locale for display preference usually in Venezuela but ensuring dot for thousands if preferred
    // or just standard. Let's stick to es-VE.
    const formattedES = value.toLocaleString('es-VE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });

    el.innerText = `${prefix} ${formattedES}`;
}

function registerSW() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('SW Registered'))
        .catch(err => console.log('SW Error:', err));
    }
}
