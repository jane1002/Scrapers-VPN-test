import * as url from 'url';
import * as Apify from 'Apify';
import * as querystring from 'querystring';
import { handleDockets, handleDocs, handleFilings } from './router';
import { CheerioHandlePage } from 'Apify';
import dotenv from 'dotenv';
import { getDateFromEnv } from '../helper';
dotenv.config({ path: '.env' });

const { utils: { log }} = Apify;

Apify.main(async () => {
    const requestQueue = await Apify.openRequestQueue();
    const baseUrl = 'http://interchange.puc.texas.gov';

    const qs = {
        UtilityType: 'E',
        ControlNumber: '',
        ItemMatch: 1,
        ItemNumber: '',
        UtilityName: '',
        FilingParty: '',
        DocumentType: 'ALL',
        Description: '',
        FilingDescription: '',
        DateFiledFrom: '',
        DateFiledTo: ''
    };

    const fromDate = getDateFromEnv('YYYY-MM-DD', process.env.FROM_DATE);
    const toDate = getDateFromEnv('YYYY-MM-DD', process.env.TO_DATE);

    log.info(`[SEARCH RANGE: ${fromDate} -- ${toDate}]`);

    qs.DateFiledFrom = fromDate;
    qs.DateFiledTo = toDate;
    const queryStr: string = querystring.stringify(qs);

    await requestQueue.addRequest({
        url: `${baseUrl}/Search/Search?${queryStr}`
    });

    const handlePageFunction: CheerioHandlePage = async ({ request, $ }) => {

        const pathName = url.parse(request.url).pathname;

        switch (pathName) {
            case '/Search/Dockets':
            case '/Search/Search':
                return handleDockets($, requestQueue);
            case '/Search/Filings':
                return handleFilings($, requestQueue);
            case '/Search/Documents':
                return handleDocs($);
            // default:
            //     return handleStart($);
        }

    };

    // Crawl URLs
    const crawler = new Apify.CheerioCrawler({
        requestQueue,
        handlePageFunction
    });

    await crawler.run();
});

