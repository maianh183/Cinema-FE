import { showtimeStatusColors, showtimeStatusLabels } from '@/utils/showtimeStatus';
import { useEffect, useMemo, useRef } from 'react';
import CalendarToolbar from './CalendarToolbar';
import { calendarDays, daySegments, layoutEvents, todayVN, dayNumber } from '@/utils/calendar';
const weekdays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const colors = [
  'bg-indigo-100 border-indigo-500 text-indigo-950',
  'bg-emerald-100 border-emerald-500 text-emerald-950',
  'bg-amber-100 border-amber-500 text-amber-950',
  'bg-sky-100 border-sky-500 text-sky-950',
];
const shortDate = (date) => date.slice(8) + '/' + date.slice(5, 7);
export default function CalendarView({
  date,
  view,
  onNavigate,
  onViewChange,
  events,
  onEventClick,
  onDateSelect,
  emptyMessage = 'Không có lịch trong khoảng thời gian này.',
  loading = false,
  showToolbar = true,
}) {
  const scroll = useRef(null),
    today = todayVN();
  const days = calendarDays(date, view);
  const columns = useMemo(
    () => days.map((day) => ({ day, events: layoutEvents(daySegments(events, day)) })),
    [events, date, view],
  );
  const count = columns.reduce((sum, col) => sum + col.events.length, 0);
  const columnWidth = Math.max(
    view === 'day' ? 300 : 145,
    ...columns.map((c) => Math.max(1, ...c.events.map((e) => e.lanes)) * 105),
  );
  useEffect(() => {
    if (view !== 'month' && scroll.current) scroll.current.scrollTop = 8 * 56;
  }, [date, view]);
  function eventButton(event, style) {
    return (
      <button
        type="button"
        key={event.id}
        data-calendar-event={event.id}
        data-start-minute={event.start}
        data-end-minute={event.end}
        data-lane={event.lane}
        onClick={() => onEventClick(event.resource || event)}
        title={`${event.title} · ${event.startTime.slice(0, 5)}–${event.endTime.slice(0, 5)} · ${event.subtitle || ''}`}
        aria-label={`${event.title}, ${event.date}, ${event.startTime.slice(0, 5)}–${event.endTime.slice(0, 5)}, ${event.subtitle || ''}`}
        style={style}
        className={`text-left rounded-md border-l-4 p-1.5 overflow-hidden text-xs focus-visible:z-20 ${colors[(Number(event.color) || 0) % colors.length]} ${style ? 'absolute' : 'block w-full mb-1'}`}
      >
        {event.status && (
          <span
            data-showtime-status={event.status}
            className={
              'inline-block rounded px-1.5 py-0.5 mb-1 font-semibold ' +
              showtimeStatusColors[event.status]
            }
          >
            {showtimeStatusLabels[event.status]}
          </span>
        )}
        <strong className="block truncate">{event.title}</strong>
        <span className="block truncate">
          {event.continued ? '← ' : ''}
          {event.startTime.slice(0, 5)}–{event.endTime.slice(0, 5)}
          {event.continues ? ' →' : ''}
        </span>
        <span className="block whitespace-normal break-words">{event.subtitle}</span>
      </button>
    );
  }
  return (
    <div
      className="rounded-xl border border-gray-200 bg-white overflow-hidden"
      aria-label="Lịch biểu"
    >
      {showToolbar && (
        <CalendarToolbar
          date={date}
          view={view}
          onNavigate={onNavigate}
          onViewChange={onViewChange}
        />
      )}
      {loading ? (
        <p role="status" className="p-4 text-gray-500">
          Đang tải lịch…
        </p>
      ) : (
        !count && (
          <p role="status" className="p-4 text-gray-500">
            {emptyMessage}
          </p>
        )
      )}
      <div
        ref={scroll}
        className="overflow-auto max-h-[65vh] relative"
        data-testid="calendar-scroll"
      >
        {view === 'month' ? (
          <div style={{ minWidth: 735 }}>
            <div className="grid grid-cols-7 sticky top-0 bg-white z-10 border-b">
              {weekdays.map((day) => (
                <div className="text-center text-xs p-3" key={day}>
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {columns.map(({ day, events: items }) => (
                <div
                  key={day}
                  className={
                    'min-h-32 border-r border-b p-1.5 ' +
                    (day.slice(0, 7) !== date.slice(0, 7) ? 'bg-gray-50' : 'bg-white')
                  }
                >
                  <button
                    className={
                      'text-xs mb-2 rounded-full w-7 h-7 ' +
                      (day === today ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100')
                    }
                    aria-label={'Xem ngày ' + day}
                    aria-current={day === today ? 'date' : undefined}
                    onClick={() => {
                      onNavigate(day);
                      onViewChange('day');
                      onDateSelect?.(day);
                    }}
                  >
                    {Number(day.slice(8))}
                  </button>
                  {items.slice(0, 3).map((event) => eventButton(event))}
                  {items.length > 3 && (
                    <button
                      className="text-xs text-indigo-700 py-1"
                      onClick={() => {
                        onNavigate(day);
                        onViewChange('day');
                      }}
                    >
                      +{items.length - 3} ca/sự kiện
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ minWidth: 56 + days.length * columnWidth }}>
            <div className="flex sticky top-0 bg-white z-30 border-b">
              <div className="w-14 shrink-0 text-[10px] p-2 text-gray-500">GMT+7</div>
              {days.map((day) => (
                <button
                  key={day}
                  className={
                    'flex-1 min-w-0 border-l py-2 text-xs ' +
                    (day === today ? 'bg-indigo-50 text-indigo-700 font-bold' : '')
                  }
                  aria-label={'Xem ngày ' + day}
                  aria-current={day === today ? 'date' : undefined}
                  onClick={() => {
                    onNavigate(day);
                    onViewChange('day');
                    onDateSelect?.(day);
                  }}
                >
                  {weekdays[(new Date(dayNumber(day) * 86400000).getUTCDay() + 6) % 7]}
                  <span className="block text-lg">{shortDate(day)}</span>
                </button>
              ))}
            </div>
            <div className="flex" style={{ height: 24 * 56 }}>
              <div className="w-14 shrink-0 bg-gray-50">
                {Array.from({ length: 24 }, (_, hour) => (
                  <div
                    key={hour}
                    style={{ height: 56 }}
                    className="border-t text-center text-[11px] text-gray-500"
                  >
                    {String(hour).padStart(2, '0')}:00
                  </div>
                ))}
              </div>
              {columns.map(({ day, events: items }) => (
                <div key={day} className="relative flex-1 border-l" data-calendar-day={day}>
                  <div className="absolute inset-0 pointer-events-none">
                    {Array.from({ length: 24 }, (_, i) => (
                      <div key={i} style={{ height: 56 }} className="border-t border-gray-100" />
                    ))}
                  </div>
                  {items.map((event) =>
                    eventButton(event, {
                      top: (event.start / 60) * 56,
                      height: ((event.end - event.start) / 60) * 56,
                      left: `calc(${(event.lane / event.lanes) * 100}% + 2px)`,
                      width: `calc(${100 / event.lanes}% - 4px)`,
                    }),
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
