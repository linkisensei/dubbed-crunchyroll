import puppeteer from 'puppeteer';

const BASE_URL = 'https://beta-api.crunchyroll.com';

const INTERNAL = {
    browser : null,
    page : null,
    token : {
        accessToken : null,
        expiresAt : 0,
        expirationMargin : 60000,
        isValid : function(){
            const now = Date.now();
            return !!this.accessToken && this.expiresAt >= now;
        },
    },
    setToken : function(accessToken, expiresIn){
        this.token.accessToken = accessToken;
        this.token.expiresAt = Date.now() - this.token.expirationMargin + expiresIn;
    },
    getToken : async function(){
        if(!this.token.isValid()){
            const response = await requestToken();
            this.setToken(response.access_token, response.expires_in);
        }

        return this.token.accessToken;
    }

}

export async function initPuppeteer(){
    INTERNAL.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    INTERNAL.page = await INTERNAL.browser.newPage();
}

export async function closePuppeteer(){
    INTERNAL.browser.close();
    INTERNAL.page = null;
}

async function requestToken(){
    const headers = {
        'Authorization': 'Basic eHVuaWh2ZWRidDNtYmlzdWhldnQ6MWtJUzVkeVR2akUwX3JxYUEzWWVBaDBiVVhVbXhXMTE=',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
    };
    const url = `${BASE_URL}/auth/v1/token`;
    const formData = new URLSearchParams({ grant_type: "client_id" }).toString();
    const response = await gotoExtended(INTERNAL.page, { url, method: 'POST', postData: formData, headers });

    if (!response || !response.access_token) {
        console.error("Error getting token:", response);
        await INTERNAL.browser.close();
        throw new Error("Unable to get access token");
    }

    return response;
}

export async function getAnimes(locale = "") {
    const token = await INTERNAL.getToken();
    const headers = {
        'Authorization': 'Bearer ' + token,
        'User-Agent': 'PostmanRuntime/7.43.0',
        'Accept': 'application/json'
    };

    let localeQuery = '';
    
    if(!!locale){
        console.info(`Listing animes for "${locale}"...`);
        localeQuery = `&locale=${locale}`;
    }else{
        console.info(`Listing animes...`);
    }

    return gotoExtended(INTERNAL.page, {
        url: `${BASE_URL}/content/v2/discover/browse?n=1400&type=series&is_dubbed=true${localeQuery}`,
        method: 'GET',
        headers,
        postData: null
    });
}

export async function getAnimeInfo(anime) {
    const token = await INTERNAL.getToken();
    const headers = {
        'Authorization': 'Bearer ' + token,
        'User-Agent': 'PostmanRuntime/7.43.0',
        'Accept': 'application/json'
    };

    console.info(`Getting information about "${anime.id}"`);

    let response = await gotoExtended(INTERNAL.page, {
        url: `${BASE_URL}/content/v2/cms/series/${anime.id}`,
        method: 'GET',
        headers,
        postData: null
    });

    const data = response.data.pop();
    anime.season_tags = data.season_tags ?? [];
    anime.keywords = data.keywords ?? [];
    anime.episode_count = data.episode_count ?? 0;
    return anime;
}


async function gotoExtended(page, request) {
    const { url, method, headers, postData } = request;
    let jsonResponse = null;

    await page.setRequestInterception(true);

    const interceptRequestHandler = async (interceptedRequest) => {
        try {
            const requestParams = {
                method: method !== 'GET' ? method : 'GET',
                headers: headers || {},
            };

            if (postData) {
                requestParams.postData = postData;
            }

            interceptedRequest.continue(requestParams);
            page.off('request', interceptRequestHandler);
            await page.setRequestInterception(false);

        } catch (error) {
            console.error('Error intercepting request:', error);
        }
    };

    page.on('request', interceptRequestHandler);

    page.on('response', async (response) => {
        if (response.url() === url) {
            try {
                jsonResponse = await response.json();
            } catch (error) {
                console.error('Error getting JSON from response:', error);
            }
        }
    });

    await page.goto(url, { waitUntil: 'networkidle2' });

    return jsonResponse;
}

export default {
    initPuppeteer,
    closePuppeteer,
    getAnimes,
    getAnimeInfo,
}