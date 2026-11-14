import CalendarToolbar from '@/components/calendar/CalendarToolbar';
import { showtimeStatus, showtimeStatusColors, showtimeStatusLabels } from '@/utils/showtimeStatus';
import { useBusinessClock } from '@/hooks/useBusinessClock';
import CalendarView from '@/components/calendar/CalendarView';
import { todayVN, addDays, navigateCalendar } from '@/utils/calendar';
import { showtimeEnd, showtimesOverlap } from '@/utils/business';
import { ErrorState } from '@/components/ui/Feedback';
import OperationalList from '@/components/tables/OperationalList';
import { PermissionButton } from '@/components/RoleGuard';
import { useState, useEffect } from 'react';
import { Plus, ChevronDown, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
// Import Services
import { showtimeService } from '@/services/showtimeService';
import { movieService } from '@/services/movieService';
import { branchService } from '@/services/branchService';
import ShowtimeFormModal from '@/components/ShowtimeFormModal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
export default function ShowtimesPage() {
  const now = useBusinessClock();
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedShowtime, setSelectedShowtime] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState('week');
  const [calendarMode, setCalendarMode] = useState('week');
  function changeView(mode) {
    setCalendarMode(mode);
    setViewMode(mode);
  }
  function changeDate(date) {
    setSelectedDate(date);
    setViewMode(calendarMode);
  }
  const [selectedDate, setSelectedDate] = useState(() => todayVN());
  const [selectedBranch, setSelectedBranch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  // State cho Confirm Delete
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { user } = useAuthStore();
  const isManager = user?.role === 'MANAGER';
  const managerBranchId = user?.branchId;
  // --- API DATA LOADING USING SERVICES ---
  const loadData = async () => {
    try {
      setIsLoading(true);
      setLoadError('');
      const [stData, mvData, brData] = await Promise.all([
        showtimeService.getAll(),
        movieService.getAll(),
        branchService.getAll(),
      ]);
      setShowtimes(Array.isArray(stData) ? stData : []);
      setMovies(Array.isArray(mvData) ? mvData : []);
      setBranches(Array.isArray(brData) ? brData : []);
      if (isManager && managerBranchId !== undefined && managerBranchId !== null) {
        setSelectedBranch(String(managerBranchId));
      } else if (Array.isArray(brData) && brData.length > 0 && !selectedBranch) {
        setSelectedBranch(String(brData[0].branchId));
      }
    } catch (err) {
      setLoadError(err.message || 'Không thể tải dữ liệu.');
      toast.error('Không thể tải dữ liệu từ hệ thống.');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    loadData();
  }, []);

  const currentBranchShowtimes = showtimes
    .filter((st) => st.branchId === Number(selectedBranch))
    .map((st) => ({ ...st, status: showtimeStatus(st, now) }));
  // --- ACTION HANDLERS ---
  const handleSaveShowtime = async (e, moviePayload) => {
    e.preventDefault();
    if (isSaving) return;
    const formData = new FormData(e.currentTarget);
    const payload = {
      movieId: moviePayload.movieId,
      branchId: Number(selectedBranch),
      roomId: Number(formData.get('room')),
      day: formData.get('date'),
      startTime: formData.get('startTime'),
      formatName: formData.get('formatName') || '2D',
    };
    if (
      !payload.movieId ||
      !payload.branchId ||
      !payload.roomId ||
      !payload.day ||
      !payload.startTime
    ) {
      toast.error('Nhập phim, phòng, ngày và giờ bắt đầu.');
      return;
    }
    try {
      Object.assign(
        payload,
        showtimeEnd(
          payload.day,
          payload.startTime,
          movies.find((m) => String(m.movieId) === String(payload.movieId))?.runTime,
        ),
      );
    } catch (error) {
      toast.error(error.message);
      return;
    }
    if (
      showtimes.some((s) => s.timeId !== selectedShowtime?.timeId && showtimesOverlap(s, payload))
    ) {
      toast.error('Suất chiếu trùng thời gian với lịch trong phòng.');
      return;
    }
    setIsSaving(true);
    try {
      if (selectedShowtime) {
        await showtimeService.update(selectedShowtime.timeId, payload);
        toast.success('Lịch chiếu đã được cập nhật thành công.');
      } else {
        await showtimeService.create(payload);
        toast.success('Lịch chiếu mới đã được tạo thành công.');
      }
      await loadData(); // Reload data to sync UI
      setIsDrawerOpen(false);
    } catch (err) {
      toast.error(err.message || 'Lỗi khi lưu dữ liệu lên hệ thống.');
    } finally {
      setIsSaving(false);
    }
  };
  const handleDelete = () => {
    if (!selectedShowtime) return;
    setIsConfirmOpen(true);
  };
  const confirmDelete = async () => {
    if (!selectedShowtime) return;
    try {
      await showtimeService.delete(selectedShowtime.timeId);
      setShowtimes((prev) => prev.filter((s) => s.timeId !== selectedShowtime.timeId));
      toast.success('Đã xóa lịch chiếu khỏi hệ thống.');
      setIsDrawerOpen(false);
      setIsConfirmOpen(false);
    } catch (err) {
      toast.error('Không thể thực hiện lệnh xóa.');
      throw err;
    }
  };
  const navigateDate = (step) => setSelectedDate(navigateCalendar(selectedDate, viewMode, step));
  const handleToday = () => setSelectedDate(todayVN());
  if (isLoading)
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center font-black text-gray-300 animate-pulse uppercase tracking-[4px]">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-500" />
        Syncing Cinemas...
      </div>
    );
  if (loadError) return <ErrorState error={loadError} retry={loadData} />;
  return (
    <div className="relative w-full h-[calc(100vh-100px)] overflow-hidden bg-[#f7f9fb] flex rounded-2xl border border-gray-200 shadow-sm">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* HEADER */}
        <div className="bg-white px-8 py-5 border-b border-gray-200 flex flex-wrap gap-3 justify-between items-center z-10 shadow-sm">
          <div>
            <div
              className={`relative flex items-center gap-2 text-[11px] text-indigo-500 font-bold tracking-[2px] mb-1 group ${isManager ? 'opacity-80' : 'cursor-pointer'}`}
            >
              {!isManager && (
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                >
                  {branches.map((br) => (
                    <option key={br.branchId} value={String(br.branchId)}>
                      {br.bName.toUpperCase()}
                    </option>
                  ))}
                </select>
              )}
              <span className="uppercase">
                {branches.find((b) => String(b.branchId) === selectedBranch)?.bName ||
                  'SELECT BRANCH'}
              </span>
              {!isManager && (
                <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl font-semibold">Lịch chiếu</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              className="btn-secondary"
              onClick={() => setViewMode((v) => (v === 'list' ? calendarMode : 'list'))}
            >
              {viewMode === 'list' ? 'Xem lịch' : 'Xem danh sách'}
            </button>
            <PermissionButton
              permission="showtimes:create"
              onClick={() => {
                setSelectedShowtime(null);
                setIsDrawerOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black flex items-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" /> Thêm lịch chiếu
            </PermissionButton>
          </div>
        </div>

        <div
          className="flex flex-wrap gap-2 p-3 bg-white text-xs"
          aria-label="Chú thích trạng thái suất chiếu"
        >
          {['SCHEDULED', 'ON_AIR', 'FINISHED'].map((status) => (
            <span key={status} className={'rounded px-2 py-1 ' + showtimeStatusColors[status]}>
              {showtimeStatusLabels[status]}
            </span>
          ))}
        </div>
        <CalendarToolbar
          date={selectedDate}
          view={calendarMode}
          active={viewMode !== 'list'}
          onNavigate={changeDate}
          onViewChange={changeView}
          shortDateInput
        />
        {/* CALENDAR CONTENT */}
        <div className="flex-1 overflow-y-auto bg-white relative custom-scrollbar">
          {viewMode === 'list' && (
            <OperationalList
              rows={currentBranchShowtimes}
              idKey="timeId"
              columns={[
                ['movieName', 'Phim'],
                ['day', 'Ngày'],
                ['roomId', 'Phòng'],
                ['startTime', 'Bắt đầu'],
                ['endTime', 'Kết thúc'],
                ['status', 'Trạng thái'],
              ]}
              filters={[
                { name: 'day', label: 'Ngày chiếu', type: 'date' },
                {
                  name: 'movieId',
                  label: 'Tất cả phim',
                  options: movies.map((m) => [m.movieId, m.mName]),
                },
                { name: 'roomId', label: 'Tất cả phòng' },
                { name: 'status', label: 'Tất cả trạng thái' },
              ]}
              onSelect={(st) => {
                setSelectedShowtime(st);
                setIsDrawerOpen(true);
              }}
            />
          )}
          {viewMode !== 'list' && (
            <CalendarView
              date={selectedDate}
              view={viewMode}
              showToolbar={false}
              onNavigate={changeDate}
              onViewChange={changeView}
              events={currentBranchShowtimes.map((st) => ({
                id: st.timeId,
                date: st.day,
                endDate: st.endDate || (st.endTime <= st.startTime ? addDays(st.day, 1) : st.day),
                startTime: st.startTime,
                endTime: st.endTime,
                title:
                  st.movieName || movies.find((m) => m.movieId === st.movieId)?.mName || 'Phim',
                subtitle: 'Phòng ' + st.roomId + ' · ' + (st.branchName || ''),
                color: st.roomId,
                status: st.status,
                resource: st,
              }))}
              onEventClick={(st) => {
                setSelectedShowtime(st);
                setIsDrawerOpen(true);
              }}
              emptyMessage="Không có suất chiếu trong khoảng thời gian này."
            />
          )}
        </div>
      </div>

      {/* FORM MODAL COMPONENT */}
      <ShowtimeFormModal
        isSaving={isSaving}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        selectedShowtime={selectedShowtime}
        movies={movies}
        selectedDate={selectedDate}
        selectedBranch={selectedBranch}
        onSave={handleSaveShowtime}
        onDelete={handleDelete}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Xác nhận xóa suất chiếu"
        description={`Bạn có chắc chắn muốn xóa suất chiếu này? Hành động này sẽ gỡ bỏ lịch chiếu khỏi hệ thống và có thể ảnh hưởng đến các đơn hàng liên quan.`}
      />
    </div>
  );
}
