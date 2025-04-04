import { isTMA, parseInitData, mockLaunchParams, initTMA } from '@/lib/telegram-mock';
import type { LaunchParams } from '@/lib/telegram-mock';  
  
  // For Next.js/Vite environment detection
  const isDev = process.env.NODE_ENV === 'development';

  
  if (isDev) {
    await (async () => {
      if (await isTMA()) return;
  
      // Create mock launch params
      const initDataRaw = new URLSearchParams([
        ['user', JSON.stringify({
          id: 99281932,
          first_name: 'Andrew',
          last_name: 'Rogue',
          username: 'rogue',
          language_code: 'en',
          is_premium: true,
          allows_write_to_pm: true,
        })],
        ['hash', '89d6079ad6762351f38c6dbbc41bb53048019256a9443988af7a48bcad16ba31'],
        ['auth_date', '1716922846'],
        ['start_param', 'debug'],
        ['chat_type', 'sender'],
        ['chat_instance', '8428209589180549439'],
      ]).toString();
  
      const mockParams: LaunchParams = {
        themeParams: {
          accentTextColor: '#6ab2f2',
          bgColor: '#17212b',
          buttonColor: '#5288c1',
          buttonTextColor: '#ffffff',
          destructiveTextColor: '#ec3942',
          headerBgColor: '#17212b',
          hintColor: '#708499',
          linkColor: '#6ab3f3',
          secondaryBgColor: '#232e3c',
          sectionBgColor: '#17212b',
          sectionHeaderTextColor: '#6ab3f3',
          subtitleTextColor: '#708499',
          textColor: '#f5f5f5',
        },
        initData: parseInitData(initDataRaw),
        initDataRaw,
        version: '8',
        platform: 'tdesktop',
      };
  
      // Initialize mocked environment
      initTMA({
        debug: true,
        mock: mockLaunchParams(mockParams)
      });
  
      console.warn(
        '⚠️ Telegram environment has been mocked for development. ' +
        'This behavior will not appear in production builds.'
      );
    })();
  }