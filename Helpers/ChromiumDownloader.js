import fs from 'fs';
import { promisify } from 'util';
import { consoleLog } from './Utils.js';
import { getProxyForUrl } from 'proxy-from-env';
import ProxyAgent from 'proxy-agent';
import got from 'got';
import mkdirp from 'mkdirp';
import cpr from 'cpr';
import pipe from 'promisepipe'
import extract from 'extract-zip'

const stat = promisify(fs.stat)
const mkdir = promisify(fs.mkdir)
const unlink = promisify(fs.unlink)

export class ChromiumDownloader {
    constructor() {
        this.downloadUrl =
            'https://storage.googleapis.com/chromium-browser-snapshots/Linux_x64/499413/chrome-linux.zip';
        this.installPath = '/tmp/.local-chromium';
        this.cacheRoot = '/tmp/.chromium-cache';
        this.folderPath = '/tmp/';
    }

    getArchive(url) {
        const proxy = getProxyForUrl(url);
        const agent = proxy ? new ProxyAgent(proxy) : undefined;
        const result = got.stream(url);

        return result;
    }

    getFolderPath(root) {
        return `${root}/chromium-linux-499413`;
    }

    getExecutablePath = (root) => {
        const folder = this.getFolderPath(root);
        return `${folder}/chrome-linux/chrome`;
    };

    async copyCacheToModule() {
        mkdirp.sync(this.getFolderPath(this.installPath));
        await cpr(this.getFolderPath(this.cacheRoot), this.getFolderPath(this.installPath));
    }

    async download() {
        const moduleExecutablePath = this.getExecutablePath(this.installPath);

        consoleLog('module executable path %s', moduleExecutablePath);

        try {
            await stat(moduleExecutablePath);
            return moduleExecutablePath;
        } catch (_) {}

        const globalExecutablePath = this.getExecutablePath(this.cacheRoot);

        consoleLog('global executable path %s', globalExecutablePath);

        let exists = false;
        try {
            await stat(globalExecutablePath);
            exists = true;
        } catch (_) {}

        if (exists) {
            consoleLog('copy cache to module');
            await this.copyCacheToModule(moduleExecutablePath);
            return moduleExecutablePath;
        }

        consoleLog('download url %s', this.downloadUrl);

        try {
            await mkdir(this.cacheRoot);
        } catch (_) {}
        const folderPath = this.getFolderPath(this.cacheRoot);
        const zipPath = `${folderPath}.zip`;

        consoleLog(`Downloading Chromium r499413...`);
        await pipe(await this.getArchive(this.downloadUrl), fs.createWriteStream(zipPath));

        consoleLog('extract');
        await extract(zipPath, { dir: folderPath });

        consoleLog('clean up');
        await unlink(zipPath);

        consoleLog('copy cache to module');
        await this.copyCacheToModule();

        consoleLog('Done installing Chromium!');

        return moduleExecutablePath;
    }
}
