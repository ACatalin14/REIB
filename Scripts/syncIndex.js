/**
 * This script is destined to be run once a day (preferably in the middle of the day),
 * in order to collect data about new, updated, and closed listings from various
 * romanian real estate platforms.
 *
 * This way, the indexer can update the state of its own index of listings, depending
 * on the newly closed listings detected on a daily basis.
 */

import { config } from 'dotenv';
import { MainIndexSynchronizer } from '../IndexBuilders/IndexSynchronizers/MainIndexSynchronizer.js';

config(); // Use Environment Variables

async function main() {
    const mainIndexSynchronizer = new MainIndexSynchronizer();
    await mainIndexSynchronizer.sync();
}

await main();
