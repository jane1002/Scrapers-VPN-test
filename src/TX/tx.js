const Apify = require('apify');
const querystring = require("querystring");
const url = require('url');
const { handleStart, handleDockets, handleFilings, handleDocs} = require('./routes');
const moment = require('moment');
require('dotenv').config();

Apify.main(async () => {
    const requestQueue = await Apify.openRequestQueue();
    const baseUrl = 'http://interchange.puc.texas.gov';

    let qs = {
        UtilityType: 'E',
        ControlNumber: '',
        ItemMatch: 1,
        ItemNumber: '',
        UtilityName: '',
        FilingParty: '',
        DocumentType: 'ALL',
        Description: '',
        FilingDescription: ''
    };

    const currentTime =  moment(Date.now()).format('YYYY-MM-DD');
    const fromDate = process.env.FROM_DATE ? process.env.FROM_DATE:currentTime;
    const toDate = process.env.TO_DATE ? process.env.TO_DATE:currentTime;

    qs.DateFiledFrom = fromDate;
    qs.DateFiledTo = toDate;
    qs = querystring.stringify(qs);

    await requestQueue.addRequest({
        url: `${baseUrl}/Search/Search?${qs}`
    });


    const handlePageFunction =  async ({ request, response, body, contentType, $ }) => {

        const pathName = url.parse(request.url).pathname;

        switch (pathName) {
            case '/Search/Dockets':
            case '/Search/Search':
                return handleDockets($, requestQueue);
            case '/Search/Filings':
                return handleFilings($, requestQueue);
            case '/Search/Documents':
                return handleDocs($, requestQueue);
            default:
                return handleStart($);
        }

    };

    const proxyConfiguration = await Apify.createProxyConfiguration({
        groups: ['RESIDENTIAL'],
        countryCode: 'US'
    });

// Crawl URLs
    const crawler = new Apify.CheerioCrawler({
        requestQueue,
        handlePageFunction,
        requestTimeoutSecs: 60,
        proxyConfiguration
    });

    await crawler.run();
});


