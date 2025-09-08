import {CheckInOutEntity} from './../check-in-out/entities/check-in-out.entity';
import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {InjectRepository} from '@nestjs/typeorm';
import {error} from 'console';
import {format} from 'date-fns';
import * as dayjs from 'dayjs';
import * as isoWeek from 'dayjs/plugin/isoWeek';
import * as weekOfYear from 'dayjs/plugin/weekOfYear';
import * as ExcelJS from 'exceljs';
import {Response} from 'express';
import {QueryAttendanceDto} from 'src/modules/attendances/dto/query-attendance.dto';
import {AttendanceEntity} from 'src/modules/attendances/entities/attendance.entity';
import {AttendancesRequestsService} from 'src/modules/attendances_requests/attendances_requests.service';
import {CheckInOutService} from 'src/modules/check-in-out/check-in-out.service';
import {EmployeeService} from 'src/modules/employee/employee.service';
import {CreateRequestEmployeeDto} from 'src/modules/request-employee/dto/create-request-employee.dto';
import {WorkScheduleEntity} from 'src/modules/work_schedules/entities/work_schedule.entity';
import {HINH_THUC_NGHI_PHEP, LOAI_NGHI_PHEP, REQUEST_CODE} from 'src/shared/constants';
import {CheckInOutSummary} from 'src/shared/types/check-in-out.type';
import {fakeAttendanceData} from 'src/utils/fake-data';
import {
  calculateEarlyArrival,
  calculateEarlyDeparture,
  calculateLateArrival,
  calculateLateReturn,
  convertTimeToMinutes,
  formatTimeFromDate,
} from 'src/utils/time-helper';
import {EntityManager, Repository} from 'typeorm';

dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);

@Injectable()
export class AttendancesService {
  constructor(
    @InjectRepository(AttendanceEntity)
    private attendanceRepo: Repository<AttendanceEntity>,
    private employeeService: EmployeeService,
    private checkInOutService: CheckInOutService,
    private attendanceReqService: AttendancesRequestsService,
  ) {}

  async create(payload: CreateRequestEmployeeDto) {
    const foundEmployee = await this.employeeService.findEmployeeWithSchedule(payload.employeeId);
    if (!foundEmployee) {
      throw new NotFoundException('Nhân viên không tồn tại');
    }
    // Kiểm tra xem đã có attendance cho nhân viên và ngày này chưa
    const workDate = dayjs(payload.created_request).startOf('day').toDate();
    const existingAttendance = await this.findAttendanceByEmployeeIdAndDate({
      employeeId: payload.employeeId,
      workDate,
    });
    if (existingAttendance) {
      return existingAttendance._id;
    }
    const workSchedule = foundEmployee.workScheduled;
    const attendance = this.attendanceRepo.create({
      employeeId: payload.employeeId,
      workDate,
      total_hours: 0,
      total_request_hours: workSchedule.expected_hours,
      rateOfWork: 0,
      checkin: null,
      checkout: null,
    });
    await this.attendanceRepo.save(attendance);
    return attendance;
  }

  async findAll(params: QueryAttendanceDto) {
    const {limit = 10, page = 1, disablePagination = false, search, searchFields, filter} = params;
    if (!filter || (!filter.month && !filter.week) || !filter.year) {
      throw new BadRequestException('Vui lòng cung cấp month/week và year trong filter');
    }
    const {month, week, year} = params.filter;
    const dateRange = this.calculateDateRange(month, week, year);
    // Mảng này thay cho tham số ? trong câu truy vấn
    const queryParams = [dateRange.startDate, dateRange.startDate, dateRange.endDate];
    let finalQuery = this.buildBaseAttendanceQuery();
    if (search) {
      finalQuery += ` AND e.deprId = ?`;
      queryParams.push(`${search[0]}`);
    }
    finalQuery += ` ORDER BY e._id, date_innit_time.workDate`;
    // Execute query
    const entityManager = this.attendanceRepo.manager;
    const attendanceResults = await entityManager.query(finalQuery, queryParams);
    // Process result
    const groupedByEmployee = this.processAttendanceResults(attendanceResults);
    // Chuyển đổi từ object sang array
    const formattedData = Object.values(groupedByEmployee);
    // Phân trang
    let paginatedData = formattedData;
    if (!disablePagination) {
      const startIndex = (page - 1) * limit;
      paginatedData = formattedData.slice(startIndex, startIndex + limit);
    }
    const totalEmployees = formattedData.length;
    const totalPage = Math.ceil(totalEmployees / limit);
    return {
      message: 'Lấy danh sách chấm công thành công',
      data: paginatedData,
      meta: {
        page,
        limit,
        totalItems: totalEmployees,
        totalPage,
      },
    };
  }

  async findOne(params: QueryAttendanceDto) {
    const {filter} = params;
    if (!filter || (!filter.month && !filter.week) || !filter.year) {
      throw new BadRequestException('Vui lòng cung cấp month/week và year trong filter');
    }
    const {month, week, year} = params.filter;
    const dateRange = this.calculateDateRange(month, week, year);
    const queryParams = [dateRange.startDate, dateRange.startDate, dateRange.endDate];
    let finalQuery = this.buildBaseAttendanceQuery();
    finalQuery += ` AND e._id = ?`;
    finalQuery += ` ORDER BY e._id, date_innit_time.workDate`;
    queryParams.push(params?.employeeId?.toString());
    const entityManager = this.attendanceRepo.manager;
    const attendanceResults = await entityManager.query(finalQuery, queryParams);
    const groupedByEmployee = this.processAttendanceResults(attendanceResults);
    const formattedData = Object.values(groupedByEmployee)[0];
    return {
      message: 'Lấy thông tin chấm công thành công',
      data: formattedData ? [formattedData] : null,
    };
  }

  /* ================================START================================= */
  // private async handleOvertimeUpdate(employeeId: number, workDate: Date, attendanceRecord: AttendanceEntity) {
  //   // Lấy tất cả các bản ghi check-in/check-out trong ngày
  //   const allCheckInOuts = await this.checkInOutService.getAllCheckInOutForDay(employeeId, workDate);
  //   if (allCheckInOuts.length >= 4 && attendanceRecord.checkout) {
  //     // Ít nhất phải có 2 cặp (checkin/checkout thường + OT)
  //     // Sort by datetime
  //     allCheckInOuts.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  //     // Tách các bản ghi thành 2 nhóm: trước và sau checkout ca chính
  //     // Lấy checkout cuối cùng của ca làm việc thường (regular shift)
  //     const regularCheckoutTime = new Date(attendanceRecord.checkout).getTime();
  //     // Lọc các bản ghi sau checkout ca chính (đây là các bản ghi OT)
  //     const otRecords = allCheckInOuts.filter((record) => new Date(record.datetime).getTime() > regularCheckoutTime);
  //     // Nếu có các bản ghi OT
  //     if (otRecords.length >= 2) {
  //       // Tìm cặp check-in và check-out OT đầu tiên
  //       const otCheckin = otRecords.find((record) => record.type === 'check-in');
  //       const otCheckout = otRecords.find((record) => record.type === 'check-out');
  //       if (otCheckin && otCheckout) {
  //         const otCheckinTime = new Date(otCheckin.datetime);
  //         const otCheckoutTime = new Date(otCheckout.datetime);
  //         // Tính giờ làm thêm mới
  //         const newOvertimeHours = (otCheckoutTime.getTime() - otCheckinTime.getTime()) / (1000 * 60 * 60);
  //         const roundedNewOT = Math.round(newOvertimeHours * 100) / 100;
  //         // Cập nhật tổng giờ làm việc = giờ làm bình thường + giờ làm thêm
  //         const regularHours = attendanceRecord.total_hours;
  //         const total_hours = Number(regularHours) + Number(roundedNewOT);
  //         // Cập nhật rateOfWork dựa trên tổng giờ và số giờ yêu cầu
  //         const newRateOfWork = total_hours / attendanceRecord.total_request_hours;
  //         await this.attendanceRepo.update(
  //           {_id: attendanceRecord._id},
  //           {

  //             total_hours: Math.round(total_hours * 100) / 100,
  //             rateOfWork: Math.floor(newRateOfWork * 100) / 100,
  //           },
  //         );
  //         return {message: 'Đã cập nhật bản ghi attendance có OT với dữ liệu mới'};
  //       }
  //     }
  //   }
  //   return null;
  // }

  async updateAttendanceWithCheckOut(
    manager: EntityManager,
    attendanceRecord: AttendanceEntity,
    checkInOutSummary: CheckInOutSummary,
    workSchedule: WorkScheduleEntity,
  ) {
    const checkinTime = new Date(checkInOutSummary.earliestCheckin);
    const checkoutTime = new Date(checkInOutSummary.latestCheckout);
    let total_hours = 0;

    if (workSchedule?.shiftStart && workSchedule?.shiftEnd) {
      // Tính toán giờ làm việc dựa trên lịch làm việc
      const checkinTimeString = formatTimeFromDate(checkinTime);
      const checkoutTimeString = formatTimeFromDate(checkoutTime);
      // Chuyển đổi thời gian thành phút
      const checkinMinutes = convertTimeToMinutes(checkinTimeString);
      const checkoutMinutes = convertTimeToMinutes(checkoutTimeString);
      const shiftStartMinutes = convertTimeToMinutes(workSchedule.shiftStart);
      const shiftEndMinutes = convertTimeToMinutes(workSchedule.shiftEnd);
      // MIN(End Time, shiftEnd)
      const effectiveEndMinutes = Math.min(checkoutMinutes, shiftEndMinutes);
      // MAX(Start Time, shiftStart)
      const effectiveStartMinutes = Math.max(checkinMinutes, shiftStartMinutes);
      // Tính thời gian làm việc (phút) = MIN(End Time, shiftEnd) - MAX(Start Time, shiftStart) đảm bảo không -
      const workTimeMinutes = Math.max(0, effectiveEndMinutes - effectiveStartMinutes);

      const breakTimeMinutes = workSchedule.break_time || 0;
      const overtimeMinutes = 0;
      // Tính tổng thời gian làm việc thực tế = workTimeMinutes - breakTimeMinutes + overtimeMinutes
      let actualWorkTimeMinutes = workTimeMinutes - breakTimeMinutes + overtimeMinutes;
      if (actualWorkTimeMinutes < 0) {
        actualWorkTimeMinutes = 0;
      }
      total_hours = actualWorkTimeMinutes / 60;
    } else {
      // Nếu không có lịch làm việc
      const checkinMs = checkinTime.getTime();
      const checkoutMs = checkoutTime.getTime();
      total_hours = (checkoutMs - checkinMs) / (1000 * 60 * 60);
    }
    total_hours = Math.round(total_hours * 100) / 100;
    // Tính rateOfWork (% hoàn thành công việc)
    let rateOfWork = 0;
    if (total_hours && workSchedule?.expected_hours) {
      const ratio = total_hours / workSchedule.expected_hours;
      rateOfWork = Math.floor(ratio * 100) / 100;
    }

    await manager.update(
      AttendanceEntity,
      {_id: attendanceRecord._id},
      {
        checkout: checkoutTime,
        total_hours,
        rateOfWork,
      },
    );
    return 1;
  }

  private calculateDateRange(month?: number, week?: number, year: number = new Date().getFullYear()) {
    let startDate: string;
    let endDate: string;
    if (month) {
      startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD');
    } else if (week) {
      const firstDayOfWeek = dayjs().year(year).isoWeek(week).startOf('isoWeek');
      startDate = firstDayOfWeek.format('YYYY-MM-DD');
      endDate = firstDayOfWeek.add(6, 'day').format('YYYY-MM-DD');
    } else {
      throw new BadRequestException('Vui lòng cung cấp month hoặc week trong filter');
    }
    return {startDate, endDate};
  }

  private processAttendanceResults(results: any[]) {
    const groupedByEmployee = {};
    results.forEach((row) => {
      const employeeId = row.employeeId;
      // Tạo mới đối tượng nhân viên nếu chưa tồn tại
      if (!groupedByEmployee[employeeId]) {
        groupedByEmployee[employeeId] = {
          _id: employeeId,
          employeeId: employeeId,
          name: row.name,
          email: row.email,
          work_schedule: {
            shift_start: row.shiftStart || null,
            shift_end: row.shiftEnd || null,
            expected_hours: row.expected_hours || null,
            break_time: row.break_time || null,
          },
          timekeeping: [],
        };
      }
      let isCompleted = false;
      if (row.approved_requests_details) {
        row.approved_requests_details = JSON.parse(row.approved_requests_details);
        row.approved_requests_details = row.approved_requests_details.map((item) => {
          return {
            ...item,
            fields: item.fields ? JSON.parse(item.fields) : null,
          };
        });
        // Check nếu có yêu cầu nghỉ phép nửa buổi
        isCompleted = this.checkCompletionFromRequests(row.approved_requests_details);
      }
      // Calculate thời gian làm việc
      const timeMetrics = this.calculateTimeMetrics(row, isCompleted);
      // Push thông tin vào mảng timekeeping
      groupedByEmployee[employeeId].timekeeping.push({
        attendance_id: row.attendance_id || null,
        checkin: row.checkin || null,
        checkout: row.checkout || null,
        overtime: row.overtime || 0,
        total_hours: row.total_hours || 0,
        work_date: row.workDate,
        is_penalty: row.isPenalty || 0,
        early_arrival: timeMetrics.earlyArrivalMinutes,
        late_arrival: timeMetrics.lateArrivalMinutes,
        early_departure: timeMetrics.earlyDepartureMinutes,
        late_departure: timeMetrics.lateDepartureMinutes,
        work_completion: row.rateOfWork,
        total_request_hours: row.total_request_hours || row.expected_hours || 0,
        is_holiday: row.holiday_id ? true : false,
        holiday_name: row.holiday_name || null,
        is_completed: timeMetrics.isCompleted,
        approved_requests_details: row.approved_requests_details,
        checkin_image: row.checkin_image || null,
        checkout_image: row.checkout_image || null,
        check_in_out_list: row.check_in_out_list ? JSON.parse(row.check_in_out_list) : null,
      });
    });
    return groupedByEmployee;
  }

  private checkCompletionFromRequests(requestDetails: any[]) {
    // Kiểm tra nếu có yêu cầu nghỉ phép nửa buổi
    return requestDetails.some((item) => {
      // Chỉ xét các yêu cầu đã được phê duyệt
      const isApproved = item.finalStatusAproval && item.finalStatusAproval !== 0;
      if (!isApproved) return false;
      // Chỉ xét nghỉ nửa buổi
      if (
        item.code === REQUEST_CODE.NGHI_PHEP &&
        (item.fields.hinh_thuc === HINH_THUC_NGHI_PHEP.BUOI_SANG ||
          item.fields.hinh_thuc === HINH_THUC_NGHI_PHEP.BUOI_CHIEU) &&
        item.fields.loai_nghi === LOAI_NGHI_PHEP.CO_LUONG
      ) {
        return true;
      }
      return false;
    });
  }

  private calculateTimeMetrics(row: any, isCompletedFromRequests: boolean) {
    let earlyArrivalMinutes = 0;
    let lateArrivalMinutes = 0;
    let earlyDepartureMinutes = 0;
    let lateDepartureMinutes = 0;
    let isCompleted = isCompletedFromRequests;
    // Calculate time metrics if we have check-in/out data and schedule
    if (row.checkin && row.checkout && row.shiftStart && row.shiftEnd) {
      const checkinTime = dayjs(row.checkin).format('HH:mm:ss');
      const checkoutTime = dayjs(row.checkout).format('HH:mm:ss');
      // Calculate early/late arrival and departure
      earlyArrivalMinutes = Math.floor(calculateEarlyArrival(checkinTime, row.shiftStart));
      lateArrivalMinutes = Math.floor(calculateLateArrival(checkinTime, row.shiftStart));
      earlyDepartureMinutes = Math.floor(calculateEarlyDeparture(checkoutTime, row.shiftEnd));
      lateDepartureMinutes = Math.floor(calculateLateReturn(checkoutTime, row.shiftEnd));
      // Calculate completion based on work ratio if not already determined by requests
      if (!isCompleted && row.total_hours && row.total_request_hours) {
        const completionRatio = row.total_hours / row.total_request_hours;
        isCompleted = completionRatio >= 1;
      }
    }
    return {
      earlyArrivalMinutes,
      lateArrivalMinutes,
      earlyDepartureMinutes,
      lateDepartureMinutes,
      isCompleted,
    };
  }

  private buildBaseAttendanceQuery() {
    return `
        SELECT
        e._id AS employeeId,
        e.name,
        e.email,
        date_innit_time.workDate,
        ws.shiftStart,
        ws.shiftEnd,
        ws.expected_hours,
        ws.break_time,
        a._id AS attendance_id,
        a.checkin,
        a.checkout,
        a.total_hours,
        a.overtime,
        a.isPenalty,
        a.total_request_hours,
        a.rateOfWork,
        h_list.holiday_name,
        h_list._id AS holiday_id,
        (
          SELECT ci.url_image
          FROM check_in_out ci
          WHERE ci.employee_id = e._id
          AND DATE(ci.datetime) = date_innit_time.workDate
          AND ci.type = 'check-in'
          ORDER BY ci.datetime ASC
          LIMIT 1
        ) AS checkin_image,
        (
          SELECT ci.url_image
          FROM check_in_out ci
          WHERE ci.employee_id = e._id
          AND DATE(ci.datetime) = date_innit_time.workDate
          AND ci.type = 'check-out'
          ORDER BY ci.datetime DESC
          LIMIT 1
        ) AS checkout_image,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              '_id', re._id,
              'request_id', re.request_id,
              'employee_id', re.employee_id,
              'fields', re.fields,
              'desc', re.desc,
              'finalStatusAproval', re.finalStatusAproval,
              'name', r.name,
              'code', r.code
            )
          )
        FROM attendances_requests ar
        JOIN request_employee re ON ar.requestEmpId = re._id
        JOIN requests r ON re.request_id = r._id
        WHERE ar.attendanceId = a._id
        AND (re.finalStatusAproval <> 0 AND re.finalStatusAproval IS NOT NULL)
      ) AS approved_requests_details,
      (
        SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              '_id', ci._id,
              'type', ci.type,
              'url_image', ci.url_image,
              'name', e.name,
              'position_name', e.position_name,
              'date_time',DATE_FORMAT(ci.datetime,'%H:%i:%s')
            )
          )
          FROM check_in_out ci
          JOIN employees e_sub ON e_sub._id = ci.employee_id
          WHERE ci.employee_id = e._id
          AND DATE(ci.datetime) = date_innit_time.workDate  AND e.isDeleted = 0
          ORDER BY ci.datetime ASC
      ) AS check_in_out_list
      FROM (
        SELECT
          DATE_ADD(?, INTERVAL cc.code DAY) AS workDate
        FROM commond_codes AS cc
        WHERE cc.type_code = 'DAY'
        AND DATE_ADD(?, INTERVAL cc.code DAY) <= ?
      ) date_innit_time
      CROSS JOIN employees e
      LEFT JOIN work_scheduled ws ON e._id = ws.employeeId AND ws.isDeleted = 0
      LEFT JOIN attendances a ON DATE(a.workDate) = date_innit_time.workDate AND a.employeeId = e._id
      LEFT JOIN (
        SELECT
          DATE(DATE_ADD(h.start_date, INTERVAL cc.code DAY)) AS holiday_date,
          h.holiday_name,
          h._id,
          h.start_date,
          h.end_date
        FROM holidays h
        JOIN commond_codes cc ON cc.type_code ='DAY'
        WHERE DATE_ADD(h.start_date, INTERVAL cc.code DAY) <= h.end_date
      ) h_list ON h_list.holiday_date = date_innit_time.workDate
      WHERE e.isDeleted = 0
    `;
  }
  /* =================================END================================== */

  /* ====THỐNG KÊ CHẤM CÔNG: (START) ============== */
  async getTimekeepingStatistics(params: QueryAttendanceDto) {
    try {
      const {limit = 10, page = 1, disablePagination = false} = params;
      const {year, month, week, startDate, endDate, departmentId, employeeId} = params.filter;
      // Xác định ngày đầu và cuối của khoảng thời gian
      const now = dayjs();
      const today = dayjs().startOf('day');
      let startDateObj, endDateObj;
      if (startDate && endDate) {
        startDateObj = dayjs(startDate);
        endDateObj = dayjs(endDate);
        if (!startDateObj.isValid() || !endDateObj.isValid()) {
          throw new BadRequestException('startDate hoặc endDate không hợp lệ');
        }
        if (endDateObj.isBefore(startDateObj)) {
          throw new BadRequestException('endDate phải sau startDate');
        }
      } else if (year) {
        if (week) {
          // Filter theo tuần
          startDateObj = dayjs().year(+year).isoWeek(+week).startOf('isoWeek');
          endDateObj = dayjs().year(+year).isoWeek(+week).endOf('isoWeek');
          // Nếu là tuần hiện tại thì chỉ lấy đến hôm nay
          const isCurrentWeek = now.isoWeek() === +week && now.year() === +year;
          if (isCurrentWeek) {
            endDateObj = today;
          }
        } else if (month) {
          // Filter theo tháng
          startDateObj = dayjs(new Date(+year, +month - 1, 1)).startOf('month');
          // Tháng hiện tại thì lấy đến hôm nay
          const isCurrentMonth = now.month() + 1 === +month && now.year() === +year;
          endDateObj = isCurrentMonth ? today : startDateObj.endOf('month');
        } else {
          throw new BadRequestException('Vui lòng cung cấp month hoặc week khi sử dụng year');
        }
      } else {
        throw new BadRequestException(
          'Vui lòng cung cấp (year và month/week) hoặc (startDate và endDate) trong filter',
        );
      }
      // Format các ngày thành string
      const startDateStr = startDateObj.format('YYYY-MM-DD');
      const endDateStr = endDateObj.format('YYYY-MM-DD');
      // Để tính công chuẩn tháng, luôn lấy toàn bộ tháng hoặc toàn bộ tuần
      let fullPeriodEnd;
      if (week) {
        fullPeriodEnd = dayjs().year(+year).isoWeek(+week).endOf('isoWeek').format('YYYY-MM-DD');
      } else if (month) {
        fullPeriodEnd = dayjs(new Date(+year, +month - 1, 1))
          .endOf('month')
          .format('YYYY-MM-DD');
      } else {
        fullPeriodEnd = endDateStr;
      }
      // Tính công chuẩn tháng (tất cả các ngày trừ thứ 7, chủ nhật)
      const {congChuanThang, holidaysOnWorkDays} = await this.calculateStandardWorkingDays(startDateStr, fullPeriodEnd);
      const queryParams: any[] = [];
      let departmentFilter = '';
      let employeeFilter = '';

      if (departmentId) {
        departmentFilter = 'AND d._id = ?';
        queryParams.push(departmentId);
      }
      if (employeeId) {
        employeeFilter = 'AND e._id = ?';
        queryParams.push(employeeId);
      }
      // Thêm các tham số ngày
      queryParams.push(startDateStr, endDateStr); // Ngày nghỉ lễ
      queryParams.push(startDateStr, endDateStr); // Nghỉ phép nửa ngày
      queryParams.push(startDateStr, endDateStr); // Chấm công
      // các tham số ngày cho điều kiện lọc nghỉ phép (START)
      queryParams.push(startDateStr, endDateStr); // Cho MOT_NGAY, BUOI_SANG, BUOI_CHIEU
      queryParams.push(startDateStr, endDateStr); // from_date nằm trong khoảng
      queryParams.push(startDateStr, endDateStr); // to_date nằm trong khoảng
      queryParams.push(startDateStr, endDateStr); // Khoảng nghỉ bao trùm khoảng thống kê
      // các tham số ngày cho điều kiện lọc nghỉ phép (END)
      queryParams.push(startDateStr, endDateStr); // Làm thêm
      queryParams.push(endDateStr, startDateStr); // Đi công tác

      const rawQuery = `
   -- (1) Danh sách nhân viên cơ bản
    WITH employee_base AS (
      SELECT DISTINCT
        e._id AS employee_id,
        e.NAME AS employee_name,
        DATE_FORMAT(e.start_working, '%Y/%m/%d') AS start_date,
        DATEDIFF(CURDATE(), e.start_working) + 1 AS work_days,
        ws.shiftStart,
        ws.shiftEnd,
        ws.expected_hours,
        ws.break_time
      FROM employees e
      JOIN departments d on e.deprId = d._id
      LEFT JOIN work_scheduled ws ON e._id = ws.employeeId AND ws.isDeleted = 0
      WHERE e.isDeleted = 0
          ${departmentFilter}
          ${employeeFilter}
    ),
    -- (2) Tính ngày nghỉ lễ
    holiday_dates AS (
      SELECT DISTINCT DATE(DATE_ADD(start_date, INTERVAL n DAY)) AS holiday_date
      FROM holidays h
      JOIN (
      SELECT code as n from commond_codes cd where cd.type_code ='DAY'
      ) numbers
      WHERE DATE_ADD(h.start_date, INTERVAL n DAY) <= h.end_date
        AND DATE_ADD(h.start_date, INTERVAL n DAY) BETWEEN ? AND ?
    ),
    -- (3) Danh sách nhân viên nghỉ nửa buổi
    nghi_phep_nua_ngay AS (
      SELECT
        re.employee_id,
        JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.date')) AS leave_date,
        JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.hinh_thuc')) AS hinh_thuc,
        JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.loai_nghi')) AS loai_nghi
      FROM request_employee re
      JOIN requests r ON r._id = re.request_id
      WHERE r.code = 'NGHI_PHEP'
        AND re.finalStatusAproval = 1
        AND JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.date')) BETWEEN ? AND ?
        AND JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.hinh_thuc')) IN ('BUOI_SANG', 'BUOI_CHIEU')
    ),
    -- (4) Dữ liệu chấm công
    employee_attendances AS (
      SELECT
        eb.employee_id,
        att._id AS attendance_id,
        att.workDate,
        att.checkin,
        att.checkout,
        att.rateOfWork,
        att.overtime,
        att.total_hours,
        eb.shiftStart,
        eb.shiftEnd,
        eb.expected_hours,
        CASE
          WHEN np_sang.employee_id IS NULL AND DATE_FORMAT(att.checkin, '%H:%i') > DATE_FORMAT(STR_TO_DATE(eb.shiftStart, '%H:%i'), '%H:%i')
          THEN 1 ELSE 0
        END AS is_late,
        CASE
          WHEN np_chieu.employee_id IS NULL AND DATE_FORMAT(att.checkout, '%H:%i') < DATE_FORMAT(STR_TO_DATE(eb.shiftEnd, '%H:%i'), '%H:%i')
          THEN 1 ELSE 0
        END AS is_early,
        CASE
          WHEN np_chieu.employee_id IS NULL AND TIME(att.checkout) < eb.shiftEnd THEN
            CEIL(
              TIMESTAMPDIFF(
                SECOND,
                att.checkout,
                STR_TO_DATE(CONCAT(DATE(att.workDate), ' ', eb.shiftEnd), '%Y-%m-%d %H:%i:%s')
              ) / 60
            )
          ELSE 0
        END AS early_minutes,
        CASE WHEN hd.holiday_date IS NOT NULL THEN 1 ELSE 0 END AS is_holiday
      FROM employee_base eb
      JOIN attendances att ON eb.employee_id = att.employeeId
        AND att.workDate BETWEEN ? AND ?
        AND att.checkin IS NOT NULL
        AND att.checkout IS NOT NULL
      LEFT JOIN holiday_dates hd ON DATE(att.workDate) = hd.holiday_date
      LEFT JOIN nghi_phep_nua_ngay np_sang ON eb.employee_id = np_sang.employee_id
        AND DATE(att.workDate) = np_sang.leave_date AND np_sang.hinh_thuc = 'BUOI_SANG' 
      LEFT JOIN nghi_phep_nua_ngay np_chieu ON eb.employee_id = np_chieu.employee_id
        AND DATE(att.workDate) = np_chieu.leave_date AND np_chieu.hinh_thuc = 'BUOI_CHIEU'
    ),
    -- (5) Tóm tắt đi muộn
    late_summary AS (
      SELECT
        employee_id,
        COUNT(DISTINCT workDate) AS total_work_days,
        ROUND(COUNT(DISTINCT CASE WHEN is_late = 1 THEN workDate END) / COUNT(DISTINCT workDate) * 100, 2) AS late_day_rate
      FROM employee_attendances
      GROUP BY employee_id
    ),
    -- (6) Đơn DMVS
    request_dmvs AS (
      SELECT
        ar.attendanceId,
        re.employee_id,
        JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.loai_nghi')) AS loai_nghi
      FROM attendances_requests ar
      JOIN request_employee re ON re._id = ar.requestEmpId
      JOIN requests r ON r._id = re.request_id
      WHERE re.finalStatusAproval != 0
        AND r.code = 'DMVS'
        AND re.employee_id IN (SELECT employee_id FROM employee_base)
    ),
    -- (7) Đơn nghỉ phép
    nghi_phep AS (
      SELECT
        re.employee_id,
        JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.hinh_thuc')) AS hinh_thuc,
        JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.loai_nghi')) AS loai_nghi,
        JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.date')) AS ngay_nghi,
        -- Tính nghỉ KHÔNG lương (bao gồm cả BUOI_SANG, BUOI_CHIEU)
        CASE
          WHEN JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.hinh_thuc')) = 'NHIEU_NGAY'
            AND JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.loai_nghi')) = 'KHONG_LUONG' THEN
              DATEDIFF(
                JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.to_date')),
                JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.from_date'))
              ) + 1
          WHEN JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.hinh_thuc')) = 'MOT_NGAY'
            AND JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.loai_nghi')) = 'KHONG_LUONG' THEN 1
          WHEN JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.hinh_thuc')) IN ('BUOI_SANG', 'BUOI_CHIEU')
            AND JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.loai_nghi')) = 'KHONG_LUONG' THEN 0.5
          ELSE 0
        END AS nghi_phep_khong_luong,
        -- Tính nghỉ CÓ lương (chỉ tính nguyên ngày hoặc nhiều ngày)
        CASE
          WHEN JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.hinh_thuc')) = 'MOT_NGAY'
            AND JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.loai_nghi')) = 'CO_LUONG' THEN 1
          WHEN JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.hinh_thuc')) = 'NHIEU_NGAY'
            AND JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.loai_nghi')) = 'CO_LUONG' THEN
              DATEDIFF(
                JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.to_date')),
                JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.from_date'))
              ) + 1
          ELSE 0
        END AS nghi_phep_co_luong
      FROM request_employee re
      JOIN requests r ON r._id = re.request_id
      WHERE r.code = 'NGHI_PHEP'
        AND re.finalStatusAproval = 1
        AND (
        -- Trường hợp nghỉ một ngày hoặc buổi sáng/chiều
        (JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.hinh_thuc')) IN ('MOT_NGAY', 'BUOI_SANG', 'BUOI_CHIEU')
        AND DATE(JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.date'))) BETWEEN ? AND ?)
        OR
        -- Trường hợp nghỉ nhiều ngày, có sự chồng chéo với khoảng thời gian
        (JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.hinh_thuc')) = 'NHIEU_NGAY'
        AND (
          (DATE(JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.from_date'))) BETWEEN ? AND ?)
          OR (DATE(JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.to_date'))) BETWEEN ? AND ?)
          OR (DATE(JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.from_date'))) <= ?
              AND DATE(JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.to_date'))) >= ?)
          )
        )
      )
    ),
    -- (8) Làm thêm
    cong_lam_them AS (
      SELECT
        ea.employee_id,
        SUM(CASE
              WHEN STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.date')), '%Y-%m-%d') = ea.workDate
                AND r.code = 'LAM_CONG' THEN ea.overtime
              ELSE 0
            END) AS cong_lam_them,
        SUM(CASE
              WHEN STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.date')), '%Y-%m-%d') = ea.workDate
                AND r.code = 'LAM_CONG'
                AND ea.is_holiday = 1 THEN ea.rateOfWork
              ELSE 0
            END) AS cong_lam_them_trong_ngay_le
      FROM employee_attendances ea
      JOIN attendances_requests ar ON ar.attendanceId = ea.attendance_id
      JOIN request_employee re ON re._id = ar.requestEmpId
      JOIN requests r ON r._id = re.request_id
      WHERE ea.workDate BETWEEN ? AND ?
      GROUP BY ea.employee_id
    ),
    -- (9) Công tác
    di_cong_tac AS (
      SELECT
        re.employee_id,
        SUM(DATEDIFF(
          DATE(JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.to_date'))),
          DATE(JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.from_date')))
        ) + 1) AS so_ngay_cong_tac
      FROM request_employee re
      JOIN requests r ON r._id = re.request_id
      WHERE r.code = 'CONG_TAC'
        AND re.finalStatusAproval = 1
        AND (
          DATE(JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.from_date'))) <= ?
          AND DATE(JSON_UNQUOTE(JSON_EXTRACT(re.fields, '$.to_date'))) >= ?
        )
      GROUP BY re.employee_id
    ),
    -- (10) Tóm tắt chấm công
    attendance_summary AS (
      SELECT
        eb.employee_id,
        COUNT(CASE WHEN ea.is_late = 1 THEN 1 END) AS tong_so_lan_di_muon,
        COUNT(CASE WHEN ea.is_late = 1 AND rd.attendanceId IS NOT NULL AND rd.loai_nghi = 'DI_MUON' THEN 1 END) AS di_muon_co_don,
        COUNT(CASE WHEN ea.is_early = 1 THEN 1 END) AS tong_so_lan_ve_som,
        COUNT(CASE WHEN ea.is_early = 1 AND rd.attendanceId IS NOT NULL AND rd.loai_nghi = 'VE_SOM' THEN 1 END) AS ve_som_co_don,
        SUM(ea.early_minutes) AS tong_so_phut_ve_som,
        SUM(ea.total_hours) AS tong_so_gio,
        SUM(CASE
              WHEN ea.attendance_id IS NOT NULL
              THEN ea.rateOfWork
              ELSE 0
            END) AS cong_thuc_te
      FROM employee_base eb
      LEFT JOIN employee_attendances ea ON eb.employee_id = ea.employee_id
      LEFT JOIN request_dmvs rd ON ea.attendance_id = rd.attendanceId
      GROUP BY eb.employee_id
    ),
    -- (11) Số ngày nghỉ lễ
    so_ngay_nghi_le AS (
      SELECT COUNT(DISTINCT holiday_date) AS so_ngay_nghi_le
      FROM holiday_dates
    )
    -- (12) Kết quả tổng hợp
    SELECT
      eb.employee_id,
      eb.employee_name,
      eb.start_date,
      eb.work_days,
      COALESCE(ats.tong_so_lan_di_muon, 0) AS tong_so_lan_di_muon,
      COALESCE(ats.di_muon_co_don, 0) AS di_muon_co_don,
      COALESCE(ats.tong_so_lan_di_muon, 0) - COALESCE(ats.di_muon_co_don, 0) AS di_muon_khong_co_don,
      COALESCE(ats.ve_som_co_don, 0) AS ve_som_co_don,
      COALESCE(ats.tong_so_lan_ve_som, 0) - COALESCE(ats.ve_som_co_don, 0) AS ve_som_khong_co_don,
      COALESCE(ats.tong_so_phut_ve_som, 0) AS tong_so_phut_ve_som,
      COALESCE(ats.tong_so_gio, 0) AS tong_so_gio,
      COALESCE(ats.cong_thuc_te, 0) AS cong_thuc_te,
      COALESCE(clt.cong_lam_them, 0) AS cong_lam_them,
      COALESCE(clt.cong_lam_them_trong_ngay_le, 0) AS cong_lam_them_trong_ngay_le,
      snl.so_ngay_nghi_le,
      (COALESCE(ats.cong_thuc_te, 0) + ROUND(COALESCE(clt.cong_lam_them, 0)/24.0),2) + COALESCE(clt.cong_lam_them_trong_ngay_le, 0) + snl.so_ngay_nghi_le + COALESCE(dct.so_ngay_cong_tac, 0) + SUM(COALESCE(np.nghi_phep_co_luong, 0))) AS cong_tinh_luong,
      SUM(COALESCE(np.nghi_phep_co_luong, 0)) AS nghi_phep_co_luong,
      SUM(COALESCE(np.nghi_phep_khong_luong, 0)) AS nghi_phep_khong_luong,
      COALESCE(ls.total_work_days, 0) AS so_ngay_lam_viec_co_cham_cong,
      COALESCE(ls.late_day_rate, 0) AS ti_le_ngay_di_muon,
      COALESCE(dct.so_ngay_cong_tac, 0) AS so_ngay_cong_tac
    FROM employee_base eb
    LEFT JOIN attendance_summary ats ON ats.employee_id = eb.employee_id
    LEFT JOIN cong_lam_them clt ON clt.employee_id = eb.employee_id
    LEFT JOIN nghi_phep np ON np.employee_id = eb.employee_id
    LEFT JOIN late_summary ls ON ls.employee_id = eb.employee_id
    LEFT JOIN di_cong_tac dct ON dct.employee_id = eb.employee_id
    CROSS JOIN so_ngay_nghi_le snl
    GROUP BY eb.employee_id, eb.employee_name, eb.start_date, eb.work_days,
      ats.tong_so_lan_di_muon, ats.di_muon_co_don, ats.tong_so_lan_ve_som, ats.ve_som_co_don,
      ats.tong_so_phut_ve_som, ats.tong_so_gio, ats.cong_thuc_te,
      clt.cong_lam_them, clt.cong_lam_them_trong_ngay_le, snl.so_ngay_nghi_le,
      dct.so_ngay_cong_tac, ls.total_work_days, ls.late_day_rate
    ORDER BY eb.employee_id DESC`;

      const results = await this.attendanceRepo.query(rawQuery, queryParams);
      const formattedData = results.map((row) => ({
        employee_id: row.employee_id,
        name: row.employee_name,
        ngay_bat_dau_lam: row.start_date,
        so_ngay_lam_viec: row.work_days,
        so_ngay_lam_viec_co_cham_cong: +row.so_ngay_lam_viec_co_cham_cong || 0,
        di_muon: {
          tong_so_lan_di_muon: +row.tong_so_lan_di_muon || 0,
          khong_don: +row.di_muon_khong_co_don || 0,
          co_don: +row.di_muon_co_don || 0,
        },
        ve_som: {
          khong_don: +row.ve_som_khong_co_don || 0,
          co_don: +row.ve_som_co_don || 0,
          thoi_gian: +row.tong_so_phut_ve_som || 0,
        },
        tong_gio_lam: +row.tong_so_gio || 0,
        cong_thuc_te: +row.cong_thuc_te || 0,
        cong_lam_them: +row.cong_lam_them || 0,
        cong_lam_them_trong_ngay_le: +row.cong_lam_them_trong_ngay_le || 0,
        so_ngay_nghi_le: +row.so_ngay_nghi_le || 0,
        nghi_phep_co_luong: +row.nghi_phep_co_luong || 0,
        nghi_phep_khong_luong: +row.nghi_phep_khong_luong || 0,
        cong_tinh_luong: +row.cong_tinh_luong || 0,
        ngay_phep_con_lai: 0,
        so_ngay_cong_tac: +row.so_ngay_cong_tac || 0,
        ti_le_di_muon: +row.ti_le_ngay_di_muon || 0,
      }));

      // Phân trang dữ liệu
      let paginatedData = formattedData;
      if (!disablePagination) {
        const startIndex = (page - 1) * limit;
        paginatedData = formattedData.slice(startIndex, startIndex + limit);
      }
      const totalItems = formattedData.length;
      const totalPage = Math.ceil(totalItems / limit);
      // Metadata để hiển thị thông tin khoảng thời gian
      let periodInfo;
      if (startDate && endDate) {
        periodInfo = {
          period_type: 'custom',
          start_date: startDateStr,
          end_date: endDateStr,
        };
      } else if (week) {
        periodInfo = {
          period_type: 'week',
          week,
          year,
          start_date: startDateStr,
          end_date: endDateStr,
        };
      } else if (month) {
        periodInfo = {
          period_type: 'month',
          month,
          year,
          start_date: startDateStr,
          end_date: endDateStr,
        };
      }
      return {
        message: 'Thống kê chấm công thành công',
        data: {
          cong_nghi_theo_cong_ty: 0,
          cong_lam_bu_theo_cong_ty: 0,
          cong_chuan_thang: +congChuanThang,
          cong_thuc_te: congChuanThang - holidaysOnWorkDays,
          timekeeping: paginatedData,
          period_info: periodInfo,
        },
        meta: {
          page,
          limit,
          totalItems,
          totalPage,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Lỗi khi thống kê chấm công: ${error.message}`);
    }
  }

  /**
   * Hàm lấy thống kê chấm công cho một nhân viên cụ thể
   */
  async getTimekeepingStatisticsByEmployeeId(params: QueryAttendanceDto) {
    try {
      const filter = {
        ...params.filter,
        employeeId: params.employeeId,
      };
      const {data} = await this.getTimekeepingStatistics({
        ...params,
        filter,
        disablePagination: true,
      });

      if (!data.timekeeping || data.timekeeping.length === 0) {
        return {
          message: 'Không tìm thấy dữ liệu chấm công cho nhân viên này',
          data: {
            ...data,
            timekeeping: [],
          },
        };
      }
      return {
        message: 'Lấy thống kê chấm công cho nhân viên thành công',
        data: data,
      };
    } catch (error) {
      throw new BadRequestException(`Lỗi khi lấy thống kê chấm công nhân viên: ${error.message}`);
    }
  }
  // Hàm tính công chuẩn tháng và số ngày nghỉ lễ trùng ngày làm việc
  private async calculateStandardWorkingDays(
    startDate: string,
    endDate: string,
  ): Promise<{congChuanThang: number; holidaysOnWorkDays: number}> {
    const query = `
    WITH RECURSIVE all_dates AS (
      SELECT STR_TO_DATE(?, '%Y-%m-%d') AS date
      UNION ALL
      SELECT DATE_ADD(date, INTERVAL 1 DAY)
      FROM all_dates
      WHERE DATE_ADD(date, INTERVAL 1 DAY) <= STR_TO_DATE(?, '%Y-%m-%d')
    ),
    working_days AS (
      SELECT
        date,
        DAYOFWEEK(date) as day_of_week,
        DAYOFWEEK(date) BETWEEN 2 AND 6 as is_working_day
      FROM all_dates
    ),
    holiday_dates AS (
      SELECT DISTINCT
      DATE(DATE_ADD(h.start_date, INTERVAL numbers.n DAY)) AS holiday_date
      FROM holidays h
      JOIN (
        SELECT code as n from commond_codes cd where cd.type_code ='DAY'
      ) AS numbers
      WHERE DATE_ADD(h.start_date, INTERVAL numbers.n DAY) <= h.end_date
      AND DATE_ADD(h.start_date, INTERVAL numbers.n DAY) BETWEEN STR_TO_DATE(?, '%Y-%m-%d') AND STR_TO_DATE(?, '%Y-%m-%d')
    ),
    holiday_stats AS (
      SELECT
        SUM(wd.is_working_day) AS standard_working_days,
        COUNT(CASE WHEN hd.holiday_date IS NOT NULL AND wd.is_working_day = 1 THEN 1 END) AS holidays_on_workdays
      FROM working_days wd
      LEFT JOIN holiday_dates hd ON wd.date = hd.holiday_date
    )
    SELECT standard_working_days, holidays_on_workdays FROM holiday_stats
  `;
    const result = await this.attendanceRepo.query(query, [startDate, endDate, startDate, endDate]);
    return {
      congChuanThang: result[0]?.standard_working_days || 0,
      holidaysOnWorkDays: result[0]?.holidays_on_workdays || 0,
    };
  }
  /* ====THỐNG KÊ CHẤM CÔNG: (END) ============== */

  /* ==== EXPORT EXCEL: (START) ============== */
  async exportTimekeepingStatisticsExcel(params: QueryAttendanceDto, res: Response, isAdmin: boolean) {
    try {
      let data;
      if (isAdmin) {
        const result = await this.getTimekeepingStatistics({
          ...params,
          disablePagination: true,
        });
        data = result.data;
      } else {
        const result = await this.getTimekeepingStatisticsByEmployeeId(params);
        data = result.data;
      }
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Thống kê chấm công');
      // Định nghĩa các cột
      const columns = [
        {header: 'Họ tên', key: 'name', width: 25},
        {header: 'Ngày làm việc chính thức', key: 'ngay_bat_dau_lam', width: 25},
        {header: 'Số ngày đã làm việc chính thức', key: 'so_ngay_lam_viec', width: 25},
        {header: 'Đi muộn không đơn', key: 'di_muon_khong_don', width: 15},
        {header: 'Đi muộn có đơn', key: 'di_muon_co_don', width: 15},
        {header: 'Về sớm không đơn', key: 've_som_khong_don', width: 15},
        {header: 'Về sớm có đơn', key: 've_som_co_don', width: 15},
        {header: 'Về sớm thời gian', key: 've_som_thoi_gian', width: 15},
        {header: 'Tổng số giờ', key: 'tong_gio_lam', width: 15},
        {header: 'Công thực tế', key: 'cong_thuc_te', width: 15},
        {header: 'Công đăng ký làm thêm', key: 'cong_lam_them_total', width: 15},
        {header: 'Nghỉ phép có lương', key: 'nghi_phep_co_luong', width: 15},
        {header: 'Nghỉ phép không lương', key: 'nghi_phep_khong_luong', width: 15},
        {header: 'Đi công tác', key: 'so_ngay_cong_tac', width: 15},
        {header: 'Công nghỉ toàn cty', key: 'so_ngay_nghi_le', width: 15},
        {header: 'Công tính lương', key: 'cong_tinh_luong', width: 15},
        {header: 'Tỉ lệ đi muộn', key: 'ti_le_di_muon', width: 15},
      ];
      worksheet.columns = columns;
      // Tính chữ cột cuối cùng để merge cell đúng
      const lastColLetter = worksheet.getColumn(columns.length).letter;
      // Title
      worksheet.mergeCells(`A1:${lastColLetter}1`);
      const titleRow = worksheet.getRow(1);
      titleRow.getCell(1).value = 'THỐNG KÊ CHẤM CÔNG';
      titleRow.getCell(1).font = {size: 16, bold: true};
      titleRow.getCell(1).alignment = {horizontal: 'center'};
      titleRow.height = 25;
      // Thời gian xuất báo cáo
      worksheet.mergeCells(`A2:${lastColLetter}2`);
      const exportTimeRow = worksheet.getRow(2);
      exportTimeRow.getCell(1).value = `Ngày xuất báo cáo: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;
      exportTimeRow.getCell(1).alignment = {horizontal: 'center'};
      exportTimeRow.height = 20;
      // Thời gian thống kê
      worksheet.mergeCells(`A3:${lastColLetter}3`);
      const periodRow = worksheet.getRow(3);
      periodRow.getCell(1).value = data.period_info
        ? `Thời gian thống kê: Từ ngày ${data.period_info.start_date} đến ngày ${data.period_info.end_date}`
        : 'Thời gian thống kê: ';
      periodRow.getCell(1).alignment = {horizontal: 'center'};
      periodRow.height = 20;
      // Công chuẩn
      worksheet.mergeCells(`A4:${lastColLetter}4`);
      const standardWorkRow = worksheet.getRow(4);
      standardWorkRow.getCell(
        1,
      ).value = `Công chuẩn tháng: ${data.cong_chuan_thang} | Công thực tế: ${data.cong_thuc_te}`;
      standardWorkRow.getCell(1).alignment = {horizontal: 'center'};
      standardWorkRow.height = 20;
      // Header 2 dòng
      const headerRow1 = worksheet.getRow(6);
      const headerRow2 = worksheet.getRow(7);
      // Merge các phần header nhóm
      worksheet.mergeCells('A6:A7');
      worksheet.mergeCells('B6:B7');
      worksheet.mergeCells('C6:C7');
      worksheet.mergeCells('D6:E6');
      worksheet.mergeCells('F6:H6');
      worksheet.mergeCells('I6:I7');
      worksheet.mergeCells('J6:J7');
      worksheet.mergeCells('K6:K7');
      worksheet.mergeCells('L6:L7');
      worksheet.mergeCells('M6:M7');
      worksheet.mergeCells('N6:N7');
      worksheet.mergeCells('O6:O7');
      worksheet.mergeCells('P6:P7');
      worksheet.mergeCells('Q6:Q7');
      // Header chính
      headerRow1.getCell(1).value = 'Họ tên';
      headerRow1.getCell(2).value = 'Ngày làm việc chính thức';
      headerRow1.getCell(3).value = 'Số ngày đã làm việc chính thức';
      headerRow1.getCell(4).value = 'Đi muộn';
      headerRow1.getCell(6).value = 'Về sớm';
      headerRow1.getCell(9).value = 'Tổng số giờ';
      headerRow1.getCell(10).value = 'Công thực tế';
      headerRow1.getCell(11).value = 'Công đăng ký làm thêm';
      headerRow1.getCell(12).value = 'Nghỉ phép có lương';
      headerRow1.getCell(13).value = 'Nghỉ phép không lương';
      headerRow1.getCell(14).value = 'Đi công tác';
      headerRow1.getCell(15).value = 'Công nghỉ toàn cty';
      headerRow1.getCell(16).value = 'Công tính lương';
      headerRow1.getCell(17).value = 'Tỉ lệ đi muộn';
      // Sub-header
      headerRow2.getCell(4).value = 'Không đơn';
      headerRow2.getCell(5).value = 'Có đơn';
      headerRow2.getCell(6).value = 'Không đơn';
      headerRow2.getCell(7).value = 'Có đơn';
      headerRow2.getCell(8).value = 'Thời gian';

      [headerRow1, headerRow2].forEach((row) => {
        row.eachCell((cell) => {
          cell.font = {bold: true};
          cell.alignment = {horizontal: 'center', vertical: 'middle', wrapText: true};
          cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'F2F2F2'}};
          cell.border = {
            top: {style: 'thin'},
            left: {style: 'thin'},
            bottom: {style: 'thin'},
            right: {style: 'thin'},
          };
        });
      });
      headerRow1.height = 25;
      headerRow2.height = 25;
      // Total Row
      if (data.timekeeping.length === 1) {
        const totalRow = worksheet.addRow([
          'Total',
          '',
          data.timekeeping.reduce((acc, row) => acc + row.so_ngay_lam_viec, 0),
          data.timekeeping.reduce((acc, row) => acc + row.di_muon.khong_don, 0),
          data.timekeeping.reduce((acc, row) => acc + row.di_muon.co_don, 0),
          data.timekeeping.reduce((acc, row) => acc + row.ve_som.khong_don, 0),
          data.timekeeping.reduce((acc, row) => acc + row.ve_som.co_don, 0),
          data.timekeeping.reduce((acc, row) => acc + row.ve_som.thoi_gian, 0),
          data.timekeeping.reduce((acc, row) => acc + row.tong_gio_lam, 0),
          data.timekeeping.reduce((acc, row) => acc + row.cong_thuc_te, 0),
          data.timekeeping.reduce((acc, row) => acc + row.cong_lam_them + row.cong_lam_them_trong_ngay_le, 0),
          data.timekeeping.reduce((acc, row) => acc + row.nghi_phep_co_luong, 0),
          data.timekeeping.reduce((acc, row) => acc + row.nghi_phep_khong_luong, 0),
          data.timekeeping.reduce((acc, row) => acc + row.so_ngay_cong_tac, 0),
          data.timekeeping[0]?.so_ngay_nghi_le || 0,
          data.timekeeping.reduce((acc, row) => acc + row.cong_tinh_luong, 0),
          `${data.timekeeping.reduce((acc, row) => acc + row.ti_le_di_muon, 0)}%`,
        ]);
        totalRow.eachCell((cell) => {
          cell.font = {bold: true};
          cell.border = {
            top: {style: 'thin'},
            left: {style: 'thin'},
            bottom: {style: 'thin'},
            right: {style: 'thin'},
          };
        });
      }
      // Dữ liệu nhân viên
      data.timekeeping.forEach((v) => {
        const rowData = [
          v.name,
          v.ngay_bat_dau_lam,
          v.so_ngay_lam_viec,
          v.di_muon.khong_don,
          v.di_muon.co_don,
          v.ve_som.khong_don,
          v.ve_som.co_don,
          v.ve_som.thoi_gian,
          v.tong_gio_lam,
          v.cong_thuc_te,
          v.cong_lam_them + v.cong_lam_them_trong_ngay_le,
          v.nghi_phep_co_luong,
          v.nghi_phep_khong_luong,
          v.so_ngay_cong_tac,
          v.so_ngay_nghi_le,
          v.cong_tinh_luong,
          `${v.ti_le_di_muon}%`,
        ];
        const row = worksheet.addRow(rowData);
        row.eachCell((cell) => {
          cell.border = {
            top: {style: 'thin'},
            left: {style: 'thin'},
            bottom: {style: 'thin'},
            right: {style: 'thin'},
          };
        });
      });
      const buffer = await workbook.xlsx.writeBuffer();
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=thong-ke-cham-cong-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
        'Content-Length': buffer.byteLength,
      });
      res.send(buffer);
      return;
    } catch (error) {
      throw new BadRequestException(`Lỗi khi xuất file excel: ${error.message}`);
    }
  }

  /* ==== EXPORT EXCEL: (END) ============== */

  /* Update existing attendance record or create a new one */
  async updateOrCreateAttendance(
    employeeId: number,
    date: string,
    values: Partial<AttendanceEntity> & {options?: Record<string, any>},
    params: {reqEmpId: number},
  ) {
    const attendance = await this.attendanceRepo
      .createQueryBuilder('attendance')
      .where('attendance.employeeId = :employeeId', {employeeId})
      .andWhere('DATE(attendance.workDate) = DATE(:workDate)', {workDate: date})
      .getOne();

    const {options, ...valuesToSave} = values;

    if (attendance) {
      if (options.isHalfDay) {
        // Nếu là nghỉ nửa ngày và đã có bản ghi, cộng thêm 0.5 vào rateOfWork hiện tại
        const updatedRateOfWork = Math.min(1, (Number(attendance.rateOfWork) || 0) + 0.5);
        const totalRequestHours = parseFloat(attendance.total_request_hours as any) || 8;
        // Tính toán total_hours
        const totalHours = updatedRateOfWork * totalRequestHours;
        await this.attendanceRepo.update(attendance._id, {
          checkin: attendance.checkin,
          checkout: attendance.checkout,
          overtime: attendance.overtime,
          rateOfWork: updatedRateOfWork,
          total_hours: totalHours,
        });
      } else if (options.isUnPaidLeave) {
        // Trường hợp nghỉ không lương, không cập nhật gì cả
        console.log('KHÔNG UPDATE GÌ CẢ');
      } else {
        // Trường hợp không phải nghỉ nửa ngày, cập nhật bình thường
        await this.attendanceRepo.update(attendance._id, valuesToSave);
      }
      await this.attendanceReqService.createFromRequestEmp({
        attendanceId: attendance._id,
        requestEmpId: params.reqEmpId,
      });
    } else {
      const newAttendance = this.attendanceRepo.create({
        employeeId,
        workDate: dayjs(date).startOf('day').toDate(),
        ...valuesToSave,
      });
      await this.attendanceRepo.save(newAttendance);
      await this.attendanceReqService.createFromRequestEmp({
        attendanceId: newAttendance._id,
        requestEmpId: params.reqEmpId,
      });
    }
  }

  //  REPOSITORIES
  async generateFakeData() {
    const attendances = this.attendanceRepo.create(fakeAttendanceData);
    await this.attendanceRepo.save(attendances);
    return {
      message: 'Tạo dữ liệu chấm công giả thành công',
      data: attendances,
    };
  }

  async getEmployeeWorkSchedule(employeeId: number) {
    const employee = await this.employeeService.findEmployeeWithSchedule(employeeId);
    return employee?.workScheduled || null;
  }

  async checkIsExistAttendanceById(attendance_id: number): Promise<boolean> {
    const attendance = await this.attendanceRepo.count({
      where: {_id: attendance_id},
    });
    return attendance > 0;
  }

  async findAttendanceByEmployeeIdAndDate({employeeId, workDate}: {employeeId: number; workDate: Date}) {
    const result = await this.attendanceRepo
      .createQueryBuilder('attendance')
      .select([
        'attendance._id AS _id',
        'attendance.employeeId AS employeeId',
        'attendance.workDate AS workDate',
        'attendance.checkin AS checkin',
        'attendance.checkout AS checkout',
        'attendance.total_hours AS total_hours',
        'attendance.overtime AS overtime',
        'attendance.isPenalty AS isPenalty',
        'attendance.total_request_hours AS total_request_hours',
        'attendance.rateOfWork AS rateOfWork',
      ])
      .where('attendance.employeeId = :employeeId', {employeeId})
      .andWhere('DATE(attendance.workDate) = DATE(:workDate)', {workDate})
      .getRawOne();
    return result;
  }

  async findAttendanceByEmpIdAndWorkDate({employeeId, workDate}: {employeeId: number; workDate: Date}) {
    const attendance = await this.attendanceRepo.findOne({
      where: {
        employeeId: employeeId,
        workDate: workDate,
      },
    });
    return attendance;
  }
}
