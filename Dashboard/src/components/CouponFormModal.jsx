import { nextCouponAvailable, businessTime } from '@/utils/business';
import { toast } from 'sonner';
import React, { useEffect, useState } from 'react';
import {
  X,
  Ticket,
  Calendar,
  Percent,
  Hash,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Gift,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from './ui/movie_dialog';
export default function CouponFormModal({ isOpen, onClose, onSave, initialData }) {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    saleOff: 0,
    releaseNum: 100,
    availNum: 100,
    minOrderTotal: 0,
    maxDiscount: 0,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setError('');
    if (initialData) {
      setFormData({
        startDate: initialData.startDate?.split('T')[0] || '',
        endDate: initialData.endDate?.split('T')[0] || '',
        saleOff: initialData.saleOff,
        releaseNum: initialData.releaseNum,
        availNum: initialData.availNum,
        minOrderTotal: initialData.minOrderTotal || 0,
        maxDiscount: initialData.maxDiscount || 0,
      });
    } else {
      setFormData({
        startDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        saleOff: 10,
        releaseNum: 100,
        availNum: 100,
        minOrderTotal: 0,
        maxDiscount: 0,
      });
    }
  }, [initialData, isOpen]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    if (
      !Number.isFinite(businessTime(formData.startDate)) ||
      !Number.isFinite(businessTime(formData.endDate, true)) ||
      businessTime(formData.endDate, true) < businessTime(formData.startDate) ||
      formData.saleOff < 1 ||
      formData.saleOff > 100 ||
      !Number.isInteger(formData.releaseNum) ||
      !Number.isInteger(formData.availNum) ||
      formData.releaseNum < 0 ||
      formData.availNum < 0 ||
      formData.minOrderTotal < 0 ||
      formData.maxDiscount < 0
    ) {
      setError('Kiểm tra ngày hiệu lực, tỷ lệ giảm và số lượng còn lại.');
      return;
    }
    setError('');
    setIsSaving(true);
    try {
      nextCouponAvailable(initialData, formData.releaseNum);
      const { availNum, ...payload } = formData;
      await onSave(payload);
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-white/95 backdrop-blur-xl border-none shadow-2xl rounded-[32px] max-h-[90dvh] overflow-y-auto p-0 animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-white relative overflow-hidden">
          {/* Decorative Background Pattern */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-purple-400/20 rounded-full blur-2xl" />

          <div className="relative z-10 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight leading-none">
                  {initialData ? 'Cập nhật Voucher' : 'Tạo mã giảm giá'}
                </DialogTitle>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1">
                  Hệ thống ưu đãi khách hàng
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="field">
              Giá trị đơn tối thiểu (VND)
              <input
                type="number"
                min="0"
                required
                value={formData.minOrderTotal}
                onChange={(e) =>
                  setFormData({ ...formData, minOrderTotal: Number(e.target.value) })
                }
              />
            </label>
            <label className="field">
              Giảm tối đa (VND, 0 = không giới hạn)
              <input
                type="number"
                min="0"
                required
                value={formData.maxDiscount}
                onChange={(e) => setFormData({ ...formData, maxDiscount: Number(e.target.value) })}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Ngày bắt đầu
              </label>
              <input
                aria-label="Ngày bắt đầu"
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Ngày kết thúc
              </label>
              <input
                aria-label="Ngày kết thúc"
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
              <Percent className="w-3 h-3" /> Tỷ lệ giảm giá (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="100"
                required
                value={formData.saleOff}
                onChange={(e) => setFormData({ ...formData, saleOff: Number(e.target.value) })}
                className="w-full pl-5 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm transition-all"
                placeholder="VD: 10"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-gray-300">
                %
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                <Hash className="w-3 h-3" /> Số lượng phát hành
              </label>
              <input
                aria-label="Số lượng phát hành"
                type="number"
                min={initialData?.releaseNum ?? 0}
                required
                aria-invalid={!!initialData && formData.releaseNum < initialData.releaseNum}
                value={formData.releaseNum}
                onChange={(e) => setFormData({ ...formData, releaseNum: Number(e.target.value) })}
                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm transition-all"
                placeholder="100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                <Ticket className="w-3 h-3" /> Số lượng còn lại
              </label>
              <output aria-label="Số lượng còn lại" className="block p-4 rounded-xl bg-gray-50">
                {initialData ? initialData.availNum : 'Máy chủ cấp khi phát hành'}
              </output>
              <p className="text-xs text-gray-500">
                Máy chủ tính lại số còn lại khi đổi lượng phát hành, giữ nguyên số đã sử dụng.
              </p>
            </div>
          </div>

          {initialData && formData.releaseNum < initialData.releaseNum && (
            <p role="alert" className="text-red-600">
              Số lượng phát hành không được nhỏ hơn số lượng hiện tại.
            </p>
          )}
          {error && (
            <p role="alert" className="text-red-600">
              {error}
            </p>
          )}
          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl font-black hover:bg-gray-200 transition-all uppercase text-[10px] tracking-widest"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSaving || (!!initialData && formData.releaseNum < initialData.releaseNum)}
              className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:translate-y-[-2px] transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Gift className="w-4 h-4" />
              )}
              {initialData ? 'Cập nhật ngay' : 'Phát hành Voucher'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
