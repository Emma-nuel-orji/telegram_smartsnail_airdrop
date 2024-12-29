// loader.d.ts
declare module 'loader' {
  import React from 'react';
  const Loader: React.FC<{}>;  // Add empty props interface since component doesn't take props
  export default Loader;
}