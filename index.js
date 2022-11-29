import { consoleLog } from './Helpers/Utils.js';
import downloadChromium from 'download-chromium';
import fs from 'fs';

consoleLog('REIB has been deployed!');

(async () => {
    consoleLog('Ready to download Chromium.');

    if (fs.existsSync('/tmp/.local-chromium')) {
        consoleLog('The path /tmp/.local-chromium exists!');
    } else {
        consoleLog('The path /tmp/.local-chromium does not exist! Creating it.');
        fs.mkdirSync('/tmp/.local-chromium', { recursive: true });
    }

    const path = await downloadChromium({
        installPath: '/tmp/.local-chromium',
        log: true,
    });

    consoleLog(`Downloaded Chromium to ${path}`);
})();
