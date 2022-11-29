import express from 'express';
import { checkListingsFromUrls } from './Tests/ListingsCheckerMethods.js';
import { MainIndexInitializer } from './IndexInitializers/MainIndexInitializer.js';
import { MainIndexSynchronizer } from './IndexSynchronizers/MainIndexSynchronizer.js';
import { consoleLog } from './Helpers/Utils';
import { ChromiumDownloader } from './Helpers/ChromiumDownloader';

const router = express.Router();
const mainIndexInitializer = new MainIndexInitializer();
const mainIndexSynchronizer = new MainIndexSynchronizer();

router.post('/test/downloadChromium', downloadChromium);
router.post('/cron/initIndex', mainIndexInitializer.init);
router.post('/cron/syncIndex', mainIndexSynchronizer.sync);
router.post('/cron/checkListingsSimilaritiesFromUrls', checkListingsFromUrls);

async function downloadChromium() {
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
}

export { router };
