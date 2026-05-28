const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Read the precios.js file
const preciosPath = path.join(__dirname, '../precios.js');
const preciosCode = fs.readFileSync(preciosPath, 'utf8');

// Define our mocks
let getRateInUsdMock = null;
let getCalculatorRateMock = null;

const sandbox = {
    window: { addEventListener: () => {} },
    document: {
        addEventListener: () => {},
        getElementById: () => ({ innerHTML: '', addEventListener: () => {}, value: '', style: {} }),
        querySelector: () => ({ innerHTML: '', addEventListener: () => {}, value: '', style: {} }),
        querySelectorAll: () => []
    },
    localStorage: { getItem: () => null, setItem: () => {} },
    navigator: {},
    setInterval: () => {},
    setTimeout: () => {},
    console: console,
    isNaN: isNaN,
    Math: Math,
    getRateInUsd: (currencyId) => {
        if (getRateInUsdMock) return getRateInUsdMock(currencyId);
        return null;
    },
    getCalculatorRate: (currencyId, isFrom) => {
        if (getCalculatorRateMock) return getCalculatorRateMock(currencyId, isFrom);
        return null;
    }
};

vm.createContext(sandbox);

// Run the script in the context. We replace the functions we mocked to avoid overwriting them
// We can just extract the calculateConversion code, or run the whole thing
const scriptCode = `
    ${preciosCode}
`;
try {
    vm.runInContext(scriptCode, sandbox);
} catch (e) {
    // Ignore errors from missing DOM APIs, we only care that calculateConversion is defined
    console.error("Error evaluating script:", e);
}

// Ensure the mocked functions are actually used by calculateConversion
// Since calculateConversion is a top level function, it will use the mocked getRateInUsd
// only if getRateInUsd is not overridden in the script itself.
// Let's actually override the functions inside the sandbox *after* the script runs
sandbox.getRateInUsd = (currencyId) => {
    if (getRateInUsdMock) return getRateInUsdMock(currencyId);
    return null;
};
sandbox.getCalculatorRate = (currencyId, isFrom) => {
    if (getCalculatorRateMock) return getCalculatorRateMock(currencyId, isFrom);
    return null;
};

const calculateConversion = sandbox.calculateConversion;

// Test runner
let passed = 0;
let failed = 0;

function assertEqual(actual, expected, testName) {
    if (actual === expected || (Number.isNaN(actual) && Number.isNaN(expected))) {
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
    console.log('Running tests for calculateConversion...');

    // Test 1: Invalid amount
    assertEqual(calculateConversion(null, 'usd', 'ves'), 0, 'Should return 0 for null amount');
    assertEqual(calculateConversion(NaN, 'usd', 'ves'), 0, 'Should return 0 for NaN amount');
    assertEqual(calculateConversion(0, 'usd', 'ves'), 0, 'Should return 0 for 0 amount');

    // Test 2: Same currency
    assertEqual(calculateConversion(100, 'btc', 'btc'), 100, 'Should return amount if fromId === toId');
    assertEqual(calculateConversion(50, 'ves', 'ves'), 50, 'Should return amount if fromId === toId (ves)');

    // Test 3: Neither currency is VES (uses getRateInUsd)
    getRateInUsdMock = (currencyId) => {
        if (currencyId === 'usd') return 1;
        if (currencyId === 'btc') return 50000;
        return null;
    };
    // 2 BTC -> USD = 2 * 50000 / 1 = 100000
    assertEqual(calculateConversion(2, 'btc', 'usd'), 100000, 'Should convert non-VES currencies using getRateInUsd');

    // 100000 USD -> BTC = 100000 * 1 / 50000 = 2
    assertEqual(calculateConversion(100000, 'usd', 'btc'), 2, 'Should convert non-VES currencies using getRateInUsd (reverse)');

    // Test 4: One or both getRateInUsd returns null
    getRateInUsdMock = (currencyId) => {
        if (currencyId === 'usd') return 1;
        return null; // btc returns null
    };
    assertEqual(calculateConversion(2, 'btc', 'usd'), null, 'Should return null if getRateInUsd returns null for fromId');
    assertEqual(calculateConversion(100000, 'usd', 'btc'), null, 'Should return null if getRateInUsd returns null for toId');

    // Test 5: Fallback to original logic if VES is involved
    getCalculatorRateMock = (currencyId, isFrom) => {
        if (currencyId === 'usdt') return isFrom ? 40 : 38; // 40 selling, 38 buying
        if (currencyId === 'ves') return 1;
        return null;
    };

    // 10 USDT -> VES: Amount(10) * fromRate(usdt, true=40) / toRate(ves, false=1) = 400
    assertEqual(calculateConversion(10, 'usdt', 'ves'), 400, 'Should convert to VES using getCalculatorRate');

    // 380 VES -> USDT: Amount(380) * fromRate(ves, true=1) / toRate(usdt, false=38) = 10
    assertEqual(calculateConversion(380, 'ves', 'usdt'), 10, 'Should convert from VES using getCalculatorRate');

    // Test 6: getCalculatorRate returns null
    getCalculatorRateMock = (currencyId, isFrom) => {
        if (currencyId === 'ves') return 1;
        return null; // usdt returns null
    };
    assertEqual(calculateConversion(10, 'usdt', 'ves'), null, 'Should return null if getCalculatorRate returns null for fromId');
    assertEqual(calculateConversion(380, 'ves', 'usdt'), null, 'Should return null if getCalculatorRate returns null for toId');

    console.log('\n--- Test Summary ---');
    console.log("Passed: " + passed);
    console.log("Failed: " + failed);

    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
