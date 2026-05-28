const fs = require('fs');
const path = require('path');
const vm = require('vm');

const preciosPath = path.join(__dirname, '../precios.js');
const preciosCode = fs.readFileSync(preciosPath, 'utf8');

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

const scriptCode = `
    ${preciosCode}
`;
try {
    vm.runInContext(scriptCode, sandbox);
} catch (e) {
    console.error("Error evaluating script:", e);
}

sandbox.getRateInUsd = (currencyId) => {
    if (getRateInUsdMock) return getRateInUsdMock(currencyId);
    return null;
};
sandbox.getCalculatorRate = (currencyId, isFrom) => {
    if (getCalculatorRateMock) return getCalculatorRateMock(currencyId, isFrom);
    return null;
};

const calculateConversion = sandbox.calculateConversion;

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

    assertEqual(calculateConversion(null, 'usd', 'ves'), 0, 'Should return 0 for null amount');
    assertEqual(calculateConversion(NaN, 'usd', 'ves'), 0, 'Should return 0 for NaN amount');
    assertEqual(calculateConversion(0, 'usd', 'ves'), 0, 'Should return 0 for 0 amount');

    assertEqual(calculateConversion(100, 'btc', 'btc'), 100, 'Should return amount if fromId === toId');
    assertEqual(calculateConversion(50, 'ves', 'ves'), 50, 'Should return amount if fromId === toId (ves)');

    getRateInUsdMock = (currencyId) => {
        if (currencyId === 'usd') return 1;
        if (currencyId === 'btc') return 50000;
        return null;
    };
    assertEqual(calculateConversion(2, 'btc', 'usd'), 100000, 'Should convert non-VES currencies using getRateInUsd');

    assertEqual(calculateConversion(100000, 'usd', 'btc'), 2, 'Should convert non-VES currencies using getRateInUsd (reverse)');

    getRateInUsdMock = (currencyId) => {
        if (currencyId === 'usd') return 1;
        return null;
    };
    assertEqual(calculateConversion(2, 'btc', 'usd'), null, 'Should return null if getRateInUsd returns null for fromId');
    assertEqual(calculateConversion(100000, 'usd', 'btc'), null, 'Should return null if getRateInUsd returns null for toId');

    getCalculatorRateMock = (currencyId, isFrom) => {
        if (currencyId === 'usdt') return isFrom ? 40 : 38;
        if (currencyId === 'ves') return 1;
        return null;
    };

    assertEqual(calculateConversion(10, 'usdt', 'ves'), 400, 'Should convert to VES using getCalculatorRate');

    assertEqual(calculateConversion(380, 'ves', 'usdt'), 10, 'Should convert from VES using getCalculatorRate');

    getCalculatorRateMock = (currencyId, isFrom) => {
        if (currencyId === 'ves') return 1;
        return null;
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
