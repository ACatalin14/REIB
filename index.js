import { consoleLog } from './Helpers/Utils.js';
import express from 'express';
import { router } from './router.js';
import { config } from 'dotenv';

config(); // Use Environment Variables

consoleLog('REIB has been deployed!');

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/api', router);

app.listen(PORT, () => consoleLog(`REIB Server is listening on port ${PORT}.`));
