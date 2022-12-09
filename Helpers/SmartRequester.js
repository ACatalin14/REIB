import axios from 'axios';
import { RETRY_BROWSER_CREATE_DELAY, USER_AGENTS, WORKING_PROXIES } from '../Constants.js';
import Jimp from 'jimp';
import puppeteer from 'puppeteer';
import { callUntilSuccess, getRandomItem, useProxies } from './Utils.js';
import createHttpsProxyAgent from 'https-proxy-agent';

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

    async get(url) {
        const config = {
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
            `[${this.source}] Cannot launch headless browser. Retrying in 1 second...`,
            RETRY_BROWSER_CREATE_DELAY
        );
    }

    async getNewBrowserAndNewPageWithProxy() {
        const proxy = this.getRandomProxy();

        const browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', `--proxy-server=${proxy.host}:${proxy.port}`],
        });

        const browserPage = await browser.newPage();

        await browserPage.authenticate({
            username: proxy.user,
            password: proxy.pass,
        });

        return [browser, browserPage];
    }

    async getNewBrowserAndNewPageWithoutProxy() {
        const browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox'],
        });

        const browserPage = await browser.newPage();

        return [browser, browserPage];
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

        if (this.shouldUseProxies) {
            images = await this.fetchImagesInParallel(urls);
        } else {
            images = await this.fetchImagesSequentially(urls);
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

        return Jimp.read(config);
    }
}
