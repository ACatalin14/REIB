import { consoleLog } from './Helpers/Utils.js';
import downloadChromium from 'download-chromium';
import fs from 'fs';
import os from 'os';

consoleLog('REIB has been deployed!');

(async () => {
    consoleLog('Ready to download Chromium.');

    if (fs.existsSync('/tmp/.local-chromium')) {
        consoleLog('The path /tmp/.local-chromium exists!');
    } else {
        consoleLog('The path /tmp/.local-chromium does not exist! Creating it.');
        fs.mkdirSync('/tmp/.local-chromium', { recursive: true });
    }

    const cachePath = `${os.homedir()}/.chromium-cache`;
    if (fs.existsSync(cachePath)) {
        consoleLog(`The path ${cachePath} exists!`);
    } else {
        consoleLog(`The path ${cachePath} does not exist! Creating it.`);
        fs.mkdirSync(cachePath, { recursive: true });
    }

    const path = await downloadChromium({
        installPath: '/tmp/.local-chromium',
        log: true,
    });

    consoleLog(`Downloaded Chromium to ${path}`);
})();
