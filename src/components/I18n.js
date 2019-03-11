import i18next from 'i18next';
import SyncBackend from 'i18next-sync-fs-backend';

import de_bundle from './languageBundle/de.json';
import en_bundle from './languageBundle/en.json';
/*
 * Class to wrap i18next
 */
export default class I18n {

  constructor() {
    i18next.use(SyncBackend).init({
      lng: 'en',
      debug: true,
      resources: {
        en: en_bundle,
        de: de_bundle
      }
    });
  }

  /*
   * Returns the localized text against the key. 
   */
  localized(key, options) {
    return i18next.t(key, options);
  }
}