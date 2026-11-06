import api,{USE_MOCK} from './api';
import {siteContentDto,validateSection} from '@/utils/siteContent';
const options={allowMockImages:USE_MOCK};
export const siteContentService={
 get:async()=>siteContentDto((await api.get('/site-content')).data,options),
 save:async(section,data)=>validateSection(section,(await api.put('/site-content/'+encodeURIComponent(section),validateSection(section,data,options))).data,options),
};
