/**
 * This script is destined to be run only once at the beginning of the web scraping
 * project, at the beginning of a calendar's month, in order to collect all the available
 * listings from the romanian real estate platforms.
 *
 * This way, the indexer can obtain an initial state on which he can further synchronize.
 */

import { config } from 'dotenv';
import { MainIndexInitializer } from '../IndexBuilders/IndexInitializers/MainIndexInitializer.js';

config(); // Use Environment Variables

async function main() {
    const mainIndexInitializer = new MainIndexInitializer();
    await mainIndexInitializer.init();
}

await main();
