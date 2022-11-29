import { consoleLog } from './Helpers/Utils.js';
import downloadChromium from 'download-chromium';
import fs from 'fs';
import os from 'os';

consoleLog('REIB has been deployed!');

(async () => {
    consoleLog('Ready to download Chromium.');

    if (fs.existsSync('/tmp')) {
        consoleLog('The path /tmp exists!');
    } else {
        consoleLog('The path /tmp does not exist! Creating it.');
        fs.mkdirSync('/tmp', { recursive: true });
    }

    const path = await downloadChromium({
        installPath: '/tmp/.local-chromium',
        log: true,
    });

    consoleLog(`Downloaded Chromium to ${path}`);
})();
