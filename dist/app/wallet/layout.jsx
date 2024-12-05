"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RootLayout;
require("./globals.css");
const ui_react_1 = require("@tonconnect/ui-react");
function RootLayout({ children, }) {
    return (<html lang="en">
      <head>
        <title>TON Connect </title>
    
       </head>
       <body>
         <ui_react_1.TonConnectUIProvider manifestUrl="https://violet-traditional-rabbit-103.mypinata.cloud/ipfs/QmQJJAdZ2qSwdepvb5evJq7soEBueFenHLX3PoM6tiBffm">
           {children}
         </ui_react_1.TonConnectUIProvider>
       </body>
     </html>);
}
