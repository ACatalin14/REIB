import { consoleLog } from './Helpers/Utils.js';
import downloadChromium from 'download-chromium';

consoleLog('REIB has been deployed!');

(async () => {
    consoleLog('Ready to download Chromium.');
    const path = await downloadChromium();
    consoleLog(`Downloaded Chromium to ${path}`);
})();
