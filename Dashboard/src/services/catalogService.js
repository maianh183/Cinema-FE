import { fullList } from '@/utils/apiContract';
import api from './api';
export const catalogService = {
  // Genres
  getAllGenres: async () => {
    const response = await api.get('/catalog/genres');
    return fullList(response);
  },
  createGenre: async (genre) => {
    const response = await api.post('/catalog/genres', null, { params: { genre } });
    return response.data;
  },
  deleteGenre: async (genre) => {
    await api.delete(`/catalog/genres/${genre}`);
  },
  // Formats
  getAllFormats: async () => {
    const response = await api.get('/catalog/formats');
    return fullList(response);
  },
  createFormat: async (fName) => {
    const response = await api.post('/catalog/formats', null, { params: { fName } });
    return response.data;
  },
  deleteFormat: async (fName) => {
    await api.delete(`/catalog/formats/${fName}`);
  },
  // Actors
  getAllActors: async () => {
    const response = await api.get('/catalog/actors');
    return fullList(response);
  },
  createActor: async (fullName) => {
    const response = await api.post('/catalog/actors', null, { params: { fullName } });
    return response.data;
  },
  deleteActor: async (fullName) => {
    await api.delete(`/catalog/actors/${fullName}`);
  },
};
