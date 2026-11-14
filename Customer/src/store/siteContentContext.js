import { createContext, useContext } from 'react';
import { defaultSiteContent } from '../lib/siteContent.js';
export const SiteContentContext = createContext({
  content: defaultSiteContent,
  loading: true,
  fallbackSections: [],
  reload: () => {},
});
export const useSiteContent = () => useContext(SiteContentContext);
