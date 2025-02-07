// TonConnectButton.tsx
import React, { useEffect } from 'react';
import { TonConnectUI } from '@tonconnect/ui';

const TonConnectButton = () => {
  useEffect(() => {
    const ui = new TonConnectUI({
      manifestUrl: '/tonconnect-manifest.json',
      buttonRootId: 'ton-connect-button',
    });

    return () => {
      ui.disconnect();
    };
  }, []);

  return <div id="ton-connect-button"></div>;
};

export default TonConnectButton;
