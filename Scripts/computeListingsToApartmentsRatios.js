/**
 * This script can be run in order to fetch the ratio of listings to apartments
 *
 * Required ENV variables
 * ======================
 * MONGODB_USERNAME = "username"
 * MONGODB_PASSWORD = "password"
 * USE_TEST_DB = "false"
 * STATS_RESULTS_FILE_NAME = "results-ratios.csv"
 */

import { config } from 'dotenv';
import { StatsMaker } from '../Statistics/StatsMaker.js';

config(); // Use Environment Variables

async function main() {
    const statsMaker = new StatsMaker();
    await statsMaker.makeRatiosStats();
}

await main();
