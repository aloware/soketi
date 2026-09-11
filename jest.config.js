module.exports = {
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    testTimeout: 20 * 1000,
    collectCoverage: true,
    maxWorkers: 1,
    globals: {
        Uint8Array: Uint8Array,
    },
};
