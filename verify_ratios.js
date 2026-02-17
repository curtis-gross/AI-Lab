// verify_ratios.js
const SUPPORTED_RATIOS = [
    { str: '1:1', val: 1 },
    { str: '3:4', val: 0.75 },
    { str: '4:3', val: 1.33 },
    { str: '9:16', val: 0.56 },
    { str: '16:9', val: 1.77 },
    { str: '4:5', val: 0.8 },
    { str: '5:4', val: 1.25 },
    { str: '2:3', val: 0.66 },
    { str: '3:2', val: 1.5 },
    { str: '21:9', val: 2.33 }
];

const parseRatio = (ratioStr) => {
    if (typeof ratioStr === 'number') return ratioStr;
    const match = ratioStr.match(/\(([\d.]+:\d+)\)/) || ratioStr.match(/([\d.]+:\d+)/);
    const actualRatio = match ? match[1] : ratioStr;
    const [w, h] = actualRatio.split(':').map(Number);
    if (!w || !h) return 1;
    return w / h;
};

const getClosestSupportedRatio = (targetRatioStr) => {
    if (SUPPORTED_RATIOS.some(r => r.str === targetRatioStr)) return targetRatioStr;
    const targetVal = parseRatio(targetRatioStr);
    let closest = SUPPORTED_RATIOS[0];
    let minDiff = Math.abs(targetVal - closest.val);
    for (const ratio of SUPPORTED_RATIOS) {
        const diff = Math.abs(targetVal - ratio.val);
        if (diff < minDiff) {
            minDiff = diff;
            closest = ratio;
        }
    }
    return closest.str;
};

const testCases = [
    { input: '8:1', expected: '21:9' },
    { input: '3:1', expected: '21:9' },
    { input: '2:1', expected: '16:9' },
    { input: '1.2:1', expected: '5:4' },
    { input: '1.91:1', expected: '16:9' },
    { input: '1:1', expected: '1:1' },
    { input: '9:16', expected: '9:16' },
    { input: 'Mobile Portrait (4:5)', expected: '4:5' }
];

console.log("Testing Ratio Mapping Logic...");
let passed = 0;
testCases.forEach(tc => {
    const result = getClosestSupportedRatio(tc.input);
    if (result === tc.expected) {
        console.log(`✅ ${tc.input} -> ${result}`);
        passed++;
    } else {
        console.log(`❌ ${tc.input} -> ${result} (Expected: ${tc.expected})`);
    }
});

console.log(`\nPassed ${passed}/${testCases.length} tests.`);
if (passed === testCases.length) process.exit(0);
else process.exit(1);
