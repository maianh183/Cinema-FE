import {useUnsavedChanges} from '@/hooks/useUnsavedChanges';
import Pagination from '@/components/tables/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { can } from '@/utils/permissions';
import { PermissionButton } from '@/components/RoleGuard';
import { useState, useEffect, useMemo } from 'react';
import { Plus, RotateCcw, Save, X, ChevronDown, Building2, Loader2, Monitor, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { roomService } from '@/services/roomService';
import { branchService } from '@/services/branchService';
import { useAuthStore } from '@/stores/authStore';
const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
// Helper tạo ghế mặc định
const generateSeatsByCapacity = (capacity, branchId, roomId) => {
    const seats = [];
    const colsPerRow = 10;
    for (let i = 0; i < capacity; i++) {
        const rowIndex = Math.floor(i / colsPerRow);
        const colIndex = (i % colsPerRow) + 1;
        const rowLabel = rows[rowIndex] || `R${rowIndex}`;
        seats.push({
            branchId, roomId, sRow: rowIndex + 1, sColumn: colIndex,
            sType: 1, sStatus: true, sPrice: 0,
            _id: `${rowLabel}${colIndex}`, _status: 'available'
        });
    }
    return seats;
};
export default function RoomsSeatsPage() {
    const [branches, setBranches] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [activeBranchId, setActiveBranchId] = useState('');
    const [activeRoomId, setActiveRoomId] = useState('');
    const [seats, setSeats] = useState([]);
    const [savedSeats,setSavedSeats]=useState([]);
    const [seatsLoading,setSeatsLoading]=useState(false);
    const [seatsError,setSeatsError]=useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    // Paint Tool UX
    const [selectedPaintType, setSelectedPaintType] = useState(1); // 1: Thường, 2: VIP, 0: Ngừng sử dụng
    const [isMouseDown, setIsMouseDown] = useState(false);
    const { user } = useAuthStore();
    const isManager = user?.role === 'MANAGER';
    const managerBranchId = user?.branchId;
    const dirty=JSON.stringify(seats)!==JSON.stringify(savedSeats);
    function discard(){setSeats(savedSeats.map(s=>({...s})));setIsBulkMode(false);setIsMouseDown(false);}
    const unsaved=useUnsavedChanges({dirty,onSave:handleSave,onDiscard:discard});
    function chooseRoom(id){if(activeRoomId===id)return;unsaved.request(()=>{setSeats([]);setSavedSeats([]);setSeatsLoading(true);setIsBulkMode(false);setActiveRoomId(id);});}
    // Load Data
    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                const [roomData, branchData] = await Promise.all([
                    roomService.getAll(),
                    branchService.getAll()
                ]);
                const rawRooms = Array.isArray(roomData) ? roomData : [];
                const rawBranches = Array.isArray(branchData) ? branchData : [];
                setRooms(rawRooms);
                setBranches(rawBranches);
                if (isManager && (managerBranchId !== undefined && managerBranchId !== null)) {
                    setActiveBranchId(managerBranchId);
                }
                else if (rawBranches.length > 0) {
                    setActiveBranchId(rawBranches[0].branchId);
                }
            }
            catch (error) {
                toast.error("Lỗi kết nối hệ thống dữ liệu phòng.");
            }
            finally {
                setIsLoading(false);
            }
        };
        loadData();
        // For paint drag
        const handleGlobalMouseUp = () => setIsMouseDown(false);
        window.addEventListener('pointerup', handleGlobalMouseUp);
        return () => window.removeEventListener('pointerup', handleGlobalMouseUp);
    }, []);
    const filteredRooms = useMemo(() => rooms.filter(r => r.branchId === activeBranchId), [rooms, activeBranchId]);
    useEffect(() => { setActiveRoomId(''); setSeats([]);setSavedSeats([]);setIsBulkMode(false); }, [activeBranchId]);
    // Ignore stale responses after switching rooms or branches.
    useEffect(() => {
        let current=true; setSeats([]);setSavedSeats([]);setIsBulkMode(false); setSeatsError('');
        const loadSeats = async () => {
            const activeRoom = rooms.find(r => r.roomId === activeRoomId && r.branchId === activeBranchId);
            if (activeRoom && activeBranchId !== '') {
                try {
                    setSeatsLoading(true);
                    const dbSeats = await roomService.getSeats(activeBranchId, activeRoom.roomId);
                    if (!current) return;
                    if (dbSeats && dbSeats.length > 0) {
                        // Chuyển đổi SeatResponse sang UISeat
                        const uiSeats = dbSeats.map(s => {
                            const rowLabel = rows[s.sRow - 1] || `R${s.sRow}`;
                            let status = 'available';
                            if (!s.sStatus)
                                status = 'disabled';
                            else if (s.sType === 2)
                                status = 'selected'; // VIP
                            return {
                                ...s,
                                _id: `${rowLabel}${s.sColumn}`,
                                _status: status
                            };
                        });
                        setSeats(uiSeats);setSavedSeats(uiSeats.map(s=>({...s})));
                    }
                    else {
                        // Nếu chưa có ghế trên DB, tạo mặc định
                        const initial=generateSeatsByCapacity(activeRoom.rCapacity, activeBranchId, activeRoom.roomId);setSeats(initial);setSavedSeats(initial.map(s=>({...s})));
                    }
                }
                catch (error) {
                    if(current){setSeats([]);setSeatsError(error.message||'Không tải được sơ đồ ghế.');}
                } finally {if(current)setSeatsLoading(false);}
            } else {setSeatsLoading(false);}
        };
        loadSeats();
        return ()=>{current=false;};
    }, [activeRoomId, rooms, activeBranchId]);
    const [roomQuery,setRoomQuery]=useState("");
    const roomPagination=usePagination(filteredRooms.filter(r=>(r.roomId+" "+r.rType).toLowerCase().includes(roomQuery.toLowerCase())),6,roomQuery+activeBranchId);
    const handleSeatClick = (id) => {
        if(isSaving||!can(user,"rooms","update"))return;
        if (!isBulkMode)
            return;
        setSeats(prev => prev.map(seat => {
            if (seat._id === id) {
                if (selectedPaintType === 0) {
                    return { ...seat, _status: 'disabled', sStatus: false };
                }
                else {
                    let status = 'available';
                    if (selectedPaintType === 2)
                        status = 'selected';
                    return { ...seat, _status: status, sType: selectedPaintType, sStatus: true };
                }
            }
            return seat;
        }));
    };
    const handleSeatMouseDown = (id) => {
        if (!isBulkMode)
            return;
        setIsMouseDown(true);
        handleSeatClick(id);
    };
    const handleSeatMouseEnter = (id) => {
        if (!isBulkMode || !isMouseDown)
            return;
        handleSeatClick(id);
    };
    async function handleSave(){
        if(isSaving||!can(user,'rooms','update')||!activeRoomId||!activeBranchId||seatsLoading||seatsError)throw new Error('Không thể lưu sơ đồ phòng lúc này.');
        setIsSaving(true);setIsMouseDown(false);
        try{
            const payload=seats.map(({_id,_status,...rest})=>rest);
            await roomService.updateLayout(activeBranchId,activeRoomId,payload);
            setSavedSeats(seats.map(s=>({...s})));setIsBulkMode(false);
            toast.success('Đã lưu thay đổi sơ đồ ghế.');
        }finally{setIsSaving(false);}
    }
    const handleSaveRoom = async (e) => {
        e.preventDefault();
        if (!activeBranchId)
            return;
        const formData = new FormData(e.currentTarget);
        const roomIdInput = editingRoom?.roomId || Number(formData.get('roomId'));
        const cap = Number(formData.get('capacity'));
        const basePrice = Number(formData.get('basePrice'));
        if(isSaving || !Number.isInteger(roomIdInput)||roomIdInput<1||!Number.isInteger(cap)||cap<1||cap>500||!Number.isFinite(basePrice)||basePrice<0){toast.error('Kiểm tra mã phòng, sức chứa 1–500 ghế và giá không âm.');return;}
        setIsSaving(true);
        const roomData = {
            rType: formData.get('type'),
            rCapacity: cap,
            branchId: activeBranchId,
            roomId: roomIdInput,
            basePrice: basePrice,
            totalSeats: cap
        };
        try {
            if (editingRoom) {
                // Cập nhật
                const updated = await roomService.update(activeBranchId, editingRoom.roomId, roomData);
                setRooms(prev => prev.map(r => (r.branchId === activeBranchId && r.roomId === editingRoom.roomId) ? updated : r));
                // Nếu đang chọn phòng này, có thể cần load lại
                if (activeRoomId === editingRoom.roomId && editingRoom.roomId !== updated.roomId) {
                    setActiveRoomId(updated.roomId);
                }
                toast.success("Cập nhật phòng chiếu thành công!");
            }
            else {
                // Thêm mới
                const created = await roomService.create(roomData);
                setRooms(prev => [...prev, created]);
                setActiveRoomId(created.roomId);
                toast.success("Thêm phòng chiếu thành công!");
            }
            setIsRoomModalOpen(false);
            setEditingRoom(null);
        }
        catch (error) {
            toast.error(`Không thể lưu phòng: ${error.response?.data?.message || "Lỗi API"}`);
        } finally {setIsSaving(false);}
    };
    const handleDeleteRoom = async (branchId, roomId) => {
        if (!confirm("Bạn có chắc chắn muốn xóa phòng chiếu này?"))
            return;
        try {
            await roomService.delete(branchId, roomId);
            setRooms(prev => prev.filter(r => !(r.branchId === branchId && r.roomId === roomId)));
            if (activeRoomId === roomId)
                setActiveRoomId('');
            toast.success("Đã xóa phòng chiếu.");
        }
        catch (error) {
            toast.error("Lỗi khi xóa phòng.");
        }
    };
    if (isLoading)
        return (<div className="flex h-[80vh] flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 animate-spin text-indigo-500"/>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[4px]">Mapping Theater Grid...</p>
    </div>);
    return (<div className="w-full max-w-[1600px] mx-auto min-h-screen flex flex-col pb-12 px-4">

      {/* Header */}
      <div className="flex items-end justify-between mb-8 shrink-0">
        <div>
          <div className={`relative flex items-center gap-2 text-[11px] text-indigo-500 font-black tracking-[2px] mb-2 group bg-indigo-50 w-fit px-3 py-1 rounded-lg ${isManager ? '' : 'cursor-pointer'}`}>
            <Building2 className="w-3.5 h-3.5"/>
            {!isManager && (<select value={activeBranchId} aria-label="Chi nhánh phòng chiếu" onChange={(e) => {const id=Number(e.target.value);unsaved.request(()=>{setActiveRoomId('');setSeats([]);setSavedSeats([]);setActiveBranchId(id);});}} className="absolute inset-0 opacity-0 cursor-pointer w-full">
                {branches.map((b, i) => <option key={b.branchId || i} value={b.branchId}>{b.bName?.toUpperCase() || `BRANCH ${b.branchId}`}</option>)}
              </select>)}
            <span className="uppercase">{branches.find(b => b.branchId === activeBranchId)?.bName || 'SELECT BRANCH'}</span>
            {!isManager && <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-all"/>}
          </div>
          <h1 className="text-2xl font-semibold">Phòng & ghế</h1>
        </div>
        <PermissionButton permission="rooms:create" onClick={() => unsaved.request(()=>{ setEditingRoom(null); setIsRoomModalOpen(true); })} className="bg-[#4a4bd7] hover:bg-indigo-700 shadow-xl shadow-indigo-100 px-6 py-3.5 rounded-2xl font-black text-white flex items-center gap-2 transition-all text-xs uppercase tracking-widest">
          <Plus className="w-5 h-5"/> THÊM PHÒNG CHIẾU
        </PermissionButton>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Sidebar - Room List */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2"><input className="form-control" placeholder="Tìm phòng…" aria-label="Tìm phòng" value={roomQuery} onChange={e=>setRoomQuery(e.target.value)}/><Pagination {...roomPagination}/>
          {roomPagination.total > 0 ? roomPagination.items.map((room, i) => (<div key={room.roomId || i} onClick={() => chooseRoom(room.roomId)} className={`p-6 rounded-[24px] cursor-pointer transition-all border-2 group/card relative ${activeRoomId === room.roomId ? 'bg-white border-indigo-600 shadow-xl scale-[1.02]' : 'bg-white/60 border-transparent hover:bg-white hover:border-gray-200'}`}>
              <div className="flex justify-between items-start mb-4">
                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${activeRoomId === room.roomId ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{room.rType}</span>
                <div className="flex gap-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <PermissionButton permission="rooms:update" onClick={(e) => { e.stopPropagation(); unsaved.request(()=>{setEditingRoom(room); setIsRoomModalOpen(true);}); }} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500">
                    <Edit2 className="w-4 h-4"/>
                  </PermissionButton>
                  <PermissionButton permission="rooms:delete" onClick={(e) => { e.stopPropagation(); unsaved.request(()=>handleDeleteRoom(room.branchId, room.roomId)); }} className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500">
                    <X className="w-4 h-4"/>
                  </PermissionButton>
                </div>
              </div>
              <h3 className="text-xl font-black text-gray-800 leading-tight mb-4 uppercase">Room {room.roomId}</h3>
              <div className="flex flex-col gap-2">
                <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                  <span className="text-[10px] font-black text-gray-400 uppercase">Sức chứa</span>
                  <p className="text-sm font-black text-gray-900">{room.rCapacity} <span className="text-[10px] text-gray-500 font-bold uppercase ml-1">Ghế</span></p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                  <span className="text-[10px] font-black text-gray-400 uppercase">Giá vé cơ bản</span>
                  <p className="text-sm font-black text-indigo-600">{room.basePrice?.toLocaleString('vi-VN')} <span className="text-[10px] text-gray-500 font-bold uppercase ml-1">VNĐ</span></p>
                </div>
              </div>
            </div>)) : (<div className="py-20 text-center text-gray-300 font-black uppercase text-xs tracking-widest border-2 border-dashed border-gray-100 rounded-3xl">Chi nhánh chưa có phòng</div>)}
        </div>

        {/* Main Seat Map Editor */}
        <div className="flex-1 bg-white rounded-[32px] shadow-sm border border-gray-100 flex flex-col overflow-hidden relative">
          {activeRoomId ? (seatsLoading ? <p role="status" className="p-10">Đang tải sơ đồ ghế…</p> : seatsError ? <p role="alert" className="p-10 text-red-600">{seatsError}</p> : <>
              <div className="bg-gray-50 p-4 border-b flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-semibold" role="status">{isBulkMode?'Chỉnh sửa':'Chỉ xem'}{dirty?' · Có thay đổi chưa lưu':''}</span>
                {!isBulkMode&&<PermissionButton permission="rooms:update" className="btn-primary" onClick={()=>setIsBulkMode(true)}>Chỉnh sửa sơ đồ</PermissionButton>}
                {isBulkMode&&<div className="flex flex-wrap gap-2" aria-label="Loại ghế">{[[1,'Thường'],[2,'VIP'],[0,'Ngừng sử dụng']].map(([type,label])=><button key={type} disabled={isSaving} aria-pressed={selectedPaintType===type} className={'btn-secondary '+(selectedPaintType===type?'!bg-indigo-100 !border-indigo-500':'')} onClick={()=>setSelectedPaintType(type)}>{label}</button>)}</div>}
              </div>

              <div className="flex-1 relative flex flex-col items-center justify-center p-12 bg-gradient-to-b from-indigo-50/20 to-transparent overflow-auto custom-scrollbar">
                {/* Sơ đồ màn hình */}
                <div className="mb-16 w-full max-w-[700px] shrink-0">
                  <div className="h-2 w-full bg-indigo-600 rounded-full shadow-[0_10px_30px_rgba(74,75,215,0.4)]"/>
                  <div className="text-center mt-4 text-[11px] font-black text-indigo-300 uppercase tracking-[10px]">MÀN HÌNH CHÍNH</div>
                </div>

                <div className="grid grid-cols-10 gap-4 p-8 bg-white/50 rounded-[40px] border border-white/50 backdrop-blur-sm">
                  {seats.map((seat, i) => (<button type="button" key={seat._id || i} aria-label={'Ghế '+seat._id} data-seat-type={seat.sType} data-seat-active={seat.sStatus} disabled={!isBulkMode||isSaving} onClick={()=>handleSeatClick(seat._id)} onPointerDown={() => handleSeatMouseDown(seat._id)} onPointerEnter={() => handleSeatMouseEnter(seat._id)} className={`w-[48px] h-[48px] rounded-xl flex items-center justify-center transition-all duration-300 select-none shadow-sm font-black text-xs border-2 border-white/20
                        ${seat._status === 'disabled' ? 'bg-gray-200 text-gray-400 opacity-30' :
                    seat.sType === 2 ? 'bg-purple-600 text-white shadow-xl scale-110 z-10' :
                            'bg-indigo-100 text-indigo-600'} 
                        ${isBulkMode ? 'cursor-crosshair hover:ring-2 hover:ring-indigo-400' : 'cursor-default'}`}>
                      {seat._id}
                    </button>))}
                </div>
              </div>

              <div className="border-t p-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-500">{seats.filter(s=>s.sStatus&&s.sType===2).length} ghế VIP · {seats.filter(s=>s.sStatus).length} ghế đang sử dụng</p>
                {isBulkMode&&<div className="flex flex-wrap gap-2">
                  <button className="btn-secondary" disabled={isSaving} onClick={discard}>Cancel</button>
                  <PermissionButton permission="rooms:update" disabled={isSaving} className="btn-primary" onClick={()=>handleSave().catch(e=>toast.error(e.message||'Không lưu được sơ đồ ghế.'))}>{isSaving?'Đang lưu…':'Lưu thay đổi'}</PermissionButton>
                </div>}
              </div>
            </>) : (<div className="flex-1 flex flex-col items-center justify-center min-h-80 p-8 text-center text-gray-500">
              <Monitor className="w-20 h-20 mb-6 opacity-20"/>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Chưa chọn phòng chiếu</h2>
              <p>Vui lòng chọn một phòng từ danh sách để xem và quản lý sơ đồ ghế.</p>
            </div>)}
        </div>
      </div>

      {unsaved.dialog}
      {/* Room Modal */}
      {isRoomModalOpen && (<>
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 transition-opacity" onClick={() => { setIsRoomModalOpen(false); setEditingRoom(null); }}/>
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] bg-white rounded-[32px] shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
              <h2 className="font-black text-gray-800 uppercase text-lg tracking-tight">
                {editingRoom ? 'Cập nhật phòng chiếu' : 'Thêm phòng chiếu mới'}
              </h2>
              <PermissionButton permission="rooms:create" onClick={() => { setIsRoomModalOpen(false); setEditingRoom(null); }} className="p-2 hover:bg-white rounded-xl transition-all"><X className="w-6 h-6 text-gray-400"/></PermissionButton>
            </div>
            <form onSubmit={handleSaveRoom} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Số phòng (Mã phòng)</label>
                  <input aria-label="Số phòng (Mã phòng)" name="roomId" type="number" required defaultValue={editingRoom?.roomId || ''} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" placeholder="VD: 1, 2, 3..." disabled={!!editingRoom}/>
                  {editingRoom && <p className="text-[9px] text-orange-500 ml-1 font-bold">Không thể sửa mã phòng</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Giá cơ bản (VNĐ)</label>
                  <input aria-label="Giá cơ bản (VNĐ)" name="basePrice" type="number" required defaultValue={editingRoom?.basePrice || 50000} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" placeholder="VD: 50000"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Loại phòng</label>
                  <select aria-label="Loại phòng" name="type" defaultValue={editingRoom?.rType || 'Standard'} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500">
                    <option value="Standard">Standard</option>
                    <option value="2D">2D</option>
                    <option value="3D">3D</option>
                    <option value="IMAX">IMAX</option>
                    <option value="4DX">4DX</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sức chứa dự kiến</label>
                  <input aria-label="Sức chứa dự kiến" name="capacity" type="number" required defaultValue={editingRoom?.rCapacity || 100} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-6">
                <PermissionButton permission="rooms:create" type="button" onClick={() => { setIsRoomModalOpen(false); setEditingRoom(null); }} className="flex-1 py-4 font-black text-gray-400 uppercase text-xs tracking-widest hover:bg-gray-50 rounded-2xl transition-all">Hủy</PermissionButton>
                <PermissionButton permission={editingRoom ? "rooms:update" : "rooms:create"} type="submit" className="flex-[2] py-4 rounded-2xl font-black text-white bg-[#4a4bd7] hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all uppercase text-xs tracking-widest">
                  {editingRoom ? 'Lưu thay đổi' : 'Tạo phòng chiếu'}
                </PermissionButton>
              </div>
            </form>
          </div>
        </>)}
    </div>);
}
