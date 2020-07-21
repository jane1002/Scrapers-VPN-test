import * as url from 'url';
import * as Apify from 'Apify';
import * as querystring from 'querystring';
import { handleDockets, handleFilings } from './router';
import { CheerioHandlePage } from 'Apify';
import dotenv from 'dotenv';
import { formatDocketNum, getDateFromEnv } from '../helper';
dotenv.config({ path: '.env' });

const { utils: { log }} = Apify;

Apify.main(async () => {
    const requestQueue = await Apify.openRequestQueue();
    const baseUrl = 'http://www.psc.state.fl.us/ClerkOffice';

    const payload = {
        radioValue: 'Date',
        command: 'Search',
        fromDate: '',
        toDate: ''
    };

    const fromDate = getDateFromEnv('MM/DD/YYYY', process.env.FROM_DATE);
    const toDate = getDateFromEnv('MM/DD/YYYY', process.env.TO_DATE);

    log.info(`[SEARCH RANGE: ${fromDate} -- ${toDate}]`);

    payload.fromDate = fromDate;
    payload.toDate = toDate;
    const requestBody = querystring.stringify(payload);

    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    await requestQueue.addRequest({
        url: `${baseUrl}/Docket`,
        method: 'POST',
        payload: requestBody,
        headers
    });


    const handlePageFunction: CheerioHandlePage =  async ({ request, $ }): Promise<void> => {
        const pathName = url.parse(request.url).pathname;

        switch (pathName) {
            case '/ClerkOffice/Docket':
            case '/ClerkOffice/DocketList':
                return handleDockets($, requestQueue);
            // case '/ClerkOffice/DocketDetail':
            //     return handleDocketDetail($, formatDocketNum(url.parse(request.url).query));
            case '/ClerkOffice/DocketFiling':
                return handleFilings($, formatDocketNum(url.parse(request.url).query), requestQueue);
            // default:
            //     return handleStart($);
        }
    };
// Crawl the URLs
    const crawler = new Apify.CheerioCrawler({
        requestQueue,
        handlePageFunction,
        requestTimeoutSecs:60
    });

    await crawler.run();
});


