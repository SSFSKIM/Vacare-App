export enum Mode {
  DEV = "development",
  PROD = "production",
}

interface WithEnvMode {
  readonly env: {
    readonly MODE: Mode;
  };
}

export const mode = (import.meta as unknown as WithEnvMode).env.MODE;

declare const __APP_ID__: string;
export const APP_ID = __APP_ID__;

declare const __API_PATH__: string;
export const API_PATH = __API_PATH__;

declare const __API_URL__: string;
const DEFAULT_API_PATH = '/routes';
export const API_URL = __API_URL__ && __API_URL__.length > 0 ? __API_URL__ : DEFAULT_API_PATH;

declare const __API_HOST__: string;
export const API_HOST = __API_HOST__;

declare const __API_PREFIX_PATH__: string;
export const API_PREFIX_PATH = __API_PREFIX_PATH__;

declare const __WS_API_URL__: string;
const resolveWsUrl = (): string => {
  if (__WS_API_URL__ && __WS_API_URL__.length > 0) {
    return __WS_API_URL__;
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${DEFAULT_API_PATH}`;
  }

  return `ws://localhost:8000${DEFAULT_API_PATH}`;
};

export const WS_API_URL = resolveWsUrl();

declare const __APP_BASE_PATH__: string;
export const APP_BASE_PATH = __APP_BASE_PATH__;

declare const __APP_TITLE__: string;
export const APP_TITLE = __APP_TITLE__;

declare const __APP_FAVICON_LIGHT__: string;
export const APP_FAVICON_LIGHT = __APP_FAVICON_LIGHT__;

declare const __APP_FAVICON_DARK__: string;
export const APP_FAVICON_DARK = __APP_FAVICON_DARK__;

declare const __APP_DEPLOY_USERNAME__: string;
export const APP_DEPLOY_USERNAME = __APP_DEPLOY_USERNAME__;

declare const __APP_DEPLOY_APPNAME__: string;
export const APP_DEPLOY_APPNAME = __APP_DEPLOY_APPNAME__;

declare const __APP_DEPLOY_CUSTOM_DOMAIN__: string;
export const APP_DEPLOY_CUSTOM_DOMAIN = __APP_DEPLOY_CUSTOM_DOMAIN__;
