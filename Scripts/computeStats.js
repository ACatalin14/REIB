/**
 * This script can be run anytime on demand, in order to make some statistics of all
 * the listings, apartments and sold apartments, for the reference month, specified in
 * the STATS_REFERENCE_MONTH environment variable in MM.YYYY format (e.g. "01.2023")
 */

import { config } from 'dotenv';
import { StatsMaker } from '../Statistics/StatsMaker.js';

config(); // Use Environment Variables

async function main() {
    const statsMaker = new StatsMaker();
    await statsMaker.makeStats();
}

await main();
