import {fullList} from '@/utils/apiContract';
import api from './api';
export const reportService = {
    getDailyRevenue: async (startDate, endDate, branchId) => {
        const response = await api.get('/statistics/revenue/daily', {
            params: { startDate, endDate, branchId }
        });
        return fullList(response);
    },
    getMovieRevenue: async (startDate, endDate, branchId) => {
        const response = await api.get('/statistics/revenue/movie', {
            params: { startDate, endDate, branchId }
        });
        return fullList(response);
    },
    getBranchRevenue: async (startDate, endDate) => {
        const response = await api.get('/statistics/revenue/branch', {
            params: { startDate, endDate }
        });
        return fullList(response);
    },
    getOccupancyRate: async (branchId) => {
        const response = await api.get('/statistics/occupancy', {
            params: { branchId }
        });
        return fullList(response);
    },
    getOverview: async (branchId) => {
        const response = await api.get('/statistics/overview', {
            params: { branchId }
        });
        return response.data;
    }
};
