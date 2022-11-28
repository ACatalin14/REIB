import axios from 'axios';
import { HTTP_STATUS_CODE_OK, PROXIES_COUNT, URL_SSL_PROXIES } from '../Constants.js';
import { load } from 'cheerio';

export class ProxiesGenerator {
    async generate() {
        const response = await axios.get(URL_SSL_PROXIES);

        if (!response || response.status !== HTTP_STATUS_CODE_OK) {
            console.error('Error while fetching proxies.');
            return;
        }

        let proxies = [];
        const $ = load(response.data);

        $('td:nth-child(1)')
            .slice(0, PROXIES_COUNT)
            .each(function (index) {
                proxies[index] = {
                    ip: $(this).text(),
                    port: null,
                    anonymity: null,
                };
            });

        $('td:nth-child(2)')
            .slice(0, PROXIES_COUNT)
            .each(function (index) {
                proxies[index].port = $(this).text();
            });

        $('td:nth-child(5)')
            .slice(0, PROXIES_COUNT)
            .each(function (index) {
                proxies[index].anonymity = $(this).text();
            });

        proxies = proxies
            // .filter((proxy) => proxy.anonymity === 'elite proxy')
            .map((proxy) => `http://${proxy.ip}:${proxy.port}`);

        return proxies;
    }
}
