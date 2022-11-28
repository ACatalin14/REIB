import { config } from 'dotenv';
import { START_DELAY } from '../Constants.js';
import { DbClient } from '../DbLayer/DbClient.js';
import { MainIndexSynchronizer } from '../IndexSynchronizers/MainIndexSynchronizer.js';

config(); // Use Environment Variables

async function main() {
    const dbClient = new DbClient();
    await dbClient.connect();

    // TODO: Make a test request to MongoDB to check it is up and running (not down for maintenance etc.)

    const indexSynchronizer = new MainIndexSynchronizer(dbClient);

    await indexSynchronizer.syncIndexImobiliareRo();
    // await indexSynchronizer.syncIndexOlxRo();
    // await indexSynchronizer.syncIndexStoriaRo();
    // await indexSynchronizer.syncIndexAnuntulRo();

    await dbClient.disconnect();
}

// Start with a random delay (at most 10 mins)
setTimeout(main, START_DELAY);
