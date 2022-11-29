import express from 'express';
import { checkListingsFromUrls } from './Tests/ListingsCheckerMethods.js';
import { MainIndexInitializer } from './IndexInitializers/MainIndexInitializer.js';
import { MainIndexSynchronizer } from './IndexSynchronizers/MainIndexSynchronizer.js';
import { consoleLog } from './Helpers/Utils.js';
import { ChromiumDownloader } from './Helpers/ChromiumDownloader.js';

const router = express.Router();

router.post('/test/downloadChromium', downloadChromium);
router.post('/cron/initIndex', initIndex);
router.post('/cron/syncIndex', syncIndex);
router.post('/cron/checkListingsSimilaritiesFromUrls', checkListingsFromUrls);

async function initIndex(req, res) {
    const mainIndexInitializer = new MainIndexInitializer();
    await mainIndexInitializer.init();
    return res.status(200).json({ success: true });
}

async function syncIndex(req, res) {
    const mainIndexSynchronizer = new MainIndexSynchronizer();
    await mainIndexSynchronizer.sync();
    return res.status(200).json({ success: true });
}

async function downloadChromium(req, res) {
    consoleLog('Ready to download Chromium.');

    const chromiumDownloader = new ChromiumDownloader();

    let path;

    try {
        path = await chromiumDownloader.download();
        consoleLog(`Downloaded Chromium to ${path}`);
        return res.status(200).json({ success: true });
    } catch (error) {
        consoleLog(`Error while downloading Chromium.`);
        consoleLog(error);
        return res.status(500).json({ error: error.message });
    }
}

export { router };
