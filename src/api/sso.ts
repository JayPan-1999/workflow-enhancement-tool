// src/auth/login.js
import type { AccountInfo } from '@azure/msal-browser';
import { msalInstance } from '../auth';

export async function login() {
    try {
        const loginResponse = await msalInstance.loginPopup({
            scopes: ["user.read"], // 可根据需要调整
        });
        console.log("Login Success:", loginResponse);
        return loginResponse.account;
    } catch (error) {
        console.error("Login fail:", error);
        return null;
    }
}

export function logout() {
    msalInstance.logoutPopup();
}

export async function initMsal() {
    await msalInstance.initialize();                 // ① 初始化
    const result = await msalInstance.handleRedirectPromise(); // ② 处理重定向登录完成

    if (result && result.account) {
        msalInstance.setActiveAccount(result.account); // ③ 设置当前账号
    } else {
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
            msalInstance.setActiveAccount(accounts[0]);
        }
    }
}

export async function ensureLogin() {
    const currentAccount = msalInstance.getActiveAccount();
    if (currentAccount) return currentAccount;

    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0]);
        return accounts[0];
    }

    await msalInstance.loginRedirect({ scopes: ["openid", "profile", "email"] });
}

export async function acquireIdToken() {
    const result = await msalInstance.acquireTokenSilent({
        scopes: ["openid", "profile"],
        account: msalInstance.getActiveAccount()!,
    });

    return result.idToken;
}
