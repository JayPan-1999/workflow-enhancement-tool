import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
    auth: {
        clientId: 'c49badf6-a45c-4fa7-b3a7-b6ea0d6b531f',
        authority: 'https://login.microsoftonline.com/3900d238-2b93-45ac-a199-c86294e380ae', // 或 common/organizations
        redirectUri: 'http://localhost:5173/', // 或你的生产环境地址
    },
    cache: {
        cacheLocation: 'localStorage', // or 'sessionStorage'
        storeAuthStateInCookie: false,
    }
};

export const msalInstance = new PublicClientApplication(msalConfig);