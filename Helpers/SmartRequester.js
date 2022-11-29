import axios from 'axios';
import HttpsProxyAgent from 'https-proxy-agent';
import { RESTING_DELAY_MAX, RESTING_DELAY_MIN, USER_AGENTS } from '../Constants.js';
import { AbortController } from 'node-abort-controller';
import Jimp from 'jimp';
import puppeteer from 'puppeteer-core';
import { consoleLog } from './Utils.js';

export class SmartRequester {
    constructor(referrers, imagesReferer, headersConfig, proxies) {
        this.referrers = referrers;
        this.imagesReferer = imagesReferer;
        this.headersConfig = headersConfig;
        this.proxies = proxies ?? null;
    }

    getRandomProxy() {
        const randomIndex = Math.floor(Math.random() * this.proxies.length);
        return this.proxies[randomIndex];
    }

    getRandomUserAgent() {
        const randomIndex = Math.floor(Math.random() * USER_AGENTS.length);
        return USER_AGENTS[randomIndex];
    }

    getRandomReferer() {
        const randomIndex = Math.floor(Math.random() * this.referrers.length);
        return this.referrers[randomIndex];
    }

    getRandomRestingDelay() {
        return RESTING_DELAY_MIN + Math.random() * (RESTING_DELAY_MAX - RESTING_DELAY_MIN);
    }

    getDefaultHeaders() {
        return {
            'user-agent': this.getRandomUserAgent(),
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
            referer: this.getRandomReferer(),
        };
    }

    async getHeadlessBrowser() {
        return await puppeteer.launch({ headless: true });
    }

    async getPageFromUrl(browserPage, url) {
        await browserPage.setExtraHTTPHeaders({
            ...this.getDefaultHeaders(),
            ...this.headersConfig,
        });

        await browserPage.goto(url);

        return await browserPage.content();
    }

    // TODO: Decide whether to delete this method or work more on it
    async getWithProxy(url) {
        const proxy = this.getRandomProxy();
        console.log(proxy);

        delete process.env['http_proxy'];
        delete process.env['HTTP_PROXY'];
        delete process.env['https_proxy'];
        delete process.env['HTTPS_PROXY'];

        const controller = new AbortController();
        const cancelRequestTimeout = setTimeout(() => {
            controller.abort();
        }, 5000);

        let response;
        // url = 'https://www.google.ro/'

        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();

        await page.setRequestInterception(true);
        page.on('request', async (req) => {
            await useProxy(req, {
                proxy: 'http://49.0.2.242:8090',
                url: 'https://www.imobiliare.ro/',
                method: 'GET',
                headers: {
                    'user-agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
                    authority: 'www.imobiliare.ro',
                    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                    'accept-encoding': 'gzip, deflate, br',
                    'accept-language': 'en-US,en;q=0.9',
                    dnt: '1',
                    'sec-ch-ua': '"Google Chrome";v="107", "Chromium";v="107", "Not=A?Brand";v="24"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'document',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-site': 'none',
                    'sec-fetch-user': '?1',
                    'upgrade-insecure-requests': '1',
                },
            });
        });

        await page.goto('https://www.imobiliare.ro/');
        const html = await page.content();
        console.log('--------HTML');
        console.log(html);

        const data = await useProxy.lookup(page);
        console.log('data.ip');
        console.log(data.ip);

        return 12;

        try {
            response = await axios.get(url, {
                headers: {
                    'user-agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
                    authority: 'www.imobiliare.ro',
                    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                    'accept-encoding': 'gzip, deflate, br',
                    'accept-language': 'en-US,en;q=0.9',
                    dnt: '1',
                    'sec-ch-ua': '"Google Chrome";v="107", "Chromium";v="107", "Not=A?Brand";v="24"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'document',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-site': 'none',
                    'sec-fetch-user': '?1',
                    'upgrade-insecure-requests': '1',
                },
                // cancelToken: source.token,
                signal: controller.signal,
                // httpsAgent: new HttpsProxyAgent({
                //     host: '212.71.255.43',
                //     port: '38613',
                //     // secureProxy: false,
                //     // rejectUnauthorized: false,
                // }),
                httpsAgent: new HttpsProxyAgent('http://49.0.2.242:8090'),
                // httpsAgent: new HttpsProxyAgent(WORKING_PROXIES[0]),
                // httpsAgent: new HttpsProxyAgent(proxy),
                proxy: false,
                // proxy: {
                //     protocol: 'https',
                //     host: '65.108.152.50',
                //     port: 10022,
                // },
            });
            clearTimeout(cancelRequestTimeout);
        } catch (error) {
            clearTimeout(cancelRequestTimeout);
            throw error;
        }

        return response;
    }

    async get(url) {
        try {
            return await axios.get(url, {
                headers: {
                    ...this.getDefaultHeaders(),
                    ...this.headersConfig,
                },
            });
        } catch (error) {
            consoleLog(error);
        }
    }

    async getImagePromise(url) {
        return Jimp.read({
            url: url,
            headers: {
                ...this.getDefaultHeaders(),
                ...this.headersConfig,
                referer: this.imagesReferer,
            },
        });
    }
}
