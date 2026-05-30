const fs = require('fs');
const path = require('path');
const vm = require('vm');

const preciosPath = path.join(__dirname, '../precios.js');
const preciosCode = fs.readFileSync(preciosPath, 'utf8');

// We will inject a mocked pricesCache into the sandbox
let mockPricesCache = {};

const sandbox = {
    window: { addEventListener: () => {} },
    document: {
        addEventListener: () => {},
        getElementById: () => ({ innerHTML: '', addEventListener: () => {}, value: '', style: {} }),
        querySelector: () => ({ innerHTML: '', addEventListener: () => {}, value: '', style: {} }),
        querySelectorAll: () => [],
        createElement: () => ({ className: '', dataset: {}, innerHTML: '' }),
        createDocumentFragment: () => ({ appendChild: () => {} })
    },
    localStorage: { getItem: () => null, setItem: () => {} },
    navigator: {},
    setInterval: () => {},
    setTimeout: () => {},
    console: {
        log: () => {},
        error: () => {}
    },
    isNaN: isNaN,
    parseFloat: parseFloat,
    Math: Math,
    pricesCache: mockPricesCache
};

vm.createContext(sandbox);


const scriptCode = `
    ${preciosCode}
    window.setMockCache = function(cache) {
        pricesCache = cache;
    };
`;

try {
    vm.runInContext(scriptCode, sandbox);
} catch (e) {
    console.error("Error evaluating script:", e);
}

const calculateConversion = sandbox.calculateConversion;


let passed = 0;
let failed = 0;

function assertEqual(actual, expected, testName) {
    // Handling small floating point differences
    if (actual === expected || (Number.isNaN(actual) && Number.isNaN(expected)) || Math.abs(actual - expected) < 0.0001) {
        console.log("✅ PASS: " + testName);
        passed++;
    } else {
        console.error("❌ FAIL: " + testName);
        console.error("   Expected: " + expected);
        console.error("   Actual: " + actual);
        failed++;
    }
}

function runTests() {
    console.log('Running tests for calculateConversion (VES bridge)...');

    // 1. Basic edges cases
    assertEqual(calculateConversion(null, 'usd', 'ves'), 0, 'Should return 0 for null amount');
    assertEqual(calculateConversion(NaN, 'usd', 'ves'), 0, 'Should return 0 for NaN amount');
    assertEqual(calculateConversion(0, 'usd', 'ves'), 0, 'Should return 0 for 0 amount');
    assertEqual(calculateConversion(100, 'btc', 'btc'), 100, 'Should return amount if fromId === toId');

    // Setup typical cache values
    // usd: 35 Bs
    // eur: 38 Bs
    // usdt: bid 39 Bs, ask 40 Bs
    // btc: 60000 USD
    // cop: 4000 COP = 1 USD

    sandbox.window.setMockCache({
        'price-usd-bcv': { value: 35, error: false },
        'price-eur-bcv': { value: 38, error: false },
        'price-usdt': { bid: 39, value: 40, error: false },
        'price-btc': { value: 60000, error: false },
        'price-cop': { value: 4000, error: false }
    });

    // 2. Simple to VES
    assertEqual(calculateConversion(10, 'usd', 'ves'), 350, '10 USD to VES = 350');
    assertEqual(calculateConversion(10, 'eur', 'ves'), 380, '10 EUR to VES = 380');

    // 3. USDT to VES (selling USDT, use Bid = 39)
    assertEqual(calculateConversion(10, 'usdt', 'ves'), 390, '10 USDT to VES (bid) = 390');

    // 4. VES to USDT (buying USDT, use Ask = 40)
    assertEqual(calculateConversion(400, 'ves', 'usdt'), 10, '400 VES to USDT (ask) = 10');

    // 5. Global currencies
    // 1 BTC = 60000 USD. 1 USD = 35 VES. So 1 BTC = 2,100,000 VES.
    assertEqual(calculateConversion(1, 'btc', 'ves'), 2100000, '1 BTC to VES = 2,100,000');

    // COP in VES = USD_VES / COP_USD = 35 / 4000 = 0.00875 VES per COP
    assertEqual(calculateConversion(4000, 'cop', 'ves'), 35, '4000 COP to VES = 35');

    // 6. Cross conversions (not involving VES directly)
    // USD (35 VES) to USDT (Ask = 40 VES) -> 100 USD = 3500 VES -> 3500 / 40 = 87.5 USDT
    assertEqual(calculateConversion(100, 'usd', 'usdt'), 87.5, '100 USD to USDT');

    // USDT (Bid = 39 VES) to USD (35 VES) -> 100 USDT = 3900 VES -> 3900 / 35 = 111.42857 USD
    assertEqual(calculateConversion(100, 'usdt', 'usd'), 100 * 39 / 35, '100 USDT to USD');

    // COP to USDT -> 400,000 COP = 100 USD = 3500 VES -> 3500 / 40 = 87.5 USDT
    assertEqual(calculateConversion(400000, 'cop', 'usdt'), 87.5, '400,000 COP to USDT');

    console.log('\n--- Test Summary ---');
    console.log("Passed: " + passed);
    console.log("Failed: " + failed);

    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
