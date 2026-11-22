import { businessTime } from './business';
import { addDays, dayNumber, timeMinutes } from './calendar';
export const showtimeStatusColors = {
  FINISHED: 'bg-slate-200 text-slate-700',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  ON_AIR: 'bg-emerald-100 text-emerald-800',
  INVALID: 'bg-amber-100 text-amber-900',
};
export const showtimeStatusLabels = {
  FINISHED: 'FINISHED',
  SCHEDULED: 'SCHEDULED',
  ON_AIR: 'ON AIR',
  INVALID: 'Giờ không hợp lệ',
};
export function showtimeStatus(showtime, now = Date.now()) {
  const { day, startTime, endTime } = showtime;
  if (
    !Number.isFinite(dayNumber(day)) ||
    !Number.isFinite(timeMinutes(startTime)) ||
    !Number.isFinite(timeMinutes(endTime))
  )
    return 'INVALID';
  const endDate =
    showtime.endDate || (timeMinutes(endTime) <= timeMinutes(startTime) ? addDays(day, 1) : day);
  if (!Number.isFinite(dayNumber(endDate))) return 'INVALID';
  const start = businessTime(day + 'T' + startTime),
    end = businessTime(endDate + 'T' + endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !Number.isFinite(now))
    return 'INVALID';
  return now < start ? 'SCHEDULED' : now < end ? 'ON_AIR' : 'FINISHED';
}
