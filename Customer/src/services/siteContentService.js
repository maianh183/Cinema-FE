import { request } from "./api.js";
import { adaptSiteContent } from "../lib/siteContent.js";
export const siteContentService = {
  get: async () =>
    adaptSiteContent(await request("GET", "/public/site-content")),
};
