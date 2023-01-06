import { DataExtractor } from './DataExtractor.js';
import { load } from 'cheerio';
import {
    LISTING_PRICE_MAX_SUS_THRESHOLD,
    LISTING_PRICE_MIN_THRESHOLD,
    LISTING_ROOMS_COUNT_SUS_THRESHOLD,
} from '../Constants.js';

export class DataExtractorPubli24Ro extends DataExtractor {
    setDataSource(html) {
        const $ = load(html);
        const urlMeta = $('head > meta[property="og:url"]');

        this.url = urlMeta.attr('content');
        this.html = html;
    }

    hasValidListingDetails() {
        // Check if retrieved page does contain listing details. If not found, it is not
        // a valid listing page (search page with multiple results, 404 not found page, etc.)
        if (!this.hasBasePriceDetails() || !this.hasSurfaceDetails() || !this.hasRoomsCountDetails()) {
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
        const priceElements = $('span[itemprop=price]');

        if (priceElements.length === 0) {
            return false;
        }

        const price = this.extractBasePrice();

        return price >= LISTING_PRICE_MIN_THRESHOLD;
    }

    hasSurfaceDetails() {
        const $ = load(this.html);
        const surfaceDiv = $('div.adproperties > div').filter(function () {
            const firstSpan = $('span:nth-child(1)', $(this));
            return firstSpan.text().match(/suprafata/i);
        });

        if (surfaceDiv.length === 0) {
            return false;
        }

        const surfaceSpan = $('span:nth-child(2)', surfaceDiv);

        if (surfaceSpan.length === 0) {
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

    extractBasePrice() {
        const $ = load(this.html);
        const priceElements = $('span[itemprop=price]');

        const price = priceElements.text();

        const digits = price.match(/([0-9]+|,)/g);

        const priceValue = parseFloat(digits.join('').replace(',', '.'));
        const priceCurrency = $('span[itemprop=priceCurrency]').attr('content').toLowerCase();

        if (priceCurrency === 'usd') {
            return Math.round(priceValue * 0.95 * 100) / 100;
        }

        if (priceCurrency === 'ron') {
            return Math.round(priceValue * 0.2 * 100) / 100;
        }

        return priceValue;
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

        const titleSelector = $('h1[itemprop=name]');

        const tvaFromTitle = titleSelector.filter(containsPlusTVAString);
        const includedTvaFromTitle = titleSelector.filter(containsIncludedTVAString);
        const includedTvaFromDescription = $('span[itemprop=description]').filter(containsIncludedTVAString);

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

        const tvaFromTitle = $('h1[itemprop=name]').filter(containsTVAString);
        const tvaFromDescription = $('span[itemprop=description]').filter(containsTVAString);

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

        if (urlMatches && [1, 2, 3, 4, 5].includes(Number(urlMatches[1]))) {
            return Number(urlMatches[1]);
        }

        return null;
    }

    extractRoomsCountFromTitle() {
        const $ = load(this.html);
        const title = $('h1[itemprop=name]').get()[0];
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

    extractRoomsCountFromDescription() {
        const $ = load(this.html);
        const description = $('span[itemprop=description]');
        let descriptionText = description.text();

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
        const surfaceDiv = $('div.adproperties > div').filter(function () {
            const firstSpan = $('span:nth-child(1)', $(this));
            return firstSpan.text().match(/suprafata/i);
        });

        const surfaceSpan = $('span:nth-child(2)', surfaceDiv);

        return parseFloat(surfaceSpan.text().replace(',', '.'));
    }

    extractZone() {
        const $ = load(this.html);
        let zone = null;
        const zoneElements = $('p[itemprop=name] > a.maincolor');

        if (zoneElements.length === 0) {
            return null;
        }

        // Get last defined zone
        zoneElements.each(function () {
            zone = $(this).text();
        });

        return zone;
    }

    extractConstructionYear() {
        const $ = load(this.html);
        const yearDiv = $('div.adproperties > div').filter(function () {
            const firstSpan = $('span:nth-child(1)', $(this));
            return firstSpan.text().match(/anul/i) !== null;
        });

        if (yearDiv.length === 0) {
            return null;
        }

        const yearSpan = $('span:nth-child(2)', yearDiv);

        if (yearSpan.length === 0) {
            return null;
        }

        const year = yearSpan.text().trim();

        return year === '0' || year === '' ? null : year;
    }

    extractFloor() {
        const $ = load(this.html);
        const floorDiv = $('div.adproperties > div').filter(function () {
            const firstSpan = $('span:nth-child(1)', $(this));
            return firstSpan.text().match(/etaj/i) !== null;
        });

        if (floorDiv.length === 0) {
            return null;
        }

        const floorSpan = $('span:nth-child(2)', floorDiv);

        if (floorSpan.length === 0) {
            return null;
        }

        const floorText = floorSpan.text();

        return floorText.replace(/(etaj[\s]*)/i, '');
    }

    extractHasCentralHeating() {
        const $ = load(this.html);

        const containsCentralHeating = function () {
            const matches = $(this)
                .text()
                .match(/centrala( proprie| termica)/i);
            return matches !== null;
        };

        const centralHeatingFromTitle = $('h1[itemprop=name]').filter(containsCentralHeating);
        const centralHeatingFromDescription = $('span[itemprop=description]').filter(containsCentralHeating);
        const centralHeatingFromUtilities = $('div.adproperties > div > span:nth-child(2)').filter(
            containsCentralHeating
        );

        return (
            centralHeatingFromTitle.length > 0 ||
            centralHeatingFromDescription.length > 0 ||
            centralHeatingFromUtilities.length > 0
        );
    }

    extractLastModified() {
        const $ = load(this.html);
        const validityDateElement = $('i[itemprop=validFrom]');

        const dateMatches = validityDateElement
            .text()
            .match(/Valabil din ([0-9]{2}).([0-9]{2}).([0-9]{4}) ([0-9]{2}):([0-9]{2}):([0-9]{2})/);

        const day = dateMatches[1];
        const month = dateMatches[2];
        const year = dateMatches[3];
        const hour = dateMatches[4];
        const minute = dateMatches[5];
        const second = dateMatches[6];

        return new Date(`${year}-${month}-${day} ${hour}:${minute}:${second}`);
    }

    async extractImageUrls(browserPage) {
        const $ = load(this.html);
        const scriptContent = $('div.detail-left.radius > script');

        if (scriptContent.length === 0) {
            return [];
        }

        const matches = scriptContent.text().match(/(http[^']+)'/g);

        if (matches === null) {
            return [];
        }

        // Remove apostrophe
        return matches.map((match) => match.slice(0, -1));
    }
}
