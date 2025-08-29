import * as dayjs from 'dayjs';
import {AttendanceEntity} from 'src/modules/attendances/entities/attendance.entity';

/**
 * Tạo danh sách các ngày trong tháng từ thứ 2 đến thứ 7
 * @param year Năm
 * @param month Tháng (1-12)
 * @returns Danh sách các ngày trong tháng từ thứ 2 đến thứ 7
 */
function getWeekdaysInMonth(year: number, month: number): Date[] {
  const result: Date[] = [];
  const firstDay = dayjs(new Date(year, month - 1, 1));
  const lastDay = firstDay.endOf('month');

  let currentDay = firstDay;

  while (currentDay.isBefore(lastDay) || currentDay.isSame(lastDay, 'day')) {
    const dayOfWeek = currentDay.day();
    // 0 là Chủ nhật, 1-6 là thứ 2 đến thứ 7
    if (dayOfWeek !== 0) {
      result.push(currentDay.toDate());
    }
    currentDay = currentDay.add(1, 'day');
  }

  return result;
}

/**
 * Tạo giờ checkin ngẫu nhiên
 * @param baseDate Ngày cơ bản
 * @param normalStart Giờ bắt đầu bình thường
 * @returns Thời gian checkin
 */
function generateCheckinTime(baseDate: Date, normalStart: string = '08:30'): Date {
  const date = dayjs(baseDate);

  // Các trường hợp checkin
  const scenarios = [
    {type: 'on_time', probability: 0.6, time: normalStart}, // Đúng giờ (60%)
    {type: 'early', probability: 0.2, minMinutes: -60, maxMinutes: -15}, // Sớm (20%)
    {type: 'late', probability: 0.15, minMinutes: 15, maxMinutes: 60}, // Muộn (15%)
    {type: 'half_day_afternoon', probability: 0.05, time: '13:00'}, // Chỉ làm buổi chiều (5%)
  ];

  // Chọn ngẫu nhiên một kịch bản dựa trên xác suất
  const rand = Math.random();
  let cumulativeProbability = 0;

  for (const scenario of scenarios) {
    cumulativeProbability += scenario.probability;

    if (rand <= cumulativeProbability) {
      if (scenario.type === 'on_time' || scenario.type === 'half_day_afternoon') {
        // Trường hợp đúng giờ hoặc chỉ làm buổi chiều
        const [hours, minutes] = scenario.time.split(':').map(Number);
        return date.hour(hours).minute(minutes).second(0).toDate();
      } else {
        // Trường hợp sớm hoặc muộn
        const [normalHours, normalMinutes] = normalStart.split(':').map(Number);
        const normalTimeInMinutes = normalHours * 60 + normalMinutes;

        // Tạo độ lệch ngẫu nhiên
        const deviation = Math.floor(
          Math.random() * (scenario.maxMinutes - scenario.minMinutes + 1) + scenario.minMinutes,
        );

        const newTimeInMinutes = normalTimeInMinutes + deviation;
        const newHours = Math.floor(newTimeInMinutes / 60);
        const newMinutes = newTimeInMinutes % 60;

        return date.hour(newHours).minute(newMinutes).second(0).toDate();
      }
    }
  }

  // Mặc định nếu không có kịch bản nào được chọn
  return date.hour(8).minute(30).second(0).toDate();
}

/**
 * Tạo giờ checkout ngẫu nhiên dựa trên giờ checkin
 * @param checkinTime Thời gian checkin
 * @param normalEnd Giờ kết thúc bình thường
 * @returns Thời gian checkout
 */
function generateCheckoutTime(checkinTime: Date, normalEnd: string = '18:00'): Date {
  const checkin = dayjs(checkinTime);
  const checkinHour = checkin.hour();

  // Các trường hợp checkout
  const scenarios = [
    {type: 'on_time', probability: 0.65, time: normalEnd}, // Đúng giờ (65%)
    {type: 'early', probability: 0.2, minMinutes: -60, maxMinutes: -15}, // Sớm (20%)
    {type: 'late', probability: 0.1, minMinutes: 15, maxMinutes: 120}, // Muộn (10%)
    {type: 'half_day_morning', probability: 0.05, time: '12:00'}, // Chỉ làm buổi sáng (5%)
  ];

  // Nếu checkin sau 12:00, thì không áp dụng kịch bản nửa ngày sáng
  if (checkinHour >= 12) {
    // Phân phối lại xác suất
    scenarios[0].probability += scenarios[3].probability;
    scenarios[3].probability = 0;
  }

  // Nếu checkin lúc 13:00 (chỉ làm buổi chiều), thì không checkout sớm
  if (checkinHour === 13 && checkin.minute() === 0) {
    // Phân phối lại xác suất
    scenarios[0].probability += scenarios[1].probability;
    scenarios[1].probability = 0;
  }

  // Chọn ngẫu nhiên một kịch bản dựa trên xác suất
  const rand = Math.random();
  let cumulativeProbability = 0;

  for (const scenario of scenarios) {
    cumulativeProbability += scenario.probability;

    if (rand <= cumulativeProbability) {
      if (scenario.type === 'on_time' || scenario.type === 'half_day_morning') {
        // Trường hợp đúng giờ hoặc chỉ làm buổi sáng
        const [hours, minutes] = scenario.time.split(':').map(Number);
        return checkin.hour(hours).minute(minutes).second(0).toDate();
      } else {
        // Trường hợp sớm hoặc muộn
        const [normalHours, normalMinutes] = normalEnd.split(':').map(Number);
        const normalTimeInMinutes = normalHours * 60 + normalMinutes;

        // Tạo độ lệch ngẫu nhiên
        const deviation = Math.floor(
          Math.random() * (scenario.maxMinutes - scenario.minMinutes + 1) + scenario.minMinutes,
        );

        const newTimeInMinutes = normalTimeInMinutes + deviation;
        const newHours = Math.floor(newTimeInMinutes / 60);
        const newMinutes = newTimeInMinutes % 60;

        return checkin.hour(newHours).minute(newMinutes).second(0).toDate();
      }
    }
  }

  // Mặc định nếu không có kịch bản nào được chọn
  return checkin.hour(18).minute(0).second(0).toDate();
}

/**
 * Tính số giờ làm việc
 * @param checkin Thời gian checkin
 * @param checkout Thời gian checkout
 * @returns Số giờ làm việc
 */
function calculateHours(checkin: Date, checkout: Date): number {
  const diffInMinutes = dayjs(checkout).diff(dayjs(checkin), 'minute');
  return Math.round((diffInMinutes / 60) * 100) / 100; // Làm tròn đến 2 chữ số thập phân
}

/**
 * Tạo dữ liệu chấm công giả cho một nhân viên trong tháng
 * @param employeeId ID nhân viên
 * @param year Năm
 * @param month Tháng (1-12)
 * @returns Mảng dữ liệu chấm công
 */
export function generateAttendanceData(employeeId: number, year: number, month: number): Partial<AttendanceEntity>[] {
  const weekdays = getWeekdaysInMonth(year, month);
  const attendanceData: Partial<AttendanceEntity>[] = [];

  // Tạo dữ liệu chấm công cho mỗi ngày
  weekdays.forEach((day) => {
    // Thỉnh thoảng tạo ngày nghỉ (10% cơ hội)
    if (Math.random() < 0.1) {
      return; // Bỏ qua ngày này
    }

    const checkin = generateCheckinTime(day);
    const checkout = generateCheckoutTime(checkin);
    const total_hours = calculateHours(checkin, checkout);

    // Tính overtime (nếu checkout sau 18:30)
    let overtime = 0;
    if (dayjs(checkout).hour() >= 18 && dayjs(checkout).minute() >= 30) {
      overtime = Math.round((dayjs(checkout).diff(dayjs(day).hour(18).minute(30), 'minute') / 60) * 100) / 100;
      overtime = Math.max(0, overtime); // Đảm bảo không âm
    }

    // Xác định penalty (5% cơ hội)
    const isPenalty = Math.random() < 0.05 ? 1 : 0;

    attendanceData.push({
      employeeId,
      checkin,
      checkout,
      total_hours,
      overtime,
      isPenalty,
      workDate: dayjs(day).startOf('day').toDate(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  return attendanceData;
}

function generateRandomDateTime(date, startTime, endTime) {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  const start = new Date(date);
  start.setHours(startHour, startMinute, 0, 0);

  const end = new Date(date);
  end.setHours(endHour, endMinute, 0, 0);

  const randomTime = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return randomTime.toISOString(); // Kết quả ISO UTC
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sendCheckInOutData({
  employee_id,
  month,      // ví dụ: 7 cho tháng 7
  year,       // ví dụ: 2025
  startTime,
  endTime,
  type
}) {
  const url = 'http://localhost:3001/api/check-in-out';

  const allDaysInMonth = new Array(31)
  .fill(0)
  .map((_, i) => new Date(year, month - 1, i + 1))
  .filter(d => d.getMonth() === month - 1 && d.getDay() !== 0 && d.getDay() !== 6);

  const sampledDays = allDaysInMonth

  for (const day of sampledDays) {
    const datetime = generateRandomDateTime(day, startTime, endTime);
    const body = {
      employee_id,
      datetime,
      type
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log('Success:', data);
    } catch (err) {
      console.error('Error sending data for', datetime, err);
    }

    await delay(1000);
  }
}

/**
 * Dữ liệu chấm công giả cho nhân viên ID 28 và 3 trong tháng 3/2025
 */
export const fakeAttendanceData = [...generateAttendanceData(28, 2025, 3), ...generateAttendanceData(3, 2025, 3)];
