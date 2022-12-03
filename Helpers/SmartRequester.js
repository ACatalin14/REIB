import axios from 'axios';
import { RESTING_DELAY_MAX, RESTING_DELAY_MIN, USER_AGENTS } from '../Constants.js';
import Jimp from 'jimp';
import puppeteer from 'puppeteer';
import { consoleLog } from './Utils.js';

export class SmartRequester {
    constructor(referrers, imagesReferer, headersConfig) {
        this.referrers = referrers;
        this.imagesReferer = imagesReferer;
        this.headersConfig = headersConfig;
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
        return await puppeteer.launch({ args: ['--no-sandbox'] });
    }

    async getPageFromUrl(browserPage, url) {
        await browserPage.setExtraHTTPHeaders({
            ...this.getDefaultHeaders(),
            ...this.headersConfig,
        });

        await browserPage.goto(url);

        return await browserPage.content();
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

    async fetchImagesFromUrls(urls) {
        let promises = [];

        for (let i = 0; i < urls.length; i++) {
            promises.push(this.getImagePromise(urls[i]));
        }

        const results = await Promise.allSettled(promises);
        const images = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);

        if (images.length < results.length / 2) {
            throw new Error(`Cannot fetch half of images in listing (${images.length}/${results.length} fetched).`);
        }

        return images;
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
