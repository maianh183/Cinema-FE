import { resourceService } from './contentService';
import { cinemaReview } from '@/utils/contentModels';
export const cinemaReviewService = {
  list: async (params) => {
    const result = await resourceService('cinema-reviews').list(params);
    return { ...result, items: result.items.map(cinemaReview) };
  },
};
