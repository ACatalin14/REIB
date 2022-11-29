import { consoleLog } from './Helpers/Utils.js';
import { ChromiumDownloader } from './Helpers/ChromiumDownloader.js';

consoleLog('REIB has been deployed!');

(async () => {
    consoleLog('Ready to download Chromium.');

    const chromiumDownloader = new ChromiumDownloader();

    let path;

    try {
        path = await chromiumDownloader.download();
        consoleLog(`Downloaded Chromium to ${path}`);
    } catch (error) {
        consoleLog(`Error while downloading Chromium.`);
        consoleLog(error);
    }

})();
