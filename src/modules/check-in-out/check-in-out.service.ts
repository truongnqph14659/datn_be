import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {InjectRepository} from '@nestjs/typeorm';
import * as dayjs from 'dayjs';
import {CheckInOutEntity} from 'src/modules/check-in-out/entities/check-in-out.entity';
import {EmployeeService} from 'src/modules/employee/employee.service';
import {CheckInOutSummary} from 'src/shared/types/check-in-out.type';
import {handleAndUploadFile} from 'src/utils/upload-files.util';
import {DataSource, EntityManager, Repository} from 'typeorm';
import {CreateCheckInOutDto} from './dto/create-check-in-out.dto';
import {AttendanceEntity} from '../attendances/entities/attendance.entity';
import {WorkScheduleEntity} from '../work_schedules/entities/work_schedule.entity';
import {convertTimeToMinutes, formatTimeFromDate} from 'src/utils/time-helper';
import {error} from 'console';

@Injectable()
export class CheckInOutService {
  constructor(
    @InjectRepository(CheckInOutEntity)
    private checkInOutRepo: Repository<CheckInOutEntity>,
    private employeeService: EmployeeService,
    private eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
  ) {}

  async create(payload: CreateCheckInOutDto, req: Request) {
    const foundEmployee = await this.employeeService.findEmployeeById(payload.employee_id);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const manager = queryRunner.manager;
    if (!foundEmployee) {
      throw new NotFoundException(`Nhân viên với ID ${payload.employee_id} không tồn tại`);
    }
    let dataInit = null;
    if (req['files']) {
      const {data} = await handleAndUploadFile(req);
      dataInit = data;
      if (!data) {
        throw new NotFoundException(`upload false`);
      }
    }
    try {
      const {employee_id: employeeId, datetime: workDate} = payload;
      const checkInOut = manager.create(CheckInOutEntity, {
        ...payload,
        createdBy: payload.employee_id,
        updatedBy: payload.employee_id,
        url_image: dataInit ? dataInit[0]?.url_image : '',
      });
      await manager.save(checkInOut);
      const [attendanceRecord, checkInOutSummary, workSchedule]: [
        AttendanceEntity | null,
        CheckInOutSummary,
        WorkScheduleEntity | null,
      ] = await Promise.all([
        // Kiểm tra xem đã có attendance cho nhân viên và ngày này chưa
        this.findAttendanceByEmployeeIdAndDateHasManager({manager, employeeId, workDate}),
        // Lấy thông tin check-in và check-out từ bảng check_in_out
        this.getCheckInOutSummaryForDayHasManager(manager, employeeId, workDate),
        // Lấy lịch làm việc của nhân viên
        this.getEmployeeWorkSchedule(employeeId),
      ]);

      // Trường hợp không có bản ghi attendance
      if (!attendanceRecord) {
        // Tạo bản ghi mới với chỉ thông tin check-in
        const attendance = manager.create(AttendanceEntity, {
          employeeId,
          workDate: dayjs(workDate).startOf('day').toDate(),
          checkin: checkInOutSummary.earliestCheckin,
          total_hours: 0,
          total_request_hours: workSchedule?.expected_hours || 0,
          rateOfWork: 0,
        });
        await manager.save(attendance);
      }
      // Nếu đã có bản ghi attendance và checkin = null
      if (attendanceRecord && !attendanceRecord.checkin) {
        await manager.update(
          AttendanceEntity,
          {_id: attendanceRecord._id},
          {
            checkin: checkInOutSummary.earliestCheckin,
            total_request_hours: workSchedule?.expected_hours || 0,
          },
        );
      }
      // Trường hợp đã có bản ghi và có dữ liệu checkout mới
      if (checkInOutSummary.latestCheckout) {
        // Cập nhật bản ghi attendance với dữ liệu check-out mới
        const result = await this.updateAttendanceWithCheckOut(
          manager,
          attendanceRecord,
          checkInOutSummary,
          workSchedule,
        );
      }
      await queryRunner.commitTransaction();
      return {
        message: 'Thêm mới check-in/out thành công',
        data: checkInOut,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Error Handler');
    } finally {
      await queryRunner.release();
    }
  }

  // REPOSITORIES

  async findAttendanceByEmployeeIdAndDateHasManager({
    manager,
    employeeId,
    workDate,
  }: {
    manager: EntityManager;
    employeeId: number;
    workDate: Date;
  }) {
    const result = await manager
      .createQueryBuilder(AttendanceEntity, 'attendance')
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

  // Lấy thông tin check-in sớm nhất, check-in muộn nhất và check-out muộn nhất theo ngày
  async getCheckInOutSummaryForDayHasManager(manager: EntityManager, employeeId: number, workDate: Date | string) {
    const workDateString = dayjs(workDate).format('YYYY-MM-DD');
    const raw = await manager
      .createQueryBuilder(CheckInOutEntity, 'check_in_out')
      .select([
        `MIN(CASE WHEN check_in_out.type = 'check-in' THEN check_in_out.datetime END) AS earliestCheckin`,
        `MAX(CASE WHEN check_in_out.type = 'check-in' THEN check_in_out.datetime END) AS latestCheckin`,
        `MAX(CASE WHEN check_in_out.type = 'check-out' THEN check_in_out.datetime END) AS latestCheckout`,
      ])
      .where('check_in_out.employee_id = :employeeId', {employeeId})
      .andWhere('DATE(check_in_out.datetime) = :workDate', {workDate: workDateString})
      .getRawOne();
    return {
      earliestCheckin: raw?.earliestCheckin ? new Date(raw.earliestCheckin) : null,
      latestCheckin: raw?.latestCheckin ? new Date(raw.latestCheckin) : null,
      latestCheckout: raw?.latestCheckout ? new Date(raw.latestCheckout) : null,
    };
  }

  async getEmployeeWorkSchedule(employeeId: number) {
    const employee = await this.employeeService.findEmployeeWithSchedule(employeeId);
    return employee?.workScheduled || null;
  }

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
    return;
  }

  // Lấy thông tin check-in sớm nhất, check-in muộn nhất và check-out muộn nhất theo ngày
  async getCheckInOutSummaryForDay(employeeId: number, workDate: Date | string): Promise<CheckInOutSummary> {
    const workDateString = dayjs(workDate).format('YYYY-MM-DD');
    const raw = await this.checkInOutRepo
      .createQueryBuilder('check_in_out')
      .select([
        `MIN(CASE WHEN check_in_out.type = 'check-in' THEN check_in_out.datetime END) AS earliestCheckin`,
        `MAX(CASE WHEN check_in_out.type = 'check-in' THEN check_in_out.datetime END) AS latestCheckin`,
        `MAX(CASE WHEN check_in_out.type = 'check-out' THEN check_in_out.datetime END) AS latestCheckout`,
      ])
      .where('check_in_out.employee_id = :employeeId', {employeeId})
      .andWhere('DATE(check_in_out.datetime) = :workDate', {workDate: workDateString})
      .getRawOne();
    return {
      earliestCheckin: raw?.earliestCheckin ? new Date(raw.earliestCheckin) : null,
      latestCheckin: raw?.latestCheckin ? new Date(raw.latestCheckin) : null,
      latestCheckout: raw?.latestCheckout ? new Date(raw.latestCheckout) : null,
    };
  }

  // Lấy tất cả các bản ghi check-in/out trong ngày
  async getAllCheckInOutForDay(employeeId: number, workDate: Date | string) {
    const workDateString = dayjs(workDate).format('YYYY-MM-DD');
    return this.checkInOutRepo
      .createQueryBuilder('check_in_out')
      .where('check_in_out.employee_id = :employeeId', {employeeId})
      .andWhere('DATE(check_in_out.datetime) = :workDate', {workDate: workDateString})
      .orderBy('check_in_out.datetime', 'ASC')
      .getMany();
  }
}
