export const RESTING_DELAY_MIN = 1000; // 1 seconds
export const RESTING_DELAY_MAX = 3000; // 3 seconds
export const RETRY_IMAGES_FETCH_DELAY = 65000; // 65 seconds
export const RETRY_IMAGES_FETCH_PUBLI24_DELAY = 3000; // 3 seconds
export const RETRY_IMAGES_FETCH_ANUNTUL_DELAY = 3000; // 3 seconds
export const RETRY_IMAGES_URLS_GET_DELAY = 1000; // 1 seconds
export const RETRY_DB_OPERATION_DELAY = 30000; // 30 seconds
export const RETRY_XML_FETCH_DELAY = 5000; // 5 seconds
export const RETRY_CREATE_BROWSER_DELAY = 1000; // 1 second
export const ONE_DAY = 86400000;

export const SYNCHRONIZATION_TIME = '22:00';

export const SIMILARITY_THRESHOLD_TYPE_FIXED = 'fixed';
export const SIMILARITY_THRESHOLD_TYPE_RELATIVE = 'relative';
// Number of similar images between two listings so they can be considered similar listings, when fixed threshold is considered
export const SIMILARITY_IMAGES_COUNT_THRESHOLD = 3;
// Percentage threshold between two image hashes so they can be considered similar images
export const SIMILARITY_HASH_THRESHOLD = 0.9;

export const DEFAULT_HASH_SIZE = 16; // Use powers of 2

export const SOURCE_IMOBILIARE_RO = 'imobiliare.ro';
export const SOURCE_OLX_RO = 'olx.ro';
export const SOURCE_PUBLI24_RO = 'publi24.ro';
export const SOURCE_ANUNTUL_RO = 'anuntul.ro';

// Index types for stats making
export const INDEX_TYPE_LISTINGS = 'listings';
export const INDEX_TYPE_APARTMENTS = 'apartments';
export const INDEX_TYPE_SOLD_APARTMENTS = 'soldApartments';

export const DB_REIB = 'reib';
export const DB_REIB_TEST = 'reib-test';
export const DB_COLLECTION_APARTMENTS = 'apartments';
export const DB_COLLECTION_LISTINGS = 'listings';
export const DB_COLLECTION_LIVE_LISTINGS = 'liveListings';
export const DB_COLLECTION_SYNC_STATS = 'syncStats';
export const DB_COLLECTION_STATS = 'stats';

export const IMAGES_FETCH_MODE_PARALLEL = 'parallel';
export const IMAGES_FETCH_MODE_SEQUENTIAL = 'sequential';

export const URL_SSL_PROXIES = 'https://sslproxies.org/';
export const URL_XML_IMOBILIARE_LISTINGS_BUCHAREST =
    'https://www.imobiliare.ro/sitemap-listings-apartments-for-sale-bucuresti-ilfov-ro.xml';
export const URL_XML_ANUNTUL_LISTINGS_BUCHAREST_1 = 'https://www.anuntul.ro/sitemap-category_3.xml';
export const URL_XML_ANUNTUL_LISTINGS_BUCHAREST_2 = 'https://www.anuntul.ro/sitemap-category_4.xml';
export const URL_XML_ANUNTUL_LISTINGS_BUCHAREST_3 = 'https://www.anuntul.ro/sitemap-category_5.xml';
export const URL_XML_ANUNTUL_LISTINGS_BUCHAREST_4 = 'https://www.anuntul.ro/sitemap-category_6.xml';
export const URL_PUBLI24_LISTINGS_BUCHAREST =
    'https://www.publi24.ro/anunturi/imobiliare/de-vanzare/apartamente/bucuresti/?pag=1&ordered=asc&orderby=price&pagesize=20000&minprice=10000';

export const HTTP_STATUS_CODE_OK = 200;

export const PROXIES_COUNT = 100;

// Working proxies available, as given by webshare.io
export const WORKING_PROXIES = [
    '185.199.229.156:7492:koqpsbza:vmlw1cx5p6lc',
    '185.199.228.220:7300:koqpsbza:vmlw1cx5p6lc',
    '185.199.231.45:8382:koqpsbza:vmlw1cx5p6lc',
    '188.74.210.207:6286:koqpsbza:vmlw1cx5p6lc',
    '188.74.183.10:8279:koqpsbza:vmlw1cx5p6lc',
    '188.74.210.21:6100:koqpsbza:vmlw1cx5p6lc',
    '45.155.68.129:8133:koqpsbza:vmlw1cx5p6lc',
    '154.95.36.199:6893:koqpsbza:vmlw1cx5p6lc',
    '45.94.47.66:8110:koqpsbza:vmlw1cx5p6lc',
    '144.168.217.88:8780:koqpsbza:vmlw1cx5p6lc',
];

export const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X x.y; rv:42.0) Gecko/20100101 Firefox/42.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36 OPR/38.0.2220.41',
    'Opera/9.80 (Macintosh; Intel Mac OS X; U; en) Presto/2.2.15 Version/10.00',
    'Opera/9.60 (Windows NT 6.0; U; en) Presto/2.1.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:106.0) Gecko/20100101 Firefox/106.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.42',
];

export const REFERER_IMOBILIARE_RO = 'https://www.imobiliare.ro/';
export const REFERER_OLX_RO = 'https://www.olx.ro/';
export const REFERER_PUBLI24_RO = 'https://www.publi24.ro/';
export const REFERER_ANUNTUL_RO = 'https://www.anuntul.ro/';

export const REFERRERS_IMOBILIARE_RO = [
    'https://www.google.com/',
    'https://www.google.com/',
    'https://www.facebook.com/',
    'https://www.imoradar24.ro/',
    'https://www.argus.me/',
];
export const REFERRERS_OLX_RO = [
    'https://www.google.com/',
    'https://www.google.com/',
    'https://www.facebook.com/',
    'https://www.argus.me/',
    'https://www.storia.ro/',
];
export const REFERRERS_PUBLI24_RO = [
    'https://www.google.com/',
    'https://www.google.com/',
    'https://www.facebook.com/',
    'https://www.romimo.ro/',
    'https://www.storia.ro/',
    'https://www.autouncle.ro/',
];
export const REFERRERS_ANUNTUL_RO = [
    'https://www.google.com/',
    'https://www.google.com/',
    'https://www.facebook.com/',
    'https://www.imoradar24.ro/',
    'https://www.oferte360.ro/',
];

export const LISTING_PRICE_MIN_THRESHOLD = 10000; // Minimum amount of Euros a listing must have to be saved in database
export const LISTING_PRICE_MAX_SUS_THRESHOLD = 5000000; // Maximum amount of Euros a listing can have without roomsCount check
export const LISTING_ROOMS_COUNT_SUS_THRESHOLD = 8;
export const LISTING_OLD_APARTMENT_MAX_YEAR = 2020; // Maximum construction year of a supposed old apartment
export const TVA_5_MAX_SURFACE = 120; // Maximum surface an apartment can have to get only 5% TVA
export const TVA_5_MAX_PRICE = 120000; //  Maximum price (euros) an apartment can have to get only 5% TVA
export const TVA_5 = 0.05;
export const TVA_19 = 0.19;

export const OLX_HIGHEST_MIN_PRICE_FILTER = 400000;
export const OLX_PRICE_FILTER_STEP = 1000;
export const OLX_LISTINGS_PAGE_SIZE = 50;

export const MONTHS_TRANSLATIONS = {
    ianuarie: 'january',
    februarie: 'february',
    martie: 'march',
    aprilie: 'april',
    mai: 'may',
    iunie: 'june',
    iulie: 'july',
    august: 'august',
    septembrie: 'september',
    octombrie: 'october',
    noiembrie: 'november',
    decembrie: 'december',
};
