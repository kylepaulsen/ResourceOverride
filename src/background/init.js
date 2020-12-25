window.browser = window.browser ? window.browser : window.chrome;

export const capabilities = {
    realtimeRewriteSupported: !!browser.webRequest.filterResponseData
};