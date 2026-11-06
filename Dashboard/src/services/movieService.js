import {fullList} from '@/utils/apiContract';
import api from './api';
import { fileService } from './fileService';
export const movieService = {
    // Lấy danh sách phim
    getAll: async () => {
        const response = await api.get('/movies');
        return fullList(response);
    },
    // Lấy danh sách đánh giá của phim
    getReviews: async (movieId) => {
        const response = await api.get(`/movies/${movieId}/reviews`);
        return fullList(response);
    },
    // Gửi đánh giá mới
    addReview: async (review) => {
        const response = await api.post('/reviews', review);
        return response.data;
    },
    uploadPoster: async file => ({ success:true, url:await fileService.uploadFile(file,'movies') }),
    create: async (movieData) => {
        const response = await api.post('/movies', movieData);
        return response.data;
    },
    // Lưu phim (Tạo mới hoặc Cập nhật)
    save: async (data, id) => {
        if (id) {
            const response = await api.put(`/movies/${id}`, data);
            return response.data;
        }
        else {
            const response = await api.post('/movies', data);
            return response.data;
        }
    },
    // Xóa phim
    delete: async (id) => {
        await api.delete(`/movies/${id}`);
    }
};
