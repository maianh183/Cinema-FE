// Civil dates are computed in UTC as a calendar arithmetic convention, never in host local time.
export const DAY_MS = 86400000;
export const todayVN = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
export function dayNumber(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return NaN;
  const time = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
    ? time / DAY_MS
    : NaN;
}
export const addDays = (date, days) =>
  new Date((dayNumber(date) + days) * DAY_MS).toISOString().slice(0, 10);
export const weekStart = (date) =>
  addDays(date, -((new Date(dayNumber(date) * DAY_MS).getUTCDay() + 6) % 7));
export function navigateCalendar(date, view, step) {
  if (view !== 'month') return addDays(date, step * (view === 'week' ? 7 : 1));
  const d = new Date(dayNumber(date) * DAY_MS),
    day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + step);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}
export function calendarDays(date, view) {
  const start =
    view === 'month'
      ? weekStart(date.slice(0, 7) + '-01')
      : view === 'week'
        ? weekStart(date)
        : date;
  return Array.from({ length: view === 'month' ? 42 : view === 'week' ? 7 : 1 }, (_, i) =>
    addDays(start, i),
  );
}
export function calendarRange(date, view) {
  const days = calendarDays(date, view);
  return { startDate: days[0], endDate: days.at(-1) };
}
export const timeMinutes = (time) => {
  if (!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time || '')) return NaN;
  const [h, m, s = 0] = time.split(':').map(Number);
  return h * 60 + m + s / 60;
};
export function eventInterval(event) {
  const start = dayNumber(event.date) * 1440 + timeMinutes(event.startTime);
  const end = dayNumber(event.endDate || event.date) * 1440 + timeMinutes(event.endTime);
  return [start, end];
}
export function daySegments(events, date) {
  const day = dayNumber(date) * 1440;
  return events.flatMap((event) => {
    const [start, end] = eventInterval(event);
    return Number.isFinite(start) &&
      Number.isFinite(end) &&
      end > start &&
      start < day + 1440 &&
      end > day
      ? [
          {
            ...event,
            segmentDate: date,
            start: Math.max(0, start - day),
            end: Math.min(1440, end - day),
            continued: start < day,
            continues: end > day + 1440,
          },
        ]
      : [];
  });
}
// Interval partitioning per connected overlap group; adjacent events share a lane.
export function layoutEvents(segments) {
  const sorted = [...segments].sort(
      (a, b) => a.start - b.start || a.end - b.end || String(a.id).localeCompare(String(b.id)),
    ),
    result = [];
  let group = [],
    ends = [],
    groupEnd = -1;
  const flush = () => {
    result.push(...group.map((event) => ({ ...event, lanes: ends.length })));
    group = [];
    ends = [];
  };
  for (const event of sorted) {
    if (event.start >= groupEnd) {
      flush();
      groupEnd = -1;
    }
    let lane = ends.findIndex((end) => end <= event.start);
    if (lane < 0) lane = ends.length;
    ends[lane] = event.end;
    group.push({ ...event, lane });
    groupEnd = Math.max(groupEnd, event.end);
  }
  flush();
  return result;
}
export function validateSchedule(values) {
  const [start, end] = eventInterval({ ...values, date: values.workDate });
  if (
    !values.employeeId ||
    !Number.isInteger(Number(values.branchId)) ||
    Number(values.branchId) < 1 ||
    !String(values.work || '').trim()
  )
    throw new Error('Chọn nhân viên, chi nhánh và nhập tên ca.');
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 24 * 60)
    throw new Error('Ngày/giờ không hợp lệ. Ca phải kết thúc sau bắt đầu và dài tối đa 24 giờ.');
}
export function schedulesOverlap(a, b) {
  const [as, ae] = eventInterval({ ...a, date: a.workDate }),
    [bs, be] = eventInterval({ ...b, date: b.workDate });
  return String(a.employeeId) === String(b.employeeId) && as < be && bs < ae;
}
