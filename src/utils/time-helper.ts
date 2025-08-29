/**
 * Chuyển đổi chuỗi thời gian "HH:MM:SS" thành số phút từ nửa đêm
 */
export function convertTimeToMinutes(timeString: string): number {
  const [hours, minutes, seconds = 0] = timeString.split(':').map(Number);
  if (!seconds) {
    return hours * 60 + minutes;
  }
  return hours * 60 + minutes + seconds / 60;
}

/**
 * Tính thời gian đi sớm (đến trước giờ bắt đầu ca)
 */
export function calculateEarlyArrival(checkinTime: string, shiftStartTime: string): number {
  // Chuyển đổi chuỗi thời gian thành phút
  const checkinMinutes = convertTimeToMinutes(checkinTime);
  const shiftStartMinutes = convertTimeToMinutes(shiftStartTime);
  // Nếu đi sớm (checkin trước giờ bắt đầu ca)
  if (checkinMinutes < shiftStartMinutes) {
    return shiftStartMinutes - checkinMinutes;
  }
  // Nếu đi muộn hoặc đúng giờ
  return 0;
}

/**
 * Tính thời gian đi muộn (đến sau giờ bắt đầu ca)
 */
export function calculateLateArrival(checkinTime: string, shiftStartTime: string): number {
  // Chuyển đổi chuỗi thời gian thành phút
  const checkinMinutes = convertTimeToMinutes(checkinTime);
  const shiftStartMinutes = convertTimeToMinutes(shiftStartTime);
  // Nếu đi muộn (checkin sau giờ bắt đầu ca)
  if (checkinMinutes > shiftStartMinutes) {
    return checkinMinutes - shiftStartMinutes;
  }
  // Nếu đi sớm hoặc đúng giờ
  return 0;
}

/**
 * Tính thời gian về sớm (checkout trước giờ kết thúc ca)
 */
export function calculateEarlyDeparture(checkoutTime: string, shiftEndTime: string): number {
  // Chuyển đổi chuỗi thời gian thành phút
  const checkoutMinutes = convertTimeToMinutes(checkoutTime);
  const shiftEndMinutes = convertTimeToMinutes(shiftEndTime);
  // Nếu về sớm (checkout trước giờ kết thúc ca)
  if (checkoutMinutes < shiftEndMinutes) {
    return shiftEndMinutes - checkoutMinutes;
  }
  // Nếu về muộn hoặc đúng giờ
  return 0;
}

/**
 * Tính thời gian về muộn (checkout sau giờ kết thúc ca)
 */
export function calculateLateReturn(checkoutTime: string, shiftEndTime: string): number {
  // Chuyển đổi chuỗi thời gian thành phút
  const checkoutMinutes = convertTimeToMinutes(checkoutTime);
  const shiftEndMinutes = convertTimeToMinutes(shiftEndTime);
  // Nếu về muộn (checkout sau giờ kết thúc ca)
  if (checkoutMinutes > shiftEndMinutes) {
    return checkoutMinutes - shiftEndMinutes;
  }
  // Nếu về sớm hoặc đúng giờ
  return 0;
}

/**
 * Format thời gian từ Date thành chuỗi "HH:MM:SS"
 */
export function formatTimeFromDate(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date
    .getSeconds()
    .toString()
    .padStart(2, '0')}`;
}

export function parseContractRange(rangeStr?: string): {startDate?: string; endDate?: string} {
  if (!rangeStr || rangeStr.trim() === '') {
    return {};
  }

  const [startRaw, endRaw] = rangeStr.split(/,(?=Sun|Mon|Tue|Wed|Thu|Fri|Sat)/);
  const startTime = Date.parse(startRaw);
  const endTime = Date.parse(endRaw);
  if (isNaN(startTime) || isNaN(endTime)) {
    throw new Error('Invalid date format in contract_range_picker');
  }
  const startDate = new Date(startRaw).toISOString().split('T')[0]; // yyyy-mm-dd
  const endDate = new Date(endRaw).toISOString().split('T')[0]; // yyyy-mm-dd
  return {startDate, endDate};
}

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

export function parseWorkingTime(rangeStr: string) {
  if (!rangeStr) throw new Error('Thiếu dữ liệu time_working');
  const [startStr, endStr] = rangeStr.split(/,(?=Sun|Mon|Tue|Wed|Thu|Fri|Sat)/);
  if (!startStr || !endStr) throw new Error('Định dạng time_working không hợp lệ');
  // Parse dạng GMT và chuyển về Asia/Ho_Chi_Minh (UTC+7)
  const startTime = dayjs.utc(startStr).tz('Asia/Ho_Chi_Minh');
  const endTime = dayjs.utc(endStr).tz('Asia/Ho_Chi_Minh');
  const diffMilliseconds = endTime.diff(startTime);
  const hours = diffMilliseconds / (1000 * 60 * 60);
  return {
    startTime: startTime.format('HH:mm'),
    endTime: endTime.format('HH:mm'),
    hours,
  };
}

export function calculateWorkingHours(shiftStart: string, shiftEnd: string, breakTimeMinutes: number): number {
  const [startHour, startMin, startMili = null] = shiftStart.split(':').map(Number);
  const [endHour, endMin, endMili = null] = shiftEnd.split(':').map(Number);

  const start = new Date(0, 0, 0, startHour, startMin);
  const end = new Date(0, 0, 0, endHour, endMin);

  // Tổng số phút làm việc
  let diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

  // Trừ thời gian nghỉ
  diffMinutes -= breakTimeMinutes;

  // Trả về số giờ làm, làm tròn 2 chữ số thập phân
  return parseFloat((diffMinutes / 60).toFixed(2));
}
