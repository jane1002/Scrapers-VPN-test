const Apify = require('apify');
const querystring = require("querystring");
const { URL } = require('url');
const json2csv = require('json2csv');
const fs = require('fs');
const os = require('os');
const url = require('url');
const { handleStart, handleDockets, handleFilings} = require('./router');
const { utils: { log } } = Apify;

Apify.main(async () => {
    const requestQueue = await Apify.openRequestQueue();
    const baseUrl = 'http://www.psc.state.fl.us/ClerkOffice';

    let payload = {
        'radioValue': 'Date',
        'fromDate': '06/01/2017',
        'toDate': '06/01/2020',
        'command': 'Search'
    };

    payload = querystring.stringify(payload);

    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    await requestQueue.addRequest({
        url: `${baseUrl}/Docket`,
        method: 'POST',
        payload,
        headers
    });


    const handlePageFunction =  async ({ request, response, body, contentType, $ }) => {
        const pathName = url.parse(request.url).pathname;
        log.info(`[${pathName}]`);
        switch (pathName) {
            case '/ClerkOffice/Docket':
            case '/ClerkOffice/DocketList':
                return handleDockets($, requestQueue);
            case '/ClerkOffice/DocketFiling':
                return handleFilings($, requestQueue);
            default:
                return handleStart($);
        }
    };
// Crawl the URLs
    const crawler = new Apify.CheerioCrawler({
        requestQueue,
        handlePageFunction,
        // maxRequestsPerCrawl: 10
    });

    await crawler.run();
});


