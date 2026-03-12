// src/lib/telegram-mock.ts
export type LaunchParams = {
    themeParams: Record<string, string>;
    initData: any;
    initDataRaw: string;
    version: string;
    platform: string;
  };
  
  export const isTMA = () => Promise.resolve(false);
  
  export const parseInitData = (data: string) => {
    const params = new URLSearchParams(data);
    return {
      user: JSON.parse(params.get('user') || '{}'),
      hash: params.get('hash'),
      auth_date: params.get('auth_date'),
    };
  };
  
  export const mockLaunchParams = (params: LaunchParams) => params;
  
  export const initTMA = (config: { debug: boolean; mock: LaunchParams }) => {
    if (config.debug) {
      console.log('Mocking Telegram Mini App:', config.mock);
    }
  };