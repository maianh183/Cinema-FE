import { PermissionButton } from '@/components/RoleGuard';
import { useState, useRef, useEffect } from 'react';
import { X, Search, ChevronDown } from 'lucide-react';
import { roomService } from '@/services/roomService';
export default function ShowtimeFormDrawer({
  isOpen,
  onClose,
  selectedShowtime,
  movies,
  selectedDate,
  selectedBranch,
  onSave,
  onDelete,
  isSaving,
}) {
  const [movieSearchQuery, setMovieSearchQuery] = useState('');
  const [selectedMovieId, setSelectedMovieId] = useState('');
  const [isMovieDropdownOpen, setIsMovieDropdownOpen] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [roomError, setRoomError] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [roomId, setRoomId] = useState('');
  const dropdownRef = useRef(null);
  // Khôi phục dữ liệu khi mở Drawer
  useEffect(() => {
    if (selectedShowtime) {
      const movie = movies.find((m) => m.movieId === selectedShowtime.movieId);
      setMovieSearchQuery(movie?.mName || '');
      setSelectedMovieId(selectedShowtime.movieId);
      setDate(selectedShowtime.day);
      setStartTime(selectedShowtime.startTime);
      setRoomId(selectedShowtime.roomId);
    } else {
      setMovieSearchQuery('');
      setSelectedMovieId('');
      setDate(selectedDate);
      setStartTime('');
      setRoomId('');
    }
    // Load rooms for the selected branch
    const loadRooms = async () => {
      try {
        setRoomError('');
        const allRooms = await roomService.getAll();
        const branchRooms = allRooms.filter((r) => String(r.branchId) === String(selectedBranch));
        setRooms(branchRooms);
      } catch (err) {
        setRooms([]);
        setRoomError(err.message);
      }
    };
    if (isOpen) loadRooms();
  }, [selectedShowtime, isOpen, movies, selectedBranch, selectedDate]);
  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsMovieDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const filteredMovies = movies.filter((m) =>
    (m.mName || '').toLowerCase().includes(movieSearchQuery.toLowerCase()),
  );
  if (!isOpen) return null;
  return (
    <>
      <div
        className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-50 animate-in fade-in"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Thông tin lịch chiếu"
        style={{ width: 'min(100vw, 420px)', maxWidth: '100vw', maxHeight: '100dvh' }}
        className="fixed right-0 top-0 bottom-0 bg-white shadow-2xl z-[60] flex flex-col animate-in slide-in-from-right duration-300"
      >
        <div className="shrink-0 px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {selectedShowtime ? 'Chỉnh sửa lịch chiếu' : 'Thêm lịch chiếu'}
            </h2>
            <p className="text-xs text-gray-500 font-medium">Thông tin lịch chiếu</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => onSave(e, { movieId: selectedMovieId, movieTitle: movieSearchQuery })}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            {/* Chọn phim - Chức năng Click để mở danh sách[cite: 5] */}
            <div ref={dropdownRef}>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Chọn phim
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={movieSearchQuery}
                  onChange={(e) => {
                    setMovieSearchQuery(e.target.value);
                    setSelectedMovieId('');
                    setIsMovieDropdownOpen(true);
                  }}
                  onFocus={() => setIsMovieDropdownOpen(true)} // Tự động mở khi bấm vào[cite: 5]
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all"
                  placeholder="Tìm và chọn phim…"
                  autoComplete="off"
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />

                {isMovieDropdownOpen && (
                  <div className="relative mt-1.5 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-[220px] overflow-y-auto custom-scrollbar">
                    {filteredMovies.length > 0 ? (
                      filteredMovies.map((movie, i) => (
                        <div
                          key={movie.movieId || i}
                          onClick={() => {
                            setMovieSearchQuery(movie.mName);
                            setSelectedMovieId(movie.movieId);
                            setIsMovieDropdownOpen(false);
                          }}
                          className="px-4 py-3 hover:bg-blue-50/50 cursor-pointer flex items-center justify-between border-b last:border-0"
                        >
                          <div>
                            <p className="text-sm font-bold text-gray-800">{movie.mName}</p>
                            <p className="text-[10px] font-medium text-gray-400 uppercase mt-0.5">
                              {movie.genres?.[0]}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-sm font-medium text-gray-400">
                        No movies found.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Ngày</label>
                <input
                  aria-label="Ngày"
                  name="date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                  Bắt đầu
                </label>
                <input
                  aria-label="Bắt đầu"
                  name="startTime"
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Phòng</label>
              <select
                aria-label="Phòng"
                name="room"
                required
                value={roomId}
                onChange={(e) => setRoomId(Number(e.target.value))}
                className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold outline-none"
              >
                <option value="">Chọn phòng</option>
                {rooms.map((room) => (
                  <option key={room.roomId} value={room.roomId}>
                    {room.rType} - Room {room.roomId}
                  </option>
                ))}
              </select>
            </div>
            {roomError && (
              <p role="alert" className="text-red-600">
                {roomError}
              </p>
            )}
            <label className="field">
              Định dạng
              <select
                name="formatName"
                key={String(isOpen) + selectedShowtime?.timeId}
                defaultValue={selectedShowtime?.formatName || '2D'}
              >
                {['2D', '3D', 'IMAX'].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
            <p className="text-sm text-gray-500">Giờ kết thúc được tính từ thời lượng phim.</p>
          </div>
          <div className="shrink-0 p-6 border-t border-gray-100 bg-white flex flex-col gap-3">
            <PermissionButton
              permission={selectedShowtime ? 'showtimes:update' : 'showtimes:create'}
              disabled={isSaving}
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-sm"
            >
              {isSaving ? 'Đang lưu…' : selectedShowtime ? 'Lưu lịch chiếu' : 'Thêm lịch chiếu'}
            </PermissionButton>
            {selectedShowtime && (
              <PermissionButton
                permission="showtimes:delete"
                disabled={isSaving}
                type="button"
                onClick={onDelete}
                className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition-colors"
              >
                Xóa lịch chiếu
              </PermissionButton>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
