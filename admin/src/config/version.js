/**
 * Global CampXChange Admin Console Version Configuration
 * Unified version constant injected at build/dev time from root version.json
 */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined'
  ? __APP_VERSION__
  : (import.meta.env?.VITE_APP_VERSION || '2.4.0');

export const APP_NAME = 'CampXChange Admin Portal';

export const APP_BUILD_NAME = typeof __APP_BUILD_NAME__ !== 'undefined'
  ? __APP_BUILD_NAME__
  : `CampXChange Admin v${APP_VERSION}`;

export const APP_RELEASE_STAGE = typeof __APP_RELEASE_STAGE__ !== 'undefined'
  ? __APP_RELEASE_STAGE__
  : 'Enterprise';

export const APP_RELEASE_DATE = typeof __APP_RELEASE_DATE__ !== 'undefined'
  ? __APP_RELEASE_DATE__
  : 'October 2026';

export default {
  version: APP_VERSION,
  name: APP_NAME,
  buildName: APP_BUILD_NAME,
  stage: APP_RELEASE_STAGE,
  date: APP_RELEASE_DATE,
};
