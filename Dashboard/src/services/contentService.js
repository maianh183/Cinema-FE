import api from './api';
export function resourceService(resource) {
  const url = '/' + resource;
  return {
    list: async (params) => {
      const response = await api.get(url, { params });
      const data = response.data;
      if (Array.isArray(data) && response.pagination)
        return { items: data, total: Number(response.pagination.total) };
      if (Array.isArray(data)) {
        const page = Number(params?.page) || 1,
          size = Number(params?.pageSize) || 10;
        return { items: data.slice((page - 1) * size, page * size), total: data.length };
      }
      if (data?.items && Number.isFinite(Number(data.total)))
        return { items: data.items, total: Number(data.total) };
      throw new Error('API trả về danh sách không đúng hợp đồng.');
    },
    save: async (data, id) =>
      (await (id ? api.put(url + '/' + encodeURIComponent(id), data) : api.post(url, data))).data,
    remove: async (id) => {
      await api.delete(url + '/' + encodeURIComponent(id));
    },
  };
}
