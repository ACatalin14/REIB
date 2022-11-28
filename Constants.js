export const START_DELAY = parseInt((Math.random() * 10 * 60 * 1000) / 600000); // 10 minutes
export const RESTING_DELAY_MIN = 1000; // 1 seconds
export const RESTING_DELAY_MAX = 5000; // 5 seconds

// Number of similar images between two listings so they can be considered similar listings
export const SIMILARITY_IMAGES_COUNT_THRESHOLD = 3;
// Percentage threshold between two image hashes so they can be considered similar images
export const SIMILARITY_HASH_THRESHOLD = 0.90;

export const DEFAULT_HASH_SIZE = 16;  // Use powers of 2

export const LOGS_SOURCE_IMOBILIARE_RO = 'imobiliare.ro';

export const DB_COLLECTION_CLOSED_LISTINGS = 'closedListings';
export const DB_COLLECTION_IMOBILIARE = 'imobiliareRoListings';
export const DB_COLLECTION_OLX = 'olxRoListings';
export const DB_COLLECTION_STORIA = 'storiaRoListings';
export const DB_COLLECTION_ANUNTUL = 'anuntulRoListings';

export const URL_SSL_PROXIES = 'https://sslproxies.org/';
export const URL_XML_IMOBILIARE_LISTINGS_BUCHAREST =
    'https://www.imobiliare.ro/sitemap-listings-apartments-for-sale-bucuresti-ilfov-ro.xml';

export const HTTP_STATUS_CODE_OK = 200;

export const PROXIES_COUNT = 100;

export const WORKING_PROXIES = [
    'http://93.191.96.4:3128', // Belarus
    'http://200.105.215.18:33630', // Bolivia
    'http://45.189.118.74:999', // Peru
    'http://157.100.12.138:999', // Ecuador
    'http://45.167.125.61:9992', // Colombia 91% uptime
    'http://45.167.125.97:9992', // Colombia 100% uptime
    // '49.0.2.242:8090',  // Indonesia - 403 Forbidden
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
export const REFERRERS_IMOBILIARE_RO = [
    'https://www.google.com/',
    'https://www.google.com/',
    'https://www.facebook.com/',
    'https://www.imoradar24.ro/',
    'https://www.argus.me/',
];
