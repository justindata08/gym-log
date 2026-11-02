// Runs the tests in Node: node tests/run-node.mjs
import { readFileSync } from 'node:fs';
import { runTests } from './tests.js';

const source = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
const { failed } = await runTests(source);
process.exit(failed ? 1 : 0);
