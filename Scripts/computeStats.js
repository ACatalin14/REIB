/**
 * This script is destined to be run only once a month, at the end of the month,
 * after all of the indexes have been computed, in order to make some monthly
 * statistics about the market listings, closed listings, and distinct listings.
 */

import { config } from 'dotenv';
import { StatsMaker } from '../Statistics/StatsMaker.js';

config(); // Use Environment Variables

async function main() {
    const statsMaker = new StatsMaker();
    await statsMaker.makeStats();
}

await main();
