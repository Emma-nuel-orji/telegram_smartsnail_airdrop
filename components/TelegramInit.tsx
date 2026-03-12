import React, { useEffect } from "react";
import  WebApp  from "@twa-dev/sdk";
interface TelegramInitProps {
  onSetTelegramId: (id: string | null) => void;
  onSetMessage: (message: string) => void;
}


const TelegramInit: React.FC<TelegramInitProps> = ({ onSetTelegramId, onSetMessage }) => {
  useEffect(() => {
    WebApp.ready();
    const initData = WebApp.initDataUnsafe;

    console.log("Telegram Init Data:", initData);

    if (initData?.user?.id) {
      onSetTelegramId(initData.user.id.toString());
    } else {
      onSetMessage("This app should be opened in Telegram.");
    }
  }, [onSetTelegramId, onSetMessage]);

  return null;
};

export default TelegramInit;
