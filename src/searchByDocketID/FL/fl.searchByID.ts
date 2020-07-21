import * as url from 'url';
import * as Apify from 'Apify';
import * as querystring from 'querystring';
import { handleDocketDetail, handleFilings } from './router.searchByID';
import { CheerioHandlePage, RequestQueue } from 'Apify';
import dotenv from 'dotenv';
import { formatDocketNum, getDateFromEnv, readRecordsFromCSVFile } from '../../helper';
dotenv.config({ path: '.env' });

const { utils: { log }} = Apify;

export const FLscraper = async (): Promise<void> => {
    log.info(`[START FL SCRAPER]`);
    const list:Array<string> = readRecordsFromCSVFile('relevant-dockets.csv', 'FL');

    const requestQueue = await Apify.openRequestQueue();
    const baseUrl = 'http://www.psc.state.fl.us/ClerkOffice';

    console.log(list.length);
    // for(let i = 0; i < 2; i++) {
    for(const docketID of list) {
        // console.log(docketID);
        const qs = {
            // docket: list[i],
            docket: docketID,
            casestatus: 0,
            preHearingDate: '01/01/0001 00:00:00',
            document_id: 0,
            radioValue: 'DocketNumber',
            isCompleted: 'False',
            docutype: 0,
            EventType: 'All'
        };

        const queryStr: string = querystring.stringify(qs);

        await requestQueue.addRequest({
            url: `${baseUrl}/DocketDetail?${queryStr}`
        });
    }

    const handlePageFunction: CheerioHandlePage =  async ({ request, $ }): Promise<void> => {
        const pathName = url.parse(request.url).pathname;

        switch (pathName) {
            case '/ClerkOffice/DocketDetail':
                await handleDocketDetail($, formatDocketNum(url.parse(request.url).query), requestQueue);
                break;
            case '/ClerkOffice/DocketFiling':
                await handleFilings($, formatDocketNum(url.parse(request.url).query), requestQueue);
                break;
        }
    };

    const proxyConfiguration = await Apify.createProxyConfiguration({
        proxyUrls: ['http://proxy.wal-mart.com:9080', 'http://sysproxy.wal-mart.com:8080']
    });

// Crawl the URLs
    const crawler = new Apify.CheerioCrawler({
        requestQueue,
        handlePageFunction,
        requestTimeoutSecs: 160,
        // proxyConfiguration
    });

    await crawler.run();
};

