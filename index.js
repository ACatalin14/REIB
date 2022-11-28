import { consoleLog } from './Helpers/Utils.js';
import Chromium from 'chrome-aws-lambda';

consoleLog('REIB has been deployed!');

(async () => {
    const path = await Chromium.executablePath;
    consoleLog(`Chromium can be found at ${path}`);
})();
