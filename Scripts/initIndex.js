import { config } from 'dotenv';
import { MainIndexInitializer } from '../IndexInitializers/MainIndexInitializer.js';

config(); // Use Environment Variables

async function main() {
    const mainIndexInitializer = new MainIndexInitializer();
    await mainIndexInitializer.init();
}

await main();
