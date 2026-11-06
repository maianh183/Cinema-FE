import {resourceService} from '@/services/contentService';
import { useEffect, useState } from "react";
import { Package, Loader2, DollarSign, Tag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/movie_dialog";
import { toast } from "sonner";
import FileUpload from "./FileUpload";
export default function ProductFormModal({ isOpen, onClose, onSave, initialData }) {
    const [formData, setFormData] = useState({
        name: "",
        category: "",
        price: 0,
        quantity: 0,
        type: "Food",
        description: "",
        imageUrl: "", startDate:"", endDate:"",
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading,setIsUploading] = useState(false);
    const [categories,setCategories]=useState([]);
    useEffect(()=>{if(isOpen)resourceService("categories").list({page:1,pageSize:100,type:"PRODUCT"}).then(r=>setCategories(r.items)).catch(e=>toast.error(e.message));},[isOpen]);
    useEffect(() => {
        if (initialData) {
            const isMerch = 'merchName' in initialData;
            setFormData({
                name: isMerch ? initialData.merchName : initialData.pName,
                category: isMerch ? '' : initialData.pType,
                price: initialData.price,
                quantity: isMerch ? initialData.availNum : initialData.quantity,
                type: isMerch ? "Merchandise" : "Food",
                description: initialData.description || "",
                imageUrl: initialData.imgUrl || "",
                startDate: initialData.startDate || "", endDate: initialData.endDate || "",
            });
        }
        else {
            setFormData({
                name: "",
                category: "Combo",
                price: 0,
                quantity: 0,
                type: "Food",
                description: "",
                imageUrl: "", startDate:"", endDate:"",
            });
        }
    }, [initialData, isOpen]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSaving || isUploading) return;
        if (!formData.name.trim() || formData.price < 0 || !Number.isFinite(formData.price) || !Number.isInteger(formData.quantity) || formData.quantity < 0 || ((!formData.startDate || !formData.endDate || formData.endDate<formData.startDate))) { toast.error('Kiểm tra tên, giá, số lượng và thời gian bán sản phẩm.');return; }
        setIsSaving(true);
        try {
            let requestData;
            if (formData.type === 'Food') {
                requestData = {
                    pName: formData.name,
                    pType: formData.category || 'Combo',
                    price: formData.price,
                    quantity: formData.quantity,
                    imgUrl: formData.imageUrl, description:formData.description, startDate:formData.startDate, endDate:formData.endDate
                };
            }
            else {
                requestData = {
                    merchName: formData.name,
                    price: formData.price,
                    availNum: formData.quantity,
                    imgUrl: formData.imageUrl, description:formData.description, startDate:formData.startDate, endDate:formData.endDate
                };
            }
            await onSave(requestData);
            onClose();
        }
        catch (error) {
            toast.error(error.message||"Lỗi khi lưu thông tin sản phẩm.");
        }
        finally {
            setIsSaving(false);
        }
    };
    return (<Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90dvh] custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600"/>
            {initialData ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          {/* Left Column: Image Upload */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hình ảnh sản phẩm</label>
            <FileUpload folderName="products" onUploadingChange={setIsUploading} initialPreviewUrl={formData.imageUrl} onUploadSuccess={(url) => setFormData((prev) => ({ ...prev, imageUrl: url }))} className="aspect-square rounded-3xl"/>
          </div>

          {/* Right Column: Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tên sản phẩm</label>
              <input aria-label="Tên sản phẩm" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="VD: Bắp rang bơ phô mai"/>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <Tag className="w-3 h-3"/> Loại
                </label>
                <select aria-label="Loại" disabled={!!initialData} value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none">
                  <option value="Food">Food & Drink</option>
                  <option value="Merchandise">Merchandise</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Danh mục</label>
                <select aria-label="Danh mục" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} disabled={formData.type === 'Merchandise'} className={`w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 ${formData.type === 'Merchandise' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <option value="" disabled>-- Chọn danh mục --</option>
                  {[...new Set([...categories.map(c=>c.name),formData.category].filter(Boolean))].map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <DollarSign className="w-3 h-3"/> Giá bán
                </label>
                <input aria-label="Giá bán" type="number" required min="0" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none"/>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Số lượng tồn</label>
                <input aria-label="Số lượng tồn" type="number" required min="0" step="1" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none"/>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="field">Bắt đầu bán<input type="date" required value={formData.startDate} onChange={e=>setFormData({...formData,startDate:e.target.value})}/></label><label className="field">Kết thúc bán<input type="date" required value={formData.endDate} min={formData.startDate} onChange={e=>setFormData({...formData,endDate:e.target.value})}/></label></div>
          <div className="md:col-span-2 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mô tả sản phẩm</label>
              <textarea aria-label="Mô tả sản phẩm" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="Mô tả ngắn về sản phẩm..."/>
            </div>
          </div>

          <div className="md:col-span-2 flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black hover:bg-gray-200 transition-all uppercase tracking-widest text-xs">
              Hủy bỏ
            </button>
            <button type="submit" disabled={isSaving || isUploading} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : null}
              {initialData ? "Cập nhật sản phẩm" : "Thêm vào kho hàng"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>);
}
