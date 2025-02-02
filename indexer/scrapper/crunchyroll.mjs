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
    INTERNAL.browser = await puppeteer.launch({ headless: true });
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
        console.error("Erro ao obter token:", response);
        await INTERNAL.browser.close();
        throw new Error("Não foi possível obter o token de acesso");
    }

    return response;
}

export async function getAnimes() {
    const token = await INTERNAL.getToken();
    const headers = {
        'Authorization': 'Bearer ' + token,
        'User-Agent': 'PostmanRuntime/7.43.0',
        'Accept': 'application/json'
    };

    console.log(headers);

    return gotoExtended(INTERNAL.page, {
        url: `${BASE_URL}/content/v2/discover/browse?n=1000&type=series&is_dubbed=true`,
        method: 'GET',
        headers,
        postData: null
    });
}

export async function getAnimeInfo(animeId) {
    const token = await INTERNAL.getToken();
    const headers = {
        'Authorization': 'Bearer ' + token,
        'User-Agent': 'PostmanRuntime/7.43.0',
        'Accept': 'application/json'
    };

    return gotoExtended(INTERNAL.page, {
        url: `${BASE_URL}/content/v2/cms/series/${animeId}`,
        method: 'GET',
        headers,
        postData: null
    });
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
            console.error('Erro na interceptação da requisição:', error);
        }
    };

    page.on('request', interceptRequestHandler);

    page.on('response', async (response) => {
        if (response.url() === url) {
            try {
                jsonResponse = await response.json();
            } catch (error) {
                console.error('Erro ao obter JSON da resposta:', error);
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