import { DbClient } from '../DbLayer/DbClient.js';
import { MainIndexInitializer } from '../IndexInitializers/MainIndexInitializer.js';
import { config } from 'dotenv';

config(); // Use Environment Variables

async function main() {
    const dbClient = new DbClient();
    await dbClient.connect();
    // TODO: Make a dummy query to MongoDB to test it is up and running (not down for maintenance etc.)

    const indexInitializer = new MainIndexInitializer(dbClient);

    await Promise.allSettled([
        indexInitializer.initializeIndexImobiliareRo(),
        // indexInitializer.initializeOlxRoIndex(),
        // indexInitializer.initializeStoriaRoIndex(),
        // indexInitializer.initializeAnuntulRoIndex(),
    ]);

    await dbClient.disconnect();
}

main();
