// Currency Definitions
const CURRENCIES = {
    'btc': {
        name: 'Bitcoin (BTC)',
        icon: 'fa-brands fa-bitcoin',
        colorClass: 'btc-color',
        priceId: 'price-btc',
        currency: 'USD'
    },
    'usdt': {
        name: 'USDT (Binance P2P)',
        icon: 'fa-solid fa-circle-dollar-to-slot',
        colorClass: 'usdt-color',
        priceId: 'price-usdt',
        currency: 'VES (Bolívares)'
    },
    'usd-bcv': {
        name: 'Dólar BCV (Oficial)',
        icon: 'fa-solid fa-money-bill-wave',
        colorClass: 'usd-color',
        priceId: 'price-usd-bcv',
        currency: 'VES (Bolívares)'
    },
    'eur-bcv': {
        name: 'Euro BCV (Estimado)',
        icon: 'fa-solid fa-euro-sign',
        colorClass: 'eur-color',
        priceId: 'price-eur-bcv',
        currency: 'VES (Bolívares)'
    }
};

// Default Configuration
const DEFAULT_CONFIG = [
    { id: 'btc', visible: true },
    { id: 'usdt', visible: true },
    { id: 'usd-bcv', visible: true },
    { id: 'eur-bcv', visible: true }
];

let currentConfig = [];
let pricesCache = {};
let lastSyncTime = null;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadConfig();
    renderGrid();
    setupEventListeners();
    fetchPrices();
    registerSW();

    // Update relative time in tooltip every minute
    setInterval(updateLastSyncUI, 60000);
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

function loadConfig() {
    const saved = localStorage.getItem('currencyConfig');
    if (saved) {
        try {
            currentConfig = JSON.parse(saved);
            // Basic validation to ensure all IDs exist in CURRENCIES
            // If we add new currencies in future, we might need to merge.
            // For now, if length differs, let's reset or merge.
            // Simple merge: add missing ones from DEFAULT.
            DEFAULT_CONFIG.forEach(defItem => {
                if (!currentConfig.find(c => c.id === defItem.id)) {
                    currentConfig.push(defItem);
                }
            });
        } catch (e) {
            console.error('Error parsing config', e);
            currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        }
    } else {
        currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }
}

function saveConfig() {
    localStorage.setItem('currencyConfig', JSON.stringify(currentConfig));
}

function renderGrid() {
    const grid = document.getElementById('prices-grid');
    grid.innerHTML = '';

    currentConfig.forEach(item => {
        if (!item.visible) return;

        const def = CURRENCIES[item.id];
        if (!def) return;

        const card = document.createElement('div');
        card.className = 'price-card';
        card.innerHTML = `
            <button class="copy-btn" onclick="copyPrice('${def.priceId}', this)" title="Copiar precio">
                <i class="fa-regular fa-copy"></i>
            </button>
            <div class="card-icon ${def.colorClass}">
                <i class="${def.icon}"></i>
            </div>
            <div class="card-title">${def.name}</div>
            <div class="card-price" id="${def.priceId}"><span class="loading">...</span></div>
            <div class="card-currency">${def.currency}</div>
        `;
        grid.appendChild(card);
    });

    // Restore prices if we have them in cache
    restorePricesFromCache();
}

function setupEventListeners() {
    // Refresh Button
    const refreshBtn = document.getElementById('refresh-btn');
    refreshBtn.addEventListener('click', async () => {
        const icon = refreshBtn.querySelector('i');
        icon.classList.add('spin');
        await fetchPrices();
        setTimeout(() => icon.classList.remove('spin'), 500);
    });

    // Settings Button & Modal
    const settingsBtn = document.getElementById('settings-btn');
    const modal = document.getElementById('settings-modal');
    const closeBtn = document.querySelector('.close-modal');
    const closeActionBtn = document.getElementById('close-settings-btn');

    settingsBtn.addEventListener('click', () => {
        renderSettingsList();
        modal.classList.add('show');
    });

    const closeModal = () => modal.classList.remove('show');
    closeBtn.addEventListener('click', closeModal);
    closeActionBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

function renderSettingsList() {
    const list = document.getElementById('settings-list');
    list.innerHTML = '';

    currentConfig.forEach((item, index) => {
        const def = CURRENCIES[item.id];
        if (!def) return;

        const div = document.createElement('div');
        div.className = 'settings-item';
        div.innerHTML = `
            <div class="item-info">
                <i class="${def.icon}" style="color: var(--text-color); opacity: 0.7;"></i>
                <span>${def.name}</span>
            </div>
            <div class="item-controls">
                <button class="control-btn" onclick="moveItem(${index}, -1)" ${index === 0 ? 'disabled' : ''} title="Subir">
                    <i class="fa-solid fa-arrow-up"></i>
                </button>
                <button class="control-btn" onclick="moveItem(${index}, 1)" ${index === currentConfig.length - 1 ? 'disabled' : ''} title="Bajar">
                    <i class="fa-solid fa-arrow-down"></i>
                </button>
                <input type="checkbox" id="toggle-${item.id}" class="toggle-input" ${item.visible ? 'checked' : ''} onchange="toggleItem('${item.id}')">
                <label for="toggle-${item.id}" class="toggle-label"></label>
            </div>
        `;
        list.appendChild(div);
    });
}

// Global functions for inline event handlers
window.moveItem = (index, direction) => {
    if (direction === -1 && index > 0) {
        [currentConfig[index], currentConfig[index - 1]] = [currentConfig[index - 1], currentConfig[index]];
    } else if (direction === 1 && index < currentConfig.length - 1) {
        [currentConfig[index], currentConfig[index + 1]] = [currentConfig[index + 1], currentConfig[index]];
    }
    saveConfig();
    renderSettingsList();
    renderGrid();
};

window.toggleItem = (id) => {
    const item = currentConfig.find(c => c.id === id);
    if (item) {
        item.visible = !item.visible;
        saveConfig();
        renderGrid();
    }
};

async function fetchPrices() {
    // 1. Bitcoin (USD)
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        const data = await res.json();
        const btcPrice = data.bitcoin.usd;
        updatePrice('price-btc', btcPrice, '$', 2);
    } catch (e) {
        console.error('BTC Error:', e);
        updatePriceError('price-btc');
    }

    // 2. USDT Binance (VES)
    try {
        const res = await fetch('https://criptoya.com/api/usdt/ves/1');
        const data = await res.json();
        const usdtPrice = data.binancep2p.ask;
        updatePrice('price-usdt', usdtPrice, 'Bs.', 2);
    } catch (e) {
        console.error('USDT Error:', e);
        updatePriceError('price-usdt');
    }

    // 3. Dolar BCV (Oficial) and 4. Euro BCV (Derived)
    try {
        const resUSD = await fetch('https://ve.dolarapi.com/v1/dolares');
        const dataUSD = await resUSD.json();
        const oficialData = dataUSD.find(d => d.fuente === 'oficial');

        if (oficialData) {
            const usdVal = oficialData.promedio || oficialData.venta;
            updatePrice('price-usd-bcv', usdVal, 'Bs.', 2);

            try {
                const resEur = await fetch('https://open.er-api.com/v6/latest/USD');
                const dataEur = await resEur.json();
                const eurRate = dataEur.rates.EUR;
                const eurToUsd = 1 / eurRate;
                const eurVes = eurToUsd * usdVal;

                updatePrice('price-eur-bcv', eurVes, 'Bs.', 2);
            } catch (errEur) {
                console.error('Euro Calc Error:', errEur);
                updatePriceError('price-eur-bcv');
            }

        } else {
            throw new Error('No official source found');
        }

    } catch (e) {
        console.error('BCV Error:', e);
        updatePriceError('price-usd-bcv');
        updatePriceError('price-eur-bcv');
    }

    lastSyncTime = new Date();
    updateLastSyncUI();
}

function updateLastSyncUI() {
    if (!lastSyncTime) return;

    // Format Date for Display: dd/MM/yyyy HH:mm
    const day = String(lastSyncTime.getDate()).padStart(2, '0');
    const month = String(lastSyncTime.getMonth() + 1).padStart(2, '0');
    const year = lastSyncTime.getFullYear();
    const hours = String(lastSyncTime.getHours()).padStart(2, '0');
    const minutes = String(lastSyncTime.getMinutes()).padStart(2, '0');

    const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}`;

    const dateEl = document.getElementById('last-sync-date');
    if (dateEl) {
        dateEl.innerText = formattedDate;
    }

    // Calculate Relative Time for Tooltip
    const now = new Date();
    const diffMs = now - lastSyncTime;
    const diffMins = Math.floor(diffMs / 60000);

    let timeString = '';
    if (diffMins < 1) {
        timeString = 'menos de 1 min';
    } else if (diffMins < 60) {
        timeString = `${diffMins} min`;
    } else {
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) {
            timeString = `${diffHours} h`;
        } else {
            const diffDays = Math.floor(diffHours / 24);
            timeString = `${diffDays} días`;
        }
    }

    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.title = `Actualizar precios. Ult. sincronización ${timeString}.`;
    }
}

function updatePrice(elementId, value, prefix = '', decimals = 2) {
    // Save to cache
    pricesCache[elementId] = { value, prefix, decimals, error: false };

    const el = document.getElementById(elementId);
    if (!el) return;

    const formattedES = value.toLocaleString('es-VE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });

    el.innerText = `${prefix} ${formattedES}`;
}

function updatePriceError(elementId) {
    pricesCache[elementId] = { error: true };
    const el = document.getElementById(elementId);
    if (el) {
        el.innerText = 'Error';
    }
}

function restorePricesFromCache() {
    for (const [id, data] of Object.entries(pricesCache)) {
        if (data.error) {
            updatePriceError(id);
        } else {
            updatePrice(id, data.value, data.prefix, data.decimals);
        }
    }
}

function registerSW() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('SW Registered'))
        .catch(err => console.log('SW Error:', err));
    }
}

window.copyPrice = (elementId, btn) => {
    const el = document.getElementById(elementId);
    if (!el) return;

    // Check if loading
    if (el.querySelector('.loading')) return;

    let text = el.innerText;

    // Use cached value if available to get raw number without currency symbol
    if (pricesCache[elementId] && !pricesCache[elementId].error) {
        const { value, decimals } = pricesCache[elementId];
        text = value.toLocaleString('es-VE', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    navigator.clipboard.writeText(text).then(() => {
        const icon = btn.querySelector('i');
        const originalClass = icon.className;

        icon.className = 'fa-solid fa-check';
        setTimeout(() => {
            icon.className = originalClass;
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
};
