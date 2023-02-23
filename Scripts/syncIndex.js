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
import { consoleLog, firstSyncSource, setSyncDateForToday, useContinuousSync } from '../Helpers/Utils.js';
import delay from 'delay';
import { SOURCE_IMOBILIARE_RO } from '../Constants.js';

config(); // Use Environment Variables

let firstSourceToSync = firstSyncSource();

async function main() {
    setSyncDateForToday(); // Set SYNC_DATE Env Var.

    const mainIndexSynchronizer = new MainIndexSynchronizer();
    await mainIndexSynchronizer.sync(firstSourceToSync);

    if (useContinuousSync()) {
        consoleLog('Starting a new synchronization in 1 hour...');
        await delay(60 * 60 * 1000);
        firstSourceToSync = SOURCE_IMOBILIARE_RO;
        await main();
    }
}

await main();
