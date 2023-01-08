import axios from 'axios';
import {
    IMAGES_FETCH_MODE_PARALLEL,
    IMAGES_FETCH_MODE_SEQUENTIAL,
    REFERER_OLX_RO,
    RETRY_CREATE_BROWSER_DELAY,
    USER_AGENTS,
    WORKING_PROXIES,
} from '../Constants.js';
import Jimp from 'jimp';
import puppeteer from 'puppeteer';
import { callUntilSuccess, consoleLog, getRandomItem, useHeadlessBrowser, useProxies } from './Utils.js';
import createHttpsProxyAgent from 'https-proxy-agent';
import fs from 'fs';
import * as webp from 'webp-converter';

export class SmartRequester {
    constructor(referrers, imagesReferer, headersConfig) {
        this.referrers = referrers;
        this.imagesReferer = imagesReferer;
        this.headersConfig = headersConfig;
        this.shouldUseProxies = useProxies();
        this.source = 'smart-requester';
    }

    getRandomProxy() {
        const proxyDetailsString = getRandomItem(WORKING_PROXIES);
        const proxyDetails = proxyDetailsString.split(':');

        return {
            host: proxyDetails[0],
            port: proxyDetails[1],
            user: proxyDetails[2],
            pass: proxyDetails[3],
        };
    }

    getDefaultHeaders() {
        return {
            'user-agent': getRandomItem(USER_AGENTS),
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'en-US,en;q=0.9',
            dnt: '1',
            'sec-ch-ua-mobile': '?0',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1',
            referer: getRandomItem(this.referrers),
        };
    }

    async get(url, extraConfigs = {}) {
        let config = {
            headers: {
                ...this.getDefaultHeaders(),
                ...this.headersConfig,
            },
        };

        if (this.shouldUseProxies) {
            const proxy = this.getRandomProxy();
            config.proxy = false;
            config.httpsAgent = createHttpsProxyAgent({
                host: proxy.host,
                port: proxy.port,
                auth: `${proxy.user}:${proxy.pass}`,
            });
        }

        if (extraConfigs) {
            config = { ...config, ...extraConfigs };
        }

        return await axios.get(url, config);
    }

    async getNewBrowserAndNewPage() {
        const method = async () => {
            if (this.shouldUseProxies) {
                return await this.getNewBrowserAndNewPageWithProxy();
            }

            return await this.getNewBrowserAndNewPageWithoutProxy();
        };

        return await callUntilSuccess(
            method.bind(this),
            [],
            `[${this.source}] Cannot launch headless browser.`,
            RETRY_CREATE_BROWSER_DELAY
        );
    }

    async getNewBrowserAndNewPageWithProxy() {
        const proxy = this.getRandomProxy();
        const browser = await this.getNewBrowser(proxy);
        const browserPage = await browser.newPage();

        await browserPage.authenticate({
            username: proxy.user,
            password: proxy.pass,
        });

        return [browser, browserPage];
    }

    async getNewBrowserAndNewPageWithoutProxy() {
        const browser = await this.getNewBrowser();
        const browserPage = await browser.newPage();

        return [browser, browserPage];
    }

    async getNewBrowser(proxy = null) {
        const config = { headless: useHeadlessBrowser() };

        if (proxy) {
            config.args = ['--no-sandbox', `--proxy-server=${proxy.host}:${proxy.port}`];
        } else {
            config.args = ['--no-sandbox'];
        }

        if (process.env.CHROMIUM_BROWSER_PATH) {
            config.executablePath = process.env.CHROMIUM_BROWSER_PATH;
        }

        return await puppeteer.launch(config);
    }

    async closeBrowser(browser) {
        try {
            await browser.close();
        } catch (error) {
            consoleLog(`[${this.source}] Cannot close headless browser. Moving on...`);
            consoleLog(error);
        }
    }

    async getPageFromUrl(browserPage, url) {
        await browserPage.setExtraHTTPHeaders({
            ...this.getDefaultHeaders(),
            ...this.headersConfig,
        });

        await browserPage.goto(url);

        return await browserPage.content();
    }

    async fetchImagesFromUrls(urls) {
        let images;

        switch (process.env.IMAGES_FETCH_MODE) {
            case IMAGES_FETCH_MODE_PARALLEL:
                images = await this.fetchImagesInParallel(urls);
                break;
            case IMAGES_FETCH_MODE_SEQUENTIAL:
                images = await this.fetchImagesSequentially(urls);
                break;
            default:
                throw new Error(
                    `Must initialize env variable IMAGES_FETCH_MODE with "${IMAGES_FETCH_MODE_PARALLEL}" or "${IMAGES_FETCH_MODE_SEQUENTIAL}".`
                );
        }

        if (images.length < urls.length / 2) {
            throw new Error(`Cannot fetch half of images in listing (${images.length}/${urls.length} fetched).`);
        }

        return images;
    }

    async fetchImagesInParallel(urls) {
        const promises = [];

        for (let i = 0; i < urls.length; i++) {
            promises.push(this.getImagePromise(urls[i]));
        }

        const results = await Promise.allSettled(promises);

        return results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
    }

    async fetchImagesSequentially(urls) {
        const images = [];

        for (let i = 0; i < urls.length; i++) {
            try {
                const image = await this.getImagePromise(urls[i]);
                images.push(image);
            } catch (error) {}
        }

        return images;
    }

    async getImagePromise(url) {
        const config = {
            url: url,
            headers: {
                ...this.getDefaultHeaders(),
                ...this.headersConfig,
                referer: this.imagesReferer,
            },
        };

        if (this.shouldUseProxies) {
            const proxy = this.getRandomProxy();
            config.agent = createHttpsProxyAgent({
                host: proxy.host,
                port: proxy.port,
                auth: `${proxy.user}:${proxy.pass}`,
            });
        }

        if (this.imagesReferer === REFERER_OLX_RO) {
            // OLX always gives webp images
            return this.getWebpImagePromise(config);
        }

        return Jimp.read(config).catch((error) => {
            if (error.message === 'Unsupported MIME type: image/webp') {
                return this.getWebpImagePromise(config);
            }

            throw error;
        });
    }

    async getWebpImagePromise(config) {
        return new Promise(async (resolve, reject) => {
            const formattedUrl = config.url.replace(/[/\\:;*?"'<>|.,=]/g, '');
            let filePathNoExt = `./tmp/${formattedUrl}`;

            if (!fs.existsSync('./tmp/')) {
                fs.mkdirSync('./tmp/');
            }

            while (fs.existsSync(`${filePathNoExt}.webp`)) {
                filePathNoExt = filePathNoExt + '0';
            }

            const fileWriter = fs.createWriteStream(`${filePathNoExt}.webp`);
            let response;

            try {
                response = await this.get(config.url, { responseType: 'stream' });
            } catch (error) {
                reject(error);
                return;
            }

            response.data.pipe(fileWriter);

            fileWriter.on('error', reject);
            fileWriter.on('finish', async () => {
                try {
                    await webp.dwebp(`${filePathNoExt}.webp`, `${filePathNoExt}.jpg`, '-o');
                    const image = await Jimp.read(`${filePathNoExt}.jpg`);
                    fs.unlink(`${filePathNoExt}.webp`, () => {});
                    fs.unlink(`${filePathNoExt}.jpg`, () => {});
                    resolve(image);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }
}
