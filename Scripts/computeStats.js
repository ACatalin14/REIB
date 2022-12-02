import { config } from 'dotenv';
import { StatsMaker } from '../Statistics/StatsMaker.js';

config(); // Use Environment Variables

async function main() {
    const statsMaker = new StatsMaker();
    await statsMaker.makeStats();
}

await main();
