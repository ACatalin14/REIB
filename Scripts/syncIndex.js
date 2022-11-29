import { config } from 'dotenv';
import { MainIndexSynchronizer } from '../IndexSynchronizers/MainIndexSynchronizer.js';

config(); // Use Environment Variables

async function main() {
    const mainIndexSynchronizer = new MainIndexSynchronizer();
    await mainIndexSynchronizer.sync();
}

await main();