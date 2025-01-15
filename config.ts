// config.ts - Place this file in your app's config or utils folder

export const WALLET_ENDPOINTS = {
  manifestUrl: '/tonconnect-manifest.json',
  returnStrategy: 'back',
  twaReturnUrl: undefined  // Set this to your Telegram bot username if needed
};

export const THEME_CONFIG = {
  DARK: {
    background: '#1C1C1C',
    text: '#FFFFFF',
    hint: '#999999',
    button: '#2D2D2D'
  },
  LIGHT: {
    background: '#FFFFFF',
    text: '#222222',
    hint: '#666666',
    button: '#F5F5F5'
  }
};