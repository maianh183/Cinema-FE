const state = [
  ['DRAFT', 'Bản nháp'],
  ['PUBLISHED', 'Đã xuất bản'],
  ['HIDDEN', 'Đã ẩn'],
];
const status = { name: 'status', label: 'Trạng thái', options: state, required: true };
export const contentConfigs = {
  faq: {
    title: 'Hỏi đáp',
    description: 'Biên soạn câu trả lời và sắp xếp thứ tự hiển thị.',
    columns: [
      ['question', 'Câu hỏi'],
      ['sortOrder', 'Thứ tự'],
      ['status', 'Trạng thái'],
    ],
    fields: [
      { name: 'question', label: 'Câu hỏi', required: true, maxLength: 300 },
      {
        name: 'sortOrder',
        label: 'Thứ tự hiển thị',
        type: 'number',
        integer: true,
        min: 0,
        required: true,
      },
      { name: 'answer', label: 'Câu trả lời', type: 'textarea', required: true, maxLength: 10000 },
      status,
    ],
  },
  news: {
    title: 'Tin tức',
    description:
      'Bài viết, danh mục và thông tin SEO. Nội dung văn bản thuần, không thực thi HTML.',
    columns: [
      ['title', 'Tiêu đề'],
      ['category', 'Danh mục'],
      ['slug', 'Đường dẫn'],
      ['status', 'Trạng thái'],
    ],
    fields: [
      { name: 'title', label: 'Tiêu đề', required: true, maxLength: 200 },
      { name: 'slug', label: 'Slug', required: true, maxLength: 200 },
      { name: 'category', label: 'Danh mục', required: true },
      { name: 'seoTitle', label: 'SEO title', maxLength: 70 },
      { name: 'metaDescription', label: 'Meta description', type: 'textarea', maxLength: 170 },
      { name: 'tags', label: 'Từ khóa / tags', maxLength: 500 },
      { name: 'imageUrl', label: 'Ảnh đại diện', type: 'image' },
      {
        name: 'content',
        label: 'Nội dung bài viết',
        type: 'textarea',
        rows: 12,
        required: true,
        maxLength: 100000,
      },
      status,
    ],
  },
  categories: {
    title: 'Danh mục nội dung',
    description: 'Danh mục dùng chung qua PHP API.',
    module: 'news',
    columns: [
      ['name', 'Tên danh mục'],
      ['type', 'Phân loại'],
      ['slug', 'Slug'],
    ],
    fields: [
      { name: 'name', label: 'Tên danh mục', required: true, maxLength: 100 },
      { name: 'slug', label: 'Slug', required: true, maxLength: 100 },
      {
        name: 'type',
        label: 'Loại',
        options: [
          ['NEWS', 'Tin tức'],
          ['PRODUCT', 'Sản phẩm'],
        ],
        required: true,
      },
    ],
  },
};
