import { DataExtractor } from './DataExtractor.js';
import { load } from 'cheerio';
import {
    LISTING_PRICE_MAX_SUS_THRESHOLD,
    LISTING_PRICE_MIN_THRESHOLD,
    LISTING_ROOMS_COUNT_SUS_THRESHOLD,
} from '../Constants.js';

export class DataExtractorAnuntulRo extends DataExtractor {
    setDataSource(html, liveListing) {
        this.url = liveListing.url;
        this.html = html;
    }

    hasValidListingDetails() {
        // Check if retrieved page does contain listing details. If not found, it is not
        // a valid listing page (search page with multiple results, 404 not found page, etc.)
        if (
            !this.hasBasePriceDetails() ||
            !this.hasSurfaceDetails() ||
            !this.hasRoomsCountDetails() ||
            this.hasExpiredMessageButton()
        ) {
            return false;
        }

        const price = this.extractBasePrice();
        const roomsCount = this.extractRoomsCount();

        if (price < LISTING_PRICE_MIN_THRESHOLD) {
            return false;
        }

        return price <= LISTING_PRICE_MAX_SUS_THRESHOLD || roomsCount >= LISTING_ROOMS_COUNT_SUS_THRESHOLD;
    }

    hasBasePriceDetails() {
        const $ = load(this.html);
        const priceElements = $('div.text-red-at.fs-2.ms-auto');

        if (priceElements.length === 0) {
            return false;
        }

        const price = this.extractBasePrice();

        return price >= LISTING_PRICE_MIN_THRESHOLD;
    }

    hasSurfaceDetails() {
        const $ = load(this.html);
        const surfaceElements = $('div.anunt-etichete > span.d-inline-block.me-2').filter(function () {
            const matches = $(this)
                .text()
                .toLowerCase()
                .trim()
                .match(/^suprafata/);
            return matches !== null;
        });

        if (surfaceElements.length === 0) {
            return false;
        }

        const surface = this.extractSurface();

        return !!surface;
    }

    hasRoomsCountDetails() {
        const roomsCountFromUrl = this.extractRoomsCountFromUrl();
        const roomsCountFromTitle = this.extractRoomsCountFromTitle();
        const roomsCountFromDescription = this.extractRoomsCountFromDescription();

        return roomsCountFromUrl || roomsCountFromTitle || roomsCountFromDescription;
    }

    hasExpiredMessageButton() {
        const $ = load(this.html);
        const dangerButtons = $('div.btn-danger');

        return dangerButtons.length > 0 && dangerButtons.text().match(/inactiv/i);
    }

    extractBasePrice() {
        const $ = load(this.html);
        const priceElement = $('div.text-red-at.fs-2.ms-auto');

        return parseFloat(priceElement.text().replace('.', '').replace(',', '.'));
    }

    extractHasSeparateTVA() {
        const $ = load(this.html);

        const containsPlusTVAString = function () {
            const matches = $(this)
                .text()
                .toLowerCase()
                .match(/(\+tva|\+ tva|plus tva)/);
            return matches !== null;
        };

        const containsIncludedTVAString = function () {
            const matches = $(this)
                .text()
                .toLowerCase()
                .match(/(tva inclus|inclus tva)/);
            return matches !== null;
        };

        const titleSelector = $('h2');

        const tvaFromTitle = titleSelector.filter(containsPlusTVAString);
        const includedTvaFromTitle = titleSelector.filter(containsIncludedTVAString);
        const includedTvaFromDescription = this.getDescriptionCheerioElements().filter(containsIncludedTVAString);

        return includedTvaFromTitle.length > 0 || includedTvaFromDescription.length > 0
            ? false
            : tvaFromTitle.length > 0;
    }

    extractHasMentionedTVA() {
        const $ = load(this.html);

        const containsTVAString = function () {
            const position = $(this).text().toLowerCase().indexOf('tva');
            return position !== -1;
        };

        const tvaFromTitle = $('h2').filter(containsTVAString);
        const tvaFromDescription = this.getDescriptionCheerioElements().filter(containsTVAString);

        return tvaFromTitle.length > 0 || tvaFromDescription.length > 0;
    }

    extractRoomsCount() {
        const roomsCountFromUrl = this.extractRoomsCountFromUrl();

        if (roomsCountFromUrl) {
            return roomsCountFromUrl;
        }

        const roomsCountFromTitle = this.extractRoomsCountFromTitle();

        if (roomsCountFromTitle) {
            return roomsCountFromTitle;
        }

        return this.extractRoomsCountFromDescription();
    }

    extractRoomsCountFromTitle() {
        const $ = load(this.html);
        const title = $('h2').get()[0];
        const titleText = $(title).text().toLowerCase();

        if (
            titleText.indexOf('garsoniera') >= 0 ||
            titleText.indexOf('studio') >= 0 ||
            titleText.indexOf('o camera') >= 0 ||
            titleText.indexOf('1 camera') >= 0
        ) {
            return 1;
        }

        const titleMatches = titleText.match(/([0-9]+) camere/);

        if (titleMatches) {
            return Number(titleMatches[1]);
        }

        return null;
    }

    extractRoomsCountFromUrl() {
        if (
            this.url.indexOf('garsoniera') >= 0 ||
            this.url.indexOf('studio') >= 0 ||
            this.url.indexOf('o-camera') >= 0 ||
            this.url.indexOf('1-camera') >= 0
        ) {
            return 1;
        }

        const urlMatches = this.url.match(/([0-9]+)-camere/);

        if (urlMatches && [1, 2, 3].includes(Number(urlMatches[1]))) {
            return Number(urlMatches[1]);
        }

        return null;
    }

    extractRoomsCountFromDescription() {
        const $ = load(this.html);
        let descriptionText = '';

        const descriptions = this.getDescriptionCheerioElements();
        descriptions.each((index, element) => {
            descriptionText = descriptionText + $(element).text() + '\n';
        });

        if (
            descriptionText.indexOf('garsoniera') >= 0 ||
            descriptionText.indexOf('studio') >= 0 ||
            descriptionText.indexOf('o camera') >= 0 ||
            descriptionText.indexOf('1 camera') >= 0
        ) {
            return 1;
        }

        const descriptionMatches = descriptionText.match(/([0-9]+) camere/);

        if (descriptionMatches) {
            return Number(descriptionMatches[1]);
        }

        return null;
    }

    extractSurface() {
        const $ = load(this.html);
        const surfaceElement = $('div.anunt-etichete > span.d-inline-block.me-2').filter(function () {
            const matches = $(this)
                .text()
                .toLowerCase()
                .trim()
                .match(/^suprafata/);
            return matches !== null;
        });

        const matches = surfaceElement
            .text()
            .toLowerCase()
            .trim()
            .match(/suprafata ([0-9]+)/);

        return Number(matches[1]);
    }

    extractZone() {
        const $ = load(this.html);
        const listingSections = $('div.col-lg-9 > div');

        const zoneElements = listingSections.filter((index, element) => {
            const text = $(element).text();
            return !!text.match(/Evolutia preturilor imobiliare in ([a-zA-Z0-9\-'". ]+)/i);
        });

        if (zoneElements.length === 0) {
            return null;
        }

        return zoneElements.text().match(/Evolutia preturilor imobiliare in ([a-zA-Z0-9\-'". ]+)/i)[1];
    }

    extractConstructionYear() {
        const $ = load(this.html);
        const yearElements = $('div.anunt-etichete > span.d-inline-block.me-2').filter(function () {
            const matches = $(this).text().toLowerCase().trim().match(/^an/);
            return matches !== null;
        });

        if (yearElements.length === 0) {
            return null;
        }

        const matches = yearElements
            .text()
            .toLowerCase()
            .trim()
            .match(/^an ([0-9]{4})/);

        return matches[1];
    }

    extractFloor() {
        const $ = load(this.html);
        const floorElements = $('div.anunt-etichete > span.d-inline-block.me-2').filter(function () {
            const matches = $(this).text().toLowerCase().trim().match(/^etaj/);
            return matches !== null;
        });

        if (floorElements.length === 0) {
            return null;
        }

        const matches = floorElements
            .text()
            .toLowerCase()
            .trim()
            .match(/^etaj ([a-z0-9]+)/);

        return matches[1];
    }

    extractHasCentralHeating() {
        const $ = load(this.html);

        const containsCentralHeating = function () {
            const matches = $(this)
                .text()
                .trim()
                .match(/centrala( proprie| termica)/i);
            return matches !== null;
        };

        const centralHeatingFromUtilities = $('div.anunt-etichete > span.d-inline-block.me-2').filter(
            containsCentralHeating
        );
        const centralHeatingFromDescription = this.getDescriptionCheerioElements().filter(containsCentralHeating);

        return centralHeatingFromUtilities.length > 0 || centralHeatingFromDescription.length > 0;
    }

    async extractImageUrls(browserPage) {
        const $ = load(this.html);
        const linkElements = $('a[data-lightbox]');

        if (linkElements.length === 0) {
            return [];
        }

        const imageUrls = [];

        linkElements.each(function () {
            let url = $(this).attr('href');
            if (url.indexOf('//') === 0) {
                url = 'https:' + url;
            }
            imageUrls.push(url);
        });

        return imageUrls;
    }

    getDescriptionCheerioElements() {
        const $ = load(this.html);
        const isDescriptionTitle = {};
        const listingSections = $('div.col-lg-9 > div');

        listingSections.each((index, element) => {
            const text = $(element).text();

            if (index === 0) {
                isDescriptionTitle[0] = false;
                return;
            }

            isDescriptionTitle[index] = !isDescriptionTitle[index - 1] && !!text.match(/(descriere|detalii)/i);
        });

        return listingSections.filter((index) => (index === 0 ? false : isDescriptionTitle[index - 1]));
    }
}
