import { consoleLog } from './Helpers/Utils.js';
import { ChromiumDownloader } from './ChromiumDownloader.js';

consoleLog('REIB has been deployed!');

(async () => {
    consoleLog('Ready to download Chromium.');

    const chromiumDownloader = new ChromiumDownloader();

    const path = await chromiumDownloader.download();

    consoleLog(`Downloaded Chromium to ${path}`);
})();
