import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { productKey, productStatus, stock } from '../lib/business.js';
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      add: (product, quantity = 1) => {
        if (!Number.isInteger(quantity) || quantity < 1)
          throw Error('Số lượng phải là số nguyên dương.');
        if (productStatus(product) !== 'ACTIVE') throw Error('Sản phẩm không khả dụng.');
        const key = productKey(product),
          old = get().items.find((i) => productKey(i) === key),
          next = (old?.quantity || 0) + quantity;
        if (!Number.isInteger(next) || next < 1 || next > stock(product))
          throw Error('Số lượng vượt tồn kho.');
        set({
          items: [
            ...get().items.filter((i) => productKey(i) !== key),
            {
              itemType: product.itemType,
              productId: product.productId,
              quantity: next,
            },
          ],
        });
      },
      update: (key, quantity) => {
        if (Number.isInteger(quantity) && quantity > 0)
          set({
            items: get().items.map((i) => (productKey(i) === key ? { ...i, quantity } : i)),
          });
      },
      remove: (key) => set({ items: get().items.filter((i) => productKey(i) !== key) }),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'cms-customer-cart-v1',
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
export const useBookingStore = create(
  persist(
    (set) => ({
      reservation: null,
      setReservation: (reservation) => set({ reservation }),
      clear: () => set({ reservation: null }),
    }),
    {
      name: 'cms-booking-v1',
      storage: {
        getItem: (name) => {
          try {
            return JSON.parse(sessionStorage.getItem(name));
          } catch {
            return null;
          }
        },
        setItem: (name, value) => sessionStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => sessionStorage.removeItem(name),
      },
    },
  ),
);
if (typeof window !== 'undefined')
  for (const event of ['cms:session-expired', 'cms:logout'])
    window.addEventListener(event, () => {
      useBookingStore.getState().clear();
      useCartStore.getState().clear();
    });
