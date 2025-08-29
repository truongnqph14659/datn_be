import {BadRequestException, forwardRef, Inject, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import * as dayjs from 'dayjs';
import {ApproverListService} from 'src/modules/approver_list/approver_list.service';
import {AttendancesService} from 'src/modules/attendances/attendances.service';
import {AttendanceEntity} from 'src/modules/attendances/entities/attendance.entity';
import {AttendancesRequestsService} from 'src/modules/attendances_requests/attendances_requests.service';
import {CheckInOutService} from 'src/modules/check-in-out/check-in-out.service';
import {EmployeeService} from 'src/modules/employee/employee.service';
import {RequestEmployeeEntity} from 'src/modules/request-employee/entities/request-employee.entity';
import {RequestReferencesService} from 'src/modules/request_references/request_references.service';
import {RequestsService} from 'src/modules/requests/requests.service';
import {HINH_THUC_NGHI_PHEP, REQUEST_TYPE} from 'src/shared/constants';
import {QuerySpecificationDto} from 'src/shared/dto/query-specification.dto';
import {convertTimeToMinutes} from 'src/utils/time-helper';
import {Repository} from 'typeorm';
import {CreateRequestEmployeeDto} from './dto/create-request-employee.dto';

@Injectable()
export class RequestEmployeeService {
  constructor(
    @InjectRepository(RequestEmployeeEntity)
    private requestEmployeeRepo: Repository<RequestEmployeeEntity>,
    @InjectRepository(AttendanceEntity)
    private attendanceRepo: Repository<AttendanceEntity>,
    private attendanceService: AttendancesService,
    private attendancesRequestsService: AttendancesRequestsService,
    @Inject(forwardRef(() => ApproverListService))
    private approverListService: ApproverListService,
    private requestReferencesService: RequestReferencesService,
    private requestService: RequestsService,
    private employeeService: EmployeeService,
    private checkInOutService: CheckInOutService,
  ) {}

  async create(createRequestEmployeeDto: CreateRequestEmployeeDto) {
    const {
      employeeId,
      requestType,
      date,
      reason,
      end_time,
      from_date,
      hinh_thuc,
      loai_nghi,
      start_time,
      to_date,
      attendance_id,
      created_request,
      approvers,
      referrers,
    } = createRequestEmployeeDto;

    let attendance = await this.attendanceService.checkIsExistAttendanceById(attendance_id);
    let attendanceId = attendance_id;

    if (!attendance) {
      attendanceId = (await this.attendanceService.create(createRequestEmployeeDto))._id;
    }
    // Kiểm tra yêu cầu cùng ngày tạo
    const isExist = await this.hasExistingRequestOnDate({
      employeeId,
      requestType,
      dateOrFrom: created_request,
      type: 'inDay',
    });
    if (isExist) {
      throw new BadRequestException(`Bạn đã tạo yêu cầu này trong ngày hôm nay rồi!`);
    }
    // Kiểm tra yêu cầu nghỉ một ngày cụ thể
    if (date) {
      const isExistSingle = await this.hasExistingRequestOnDate({
        employeeId,
        requestType,
        dateOrFrom: date,
        type: 'single',
      });
      if (isExistSingle) {
        throw new BadRequestException(`Đã tồn tại yêu cầu cho ngày ${dayjs(date).format('DD/MM/YYYY')}!`);
      }
    }
    // Kiểm tra yêu cầu nghỉ nhiều ngày hoặc đi công tác
    if (from_date && to_date) {
      const isExistMultiple = await this.hasExistingRequestOnDate({
        employeeId,
        requestType,
        dateOrFrom: from_date,
        type: 'multiple',
        toDate: to_date,
      });
      if (isExistMultiple) {
        throw new BadRequestException(
          `Khoảng thời gian từ ${dayjs(from_date).format('DD/MM/YYYY')} đến ${dayjs(to_date).format('DD/MM/YYYY')}
      bị trùng với yêu cầu đã tồn tại!`,
        );
      }
    }

    let fields = {};
    const formattedDate = date ? dayjs(date).format('YYYY-MM-DD') : null;
    const fromDate = from_date ? dayjs(from_date).format('YYYY-MM-DD') : null;
    const toDate = to_date ? dayjs(to_date).format('YYYY-MM-DD') : null;
    const createdRequest = created_request ? dayjs(created_request).format('YYYY-MM-DD') : null;
    if (
      requestType !== REQUEST_TYPE.DI_MUON_VE_SOM &&
      requestType !== REQUEST_TYPE.NGHI_PHEP &&
      requestType !== REQUEST_TYPE.DI_CONG_TAC
    ) {
      fields = {
        created_request: createdRequest,
        date: formattedDate,
        start_time: start_time || null,
        end_time: end_time || null,
        reason,
      };
    }
    if (requestType === REQUEST_TYPE.DI_MUON_VE_SOM) {
      fields = {
        created_request: createdRequest,
        date: formattedDate,
        start_time: start_time || null,
        loai_nghi: loai_nghi || null,
        reason,
      };
    }
    if (requestType === REQUEST_TYPE.NGHI_PHEP) {
      if (hinh_thuc !== HINH_THUC_NGHI_PHEP.NHIEU_NGAY) {
        fields = {
          created_request: createdRequest,
          date: formattedDate,
          hinh_thuc: hinh_thuc || null,
          loai_nghi: loai_nghi || null,
          start_time: start_time || null,
          end_time: end_time || null,
          reason,
        };
      } else {
        fields = {
          created_request: createdRequest,
          from_date: fromDate,
          to_date: toDate,
          loai_nghi: loai_nghi || null,
          hinh_thuc: hinh_thuc || null,
          reason,
        };
      }
    }
    if (requestType === REQUEST_TYPE.DI_CONG_TAC) {
      fields = {
        created_request: createdRequest,
        from_date: fromDate,
        to_date: toDate,
        reason,
      };
    }

    const newRequestEmployee = this.requestEmployeeRepo.create({
      employee_id: employeeId,
      request_id: requestType,
      fields: JSON.stringify(fields),
      createdBy: employeeId,
      updatedBy: employeeId,
    });

    await this.requestEmployeeRepo.save(newRequestEmployee);

    // Lưu vào bảng request_employee_attendance
    await this.attendancesRequestsService.createFromRequestEmp({
      attendanceId,
      requestEmpId: newRequestEmployee._id,
    });
    // Lưu vào bảng approver_list
    if (approvers && approvers.length > 0) {
      const approverList = approvers.map((approver, index) => ({
        request_employee_id: newRequestEmployee._id,
        employee_id: +approver.value,
        stepOrderAprrover: index + 1,
        statusApproval_id: null,
        is_seen: 0,
        createdBy: employeeId,
        updatedBy: employeeId,
      }));
      await this.approverListService.createManyApproverList(approverList);
    }
    // Lưu vào bảng request_references
    if (referrers && referrers.length > 0) {
      const requestReferences = referrers.map((referrer) => ({
        request_employee_id: newRequestEmployee._id,
        employee_id: +referrer.value,
        is_seen: 0,
        createdBy: employeeId,
        updatedBy: employeeId,
      }));
      await this.requestReferencesService.createManyRequestReference(requestReferences);
    }

    return {
      message: 'Tạo yêu cầu thành công',
      data: newRequestEmployee,
    };
  }

  async updateFinalStatusApproval({requestEmpId}: {requestEmpId: number}) {
    const request_employee = await this.findRequestEmpById(requestEmpId);

    if (!request_employee) {
      throw new NotFoundException('Không tìm thấy yêu cầu');
    }

    const request =
      request_employee.request || (await this.requestService.findRequestById(request_employee.request_id));

    if (!request) {
      throw new NotFoundException('Không tìm thấy loại yêu cầu');
    }
    const fields: Record<string, any> = JSON.parse(request_employee.fields);

    switch (request._id) {
      case REQUEST_TYPE.DI_MUON_VE_SOM:
        request_employee.finalStatusAproval = 1;
        await this.requestEmployeeRepo.save(request_employee);
        break;
      case REQUEST_TYPE.NGHI_PHEP:
        await this.processLeaveRequest(request_employee, fields, {reqEmpId: requestEmpId});
        break;
      case REQUEST_TYPE.NGHI_VIEC:
        await this.processLeaveRequest(request_employee, fields, {reqEmpId: requestEmpId});
        break;
      // case REQUEST_TYPE.DANG_KY_LAM_CONG:
      //   await this.processLeaveRequest(request_employee, fields, {reqEmpId: requestEmpId});
      //   break;
      case REQUEST_TYPE.DANG_KY_LAM_NO_LUC:
        await this.processLeaveRequest(request_employee, fields, {reqEmpId: requestEmpId, requestType: request._id});
        break;
      case REQUEST_TYPE.DI_CONG_TAC:
        await this.processLeaveRequest(request_employee, fields, {reqEmpId: requestEmpId, requestType: request._id});
        break;
      case REQUEST_TYPE.THAY_DOI_GIO_CHAM_CONG:
        await this.processTimeChangeRequest(request_employee, fields);
        break;
      default:
      // throw new BadRequestException(`Không hỗ trợ xử lý yêu cầu loại: ${request._id}`);
    }
    // Cập nhật trạng thái duyệt cuối cùng
    await this.requestEmployeeRepo.update(requestEmpId, {finalStatusAproval: 1});
    return {
      message: 'Yêu cầu đã được duyệt thành công',
      data: request_employee,
    };
  }

  /** Hàm xử lý thay đổi giờ chấm công */
  private async processTimeChangeRequest(requestEmployee: RequestEmployeeEntity, fields: Record<string, any>) {
    // Find the attendance record
    const attendance = await this.attendanceService.findAttendanceByEmpIdAndWorkDate({
      employeeId: requestEmployee.employee_id,
      workDate: fields.date,
    });
    if (!attendance) {
      throw new NotFoundException('Không tìm thấy bản ghi chấm công');
    }

    // Lấy lịch làm việc của nhân viên để tính toán rateOfWork
    const employee = await this.employeeService.findEmployeeWithSchedule(requestEmployee.employee_id);
    if (!employee?.workScheduled) {
      throw new BadRequestException('Không tìm thấy lịch làm việc của nhân viên');
    }

    const workSchedule = employee.workScheduled;
    // Get current check-in/out summary
    const checkInOutSummary = await this.checkInOutService.getCheckInOutSummaryForDay(
      requestEmployee.employee_id,
      attendance.workDate,
    );
    // Prepare time values
    const currentCheckin = dayjs(checkInOutSummary.earliestCheckin);
    const currentCheckout = dayjs(checkInOutSummary.latestCheckout);
    const attendanceDate = dayjs(attendance.workDate).format('YYYY-MM-DD');
    const requestedCheckin = dayjs(`${attendanceDate} ${fields.start_time}`);
    const requestedCheckout = dayjs(`${attendanceDate} ${fields.end_time}`);
    // Check what changes are requested
    const isCheckInChangeRequested = !currentCheckin.isSame(requestedCheckin, 'minute');
    const isCheckOutChangeRequested = !currentCheckout.isSame(requestedCheckout, 'minute');
    // Update attendance record based on changes
    const updates: Partial<AttendanceEntity> = {};
    if (isCheckInChangeRequested) {
      updates.checkin = requestedCheckin.toDate();
    }
    if (isCheckOutChangeRequested) {
      updates.checkout = requestedCheckout.toDate();
    }
    // If changes detected, update total_hours and save
    if (Object.keys(updates).length > 0) {
      const effectiveCheckin = updates.checkin || attendance.checkin;
      const effectiveCheckout = updates.checkout || attendance.checkout;

      // Tính toán total_hours
      let total_hours = 0;

      // Nếu có lịch làm việc, tính theo quy tắc của công ty
      if (workSchedule?.shiftStart && workSchedule?.shiftEnd) {
        // Đổi thời gian thành chuỗi HH:mm:ss
        const checkinTimeString = dayjs(effectiveCheckin).format('HH:mm:ss');
        const checkoutTimeString = dayjs(effectiveCheckout).format('HH:mm:ss');

        // Chuyển đổi thời gian thành phút để dễ tính toán
        const checkinMinutes = convertTimeToMinutes(checkinTimeString);
        const checkoutMinutes = convertTimeToMinutes(checkoutTimeString);
        const shiftStartMinutes = convertTimeToMinutes(workSchedule.shiftStart);
        const shiftEndMinutes = convertTimeToMinutes(workSchedule.shiftEnd);

        // Chỉ tính thời gian làm việc trong khung giờ làm việc
        // MIN(End Time, shiftEnd) - Thời gian kết thúc hiệu quả
        const effectiveEndMinutes = Math.min(checkoutMinutes, shiftEndMinutes);

        // MAX(Start Time, shiftStart) - Thời gian bắt đầu hiệu quả
        const effectiveStartMinutes = Math.max(checkinMinutes, shiftStartMinutes);

        // Tính thời gian làm việc thực tế (phút)
        const workTimeMinutes = Math.max(0, effectiveEndMinutes - effectiveStartMinutes);

        // Trừ thời gian nghỉ ngơi nếu có
        const breakTimeMinutes = workSchedule.break_time || 0;

        // Tính tổng thời gian làm việc thực tế
        let actualWorkTimeMinutes = workTimeMinutes - breakTimeMinutes + Number(attendance.overtime || 0);

        // Đảm bảo không âm
        if (actualWorkTimeMinutes < 0) {
          actualWorkTimeMinutes = 0;
        }

        // Chuyển từ phút sang giờ
        total_hours = actualWorkTimeMinutes / 60;
      } else {
        // Nếu không có lịch làm việc, tính đơn giản là khoảng cách thời gian
        const diffHours = dayjs(effectiveCheckout).diff(dayjs(effectiveCheckin), 'hour', true);
        total_hours = diffHours;
      }

      updates.total_hours = Math.round(total_hours * 100) / 100;

      // Tính rateOfWork - tỉ lệ hoàn thành công việc
      if (workSchedule?.expected_hours) {
        const expectedHours = workSchedule.expected_hours;
        const ratio = updates.total_hours / expectedHours;
        // Làm tròn xuống đến 2 chữ số thập phân và đảm bảo không vượt quá 1.0
        updates.rateOfWork = Math.floor(ratio * 100) / 100;
      } else {
        // Nếu không có expected_hours, gán giá trị mặc định
        updates.rateOfWork = 0;
      }

      await this.attendanceRepo.update(attendance._id, updates);
    }
  }

  /** Process a leave request  */
  private async processLeaveRequest(
    requestEmployee: RequestEmployeeEntity,
    fields: Record<string, any>,
    params: {reqEmpId: number; requestType?: number},
  ) {
    // Get employee work schedule
    const employee = await this.employeeService.findEmployeeWithSchedule(requestEmployee.employee_id);
    if (!employee?.workScheduled) {
      throw new BadRequestException('Không tìm thấy lịch làm việc của nhân viên');
    }
    const workSchedule = employee.workScheduled;

    const isPaidLeave =
      fields.loai_nghi === 'CO_LUONG' || (params.requestType && params.requestType === REQUEST_TYPE.DI_CONG_TAC);

    const isMultiDay =
      fields.hinh_thuc === 'NHIEU_NGAY' || (params.requestType && params.requestType === REQUEST_TYPE.DI_CONG_TAC);

    const isHalfDay =
      fields.loai_nghi === 'CO_LUONG' &&
      (fields.hinh_thuc === HINH_THUC_NGHI_PHEP.BUOI_SANG || fields.hinh_thuc === HINH_THUC_NGHI_PHEP.BUOI_CHIEU);

    const isUnPaidLeave =
      fields.loai_nghi === 'KHONG_LUONG' &&
      (fields.hinh_thuc === HINH_THUC_NGHI_PHEP.BUOI_SANG || fields.hinh_thuc === HINH_THUC_NGHI_PHEP.BUOI_CHIEU);

    const dates = this.getLeaveDates(fields, isMultiDay);

    let attendanceValues = {
      total_hours: isPaidLeave ? workSchedule.expected_hours : 0,
      total_request_hours: isPaidLeave ? workSchedule.expected_hours : 0,
      rateOfWork: isPaidLeave ? (isHalfDay ? 0.5 : 1) : 0,
      checkin: isPaidLeave ? null : undefined,
      checkout: isPaidLeave ? null : undefined,
      overtime: 0,
      options: {isHalfDay, isUnPaidLeave},
    };

    if (params.requestType && params.requestType === REQUEST_TYPE.DANG_KY_LAM_NO_LUC) {
      const startTimeMinutes = convertTimeToMinutes(fields.start_time);
      const endTimeMinutes = convertTimeToMinutes(fields.end_time);
      const expectedHours = +workSchedule.expected_hours || 0;
      const otHours = +((endTimeMinutes - startTimeMinutes) / 60).toFixed(2) || 0;
      const overtime = otHours;
      const total_request_hours = +(expectedHours + otHours).toFixed(2);
      await this.attendanceService.updateOrCreateAttendance(
        requestEmployee.employee_id,
        dayjs(fields.date).format('YYYY-MM-DD'),
        {overtime, total_request_hours},
        params,
      );
      return;
    } else {
      for (const date of dates) {
        await this.attendanceService.updateOrCreateAttendance(
          requestEmployee.employee_id,
          date,
          attendanceValues,
          params,
        );
      }
    }
  }

  /** Get array of dates for leave request  */
  private getLeaveDates(fields: Record<string, any>, isMultiDay: boolean): string[] {
    const dates: string[] = [];
    if (isMultiDay) {
      const fromDate = dayjs(fields.from_date).startOf('day');
      const toDate = dayjs(fields.to_date).endOf('day');
      let currentDate = fromDate;
      while (currentDate.isBefore(toDate) || currentDate.isSame(toDate, 'day')) {
        // Always include all days, including weekends
        dates.push(currentDate.format('YYYY-MM-DD'));
        currentDate = currentDate.add(1, 'day');
      }
    } else {
      // Single day leave
      dates.push(dayjs(fields.date).format('YYYY-MM-DD'));
    }
    return dates;
  }

  async findAllPendingRequestsByUser({employeeId}: {employeeId: number}, query: QuerySpecificationDto) {
    const {limit = 10, page = 1} = query;

    const baseQuery = this.requestEmployeeRepo
      .createQueryBuilder('request_employee')
      .leftJoin('request_employee.request', 'request')
      .leftJoin('approver_list', 'apl', 'apl.request_employee_id = request_employee._id')
      .leftJoin('employees', 'emp', 'emp._id = apl.employee_id')
      .leftJoin('request_references', 'ref', 'ref.requestEmployeeId = request_employee._id')
      .leftJoin('employees', 'refEmp', 'refEmp._id = ref.employeeId')
      .where('request_employee.isDeleted = 0')
      .andWhere('emp.isDeleted = 0')
      .andWhere('request_employee.employee_id = :employeeId', {employeeId})
      .andWhere('request_employee.finalStatusAproval IS NULL');

    const totalQuery = baseQuery.clone();
    const total = await totalQuery.select('COUNT(DISTINCT request_employee._id)', 'count').getRawOne();

    const totalItems = parseInt(total?.count || '0');

    const pendingRequests = await baseQuery
      .select([
        'request_employee._id AS rqe_id',
        'request_employee.employee_id AS rqe_employee_id',
        'request_employee.request_id AS rqe_request_id',
        'request_employee.fields AS fields',
        'request_employee.finalStatusAproval AS rqe_final_status_aproval',
        'request._id AS request_id',
        'request.name AS request_name',
        'request.code AS request_code',
        'apl.statusApproval_id AS apl_status_approval_id',
        'apl.stepOrderAprrover AS apl_step_order_approver',
        'apl.is_seen AS apl_is_seen',
        'apl.employee_id AS apl_employee_id',
        'apl.request_employee_id AS apl_request_employee_id',
        'apl._id AS apl_id',
        'emp._id AS emp_id',
        'emp.name AS emp_name',
        'emp.email AS emp_email',
        'ref._id AS ref_id',
        'ref.employeeId AS ref_employee_id',
        'ref.is_seen AS ref_is_seen',
        'ref.requestEmployeeId AS ref_request_employee_id',
        'refEmp._id AS ref_emp_id',
        'refEmp.name AS ref_emp_name',
        'refEmp.email AS ref_emp_email',
      ])
      .orderBy('request_employee.createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    const grouped = pendingRequests.reduce((acc, curr) => {
      const key = curr.rqe_id;
      if (!acc[key]) {
        acc[key] = {
          rqe_id: curr.rqe_id,
          rqe_employee_id: curr.rqe_employee_id,
          rqe_request_id: curr.rqe_request_id,
          rqe_final_status_aproval: curr.rqe_final_status_aproval,
          fields: JSON.parse(curr.fields),
          request: {
            _id: curr.request_id,
            name: curr.request_name,
            code: curr.request_code,
          },
          approvers: [],
          references: [],
        };
      }

      // Chỉ thêm approver nếu chưa tồn tại trong mảng (tránh trùng lặp)
      const existingApprover = acc[key].approvers.find(
        (a) => a.employee_id === curr.apl_employee_id && a.step_order_aprrover === curr.apl_step_order_approver,
      );

      if (!existingApprover && curr.apl_employee_id) {
        acc[key].approvers.push({
          _id: curr.apl_id,
          step_order_aprrover: curr.apl_step_order_approver,
          status_approval_id: curr.apl_status_approval_id,
          is_seen: curr.apl_is_seen,
          employee_id: curr.apl_employee_id,
          request_employee_id: curr.apl_request_employee_id,
          employee: {
            _id: curr.emp_id,
            name: curr.emp_name,
            email: curr.emp_email,
          },
        });
      }

      // Chỉ thêm reference nếu chưa tồn tại trong mảng (tránh trùng lặp)
      const existingReference = acc[key].references.find((r) => r.employee_id === curr.ref_employee_id);
      if (!existingReference && curr.ref_employee_id) {
        acc[key].references.push({
          _id: curr.ref_id,
          employee_id: curr.ref_employee_id,
          is_seen: curr.ref_is_seen,
          request_employee_id: curr.ref_request_employee_id,
          employee: {
            _id: curr.ref_emp_id,
            name: curr.ref_emp_name,
            email: curr.ref_emp_email,
          },
        });
      }
      return acc;
    }, {});

    const totalPages = Math.ceil(totalItems / limit);

    return {
      message: 'Lấy danh sách yêu cầu chưa duyệt thành công',
      data: Object.values(grouped),
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  async findAllApprovedRequestsByUser({employeeId}: {employeeId: number}, query: QuerySpecificationDto) {
    const {limit = 10, page = 1} = query;

    const baseQuery = this.requestEmployeeRepo
      .createQueryBuilder('request_employee')
      .leftJoin('request_employee.request', 'request')
      .leftJoin('approver_list', 'apl', 'apl.request_employee_id = request_employee._id')
      .leftJoin('employees', 'emp', 'emp._id = apl.employee_id')
      .leftJoin('request_references', 'ref', 'ref.requestEmployeeId = request_employee._id')
      .leftJoin('employees', 'refEmp', 'refEmp._id = ref.employeeId')
      .where('request_employee.isDeleted = 0')
      .andWhere('emp.isDeleted = 0')
      .andWhere('request_employee.employee_id = :employeeId', {employeeId})
      .andWhere('request_employee.finalStatusAproval IS NOT NULL');

    const totalQuery = baseQuery.clone();
    const total = await totalQuery.select('COUNT(DISTINCT request_employee._id)', 'count').getRawOne();

    const totalItems = parseInt(total?.count || '0');

    const pendingRequests = await baseQuery
      .select([
        'request_employee._id AS rqe_id',
        'request_employee.employee_id AS rqe_employee_id',
        'request_employee.request_id AS rqe_request_id',
        'request_employee.fields AS fields',
        'request_employee.finalStatusAproval AS rqe_final_status_aproval',
        'request_employee.appover_feaback',
        'request_employee.createdAt',
        'request._id AS request_id',
        'request.name AS request_name',
        'request.code AS request_code',
        'apl.statusApproval_id AS apl_status_approval_id',
        'apl.stepOrderAprrover AS apl_step_order_approver',
        'apl.is_seen AS apl_is_seen',
        'apl.employee_id AS apl_employee_id',
        'apl.request_employee_id AS apl_request_employee_id',
        'apl._id AS apl_id',
        'emp._id AS emp_id',
        'emp.name AS emp_name',
        'emp.email AS emp_email',
        'ref._id AS ref_id',
        'ref.employeeId AS ref_employee_id',
        'ref.is_seen AS ref_is_seen',
        'ref.requestEmployeeId AS ref_request_employee_id',
        'refEmp._id AS ref_emp_id',
        'refEmp.name AS ref_emp_name',
        'refEmp.email AS ref_emp_email',
      ])
      .orderBy('request_employee.createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    const grouped = pendingRequests.reduce((acc, curr) => {
      const key = curr.rqe_id;
      if (!acc[key]) {
        acc[key] = {
          rqe_id: curr.rqe_id,
          rqe_employee_id: curr.rqe_employee_id,
          rqe_request_id: curr.rqe_request_id,
          rqe_final_status_aproval: curr.rqe_final_status_aproval,
          fields: JSON.parse(curr.fields),
          appover_feaback: curr.request_employee_appover_feaback,
          createdAt: curr.request_employee_createdAt,
          request: {
            _id: curr.request_id,
            name: curr.request_name,
            code: curr.request_code,
          },
          approvers: [],
          references: [],
        };
      }

      // Chỉ thêm approver nếu chưa tồn tại trong mảng (tránh trùng lặp)
      const existingApprover = acc[key].approvers.find(
        (a) => a.employee_id === curr.apl_employee_id && a.step_order_aprrover === curr.apl_step_order_approver,
      );

      if (!existingApprover && curr.apl_employee_id) {
        acc[key].approvers.push({
          _id: curr.apl_id,
          step_order_aprrover: curr.apl_step_order_approver,
          status_approval_id: curr.apl_status_approval_id,
          is_seen: curr.apl_is_seen,
          employee_id: curr.apl_employee_id,
          request_employee_id: curr.apl_request_employee_id,
          appover_feaback: curr.request_employee_appover_feaback,
          createdAt: curr.request_employee_createdAt,
          employee: {
            _id: curr.emp_id,
            name: curr.emp_name,
            email: curr.emp_email,
          },
        });
      }

      // Chỉ thêm reference nếu chưa tồn tại trong mảng (tránh trùng lặp)
      const existingReference = acc[key].references.find((r) => r.employee_id === curr.ref_employee_id);
      if (!existingReference && curr.ref_employee_id) {
        acc[key].references.push({
          _id: curr.ref_id,
          employee_id: curr.ref_employee_id,
          is_seen: curr.ref_is_seen,
          request_employee_id: curr.ref_request_employee_id,
          appover_feaback: curr.request_employee_appover_feaback,
          createdAt: curr.request_employee_createdAt,
          employee: {
            _id: curr.ref_emp_id,
            name: curr.ref_emp_name,
            email: curr.ref_emp_email,
          },
        });
      }
      return acc;
    }, {});

    const totalPages = Math.ceil(totalItems / limit);
    const sortData = Object.values(grouped).sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return {
      message: 'Lấy danh sách yêu cầu đã duyệt thành công',
      data: sortData,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  async getRequestEmployeeDetailsById(requestEmpId: number) {
    const pendingRequests = await this.requestEmployeeRepo
      .createQueryBuilder('request_employee')
      .leftJoin('request_employee.request', 'request')
      .leftJoin('approver_list', 'apl', 'apl.request_employee_id = request_employee._id')
      .leftJoin('employees', 'emp', 'emp._id = apl.employee_id')
      .leftJoin('request_references', 'ref', 'ref.requestEmployeeId = request_employee._id')
      .leftJoin('employees', 'refEmp', 'refEmp._id = ref.employeeId')
      .where('request_employee._id = :requestEmpId', {requestEmpId})
      .select([
        'request_employee._id AS rqe_id',
        'request_employee.employee_id AS rqe_employee_id',
        'request_employee.request_id AS rqe_request_id',
        'request_employee.fields AS fields',
        'request_employee.finalStatusAproval AS rqe_final_status_aproval',
        'request._id AS request_id',
        'request.name AS request_name',
        'request.code AS request_code',
        'apl.statusApproval_id AS apl_status_approval_id',
        'apl.stepOrderAprrover AS apl_step_order_approver',
        'apl.is_seen AS apl_is_seen',
        'apl.employee_id AS apl_employee_id',
        'apl.request_employee_id AS apl_request_employee_id',
        'apl._id AS apl_id',
        'emp._id AS emp_id',
        'emp.name AS emp_name',
        'emp.email AS emp_email',
        'ref._id AS ref_id',
        'ref.employeeId AS ref_employee_id',
        'ref.is_seen AS ref_is_seen',
        'ref.requestEmployeeId AS ref_request_employee_id',
        'refEmp._id AS ref_emp_id',
        'refEmp.name AS ref_emp_name',
        'refEmp.email AS ref_emp_email',
      ])
      .orderBy('request_employee._id', 'DESC')
      .getRawMany();

    if (!pendingRequests || pendingRequests.length === 0) {
      return {
        message: 'Không tìm thấy yêu cầu',
        data: null,
      };
    }

    const firstRow = pendingRequests[0];

    const request = {
      _id: firstRow.rqe_id,
      rqe_employee_id: firstRow.rqe_employee_id,
      rqe_request_id: firstRow.rqe_request_id,
      fields: JSON.parse(firstRow.fields || '{}'),
      rqe_final_status_aproval: firstRow.rqe_final_status_aproval,
      request: {
        _id: firstRow.request_id,
        name: firstRow.request_name,
        code: firstRow.request_code,
      },
      approvers: [],
      references: [],
    };

    for (const row of pendingRequests) {
      if (row.apl_id) {
        // Kiểm tra xem approver đã tồn tại chưa
        const existingApprover = request.approvers.find((a) => a._id === row.apl_id);
        if (!existingApprover) {
          request.approvers.push({
            _id: row.apl_id,
            step_order_aprrover: row.apl_step_order_approver,
            status_approval_id: row.apl_status_approval_id,
            is_seen: row.apl_is_seen,
            employee_id: row.apl_employee_id,
            request_employee_id: row.apl_request_employee_id,
            employee: {
              _id: row.emp_id,
              name: row.emp_name,
              email: row.emp_email,
            },
          });
        }
      }

      if (row.ref_id) {
        // Kiểm tra xem reference đã tồn tại chưa
        const existingReference = request.references.find((r) => r._id === row.ref_id);
        if (!existingReference) {
          request.references.push({
            _id: row.ref_id,
            employee_id: row.ref_employee_id,
            is_seen: row.ref_is_seen,
            request_employee_id: row.ref_request_employee_id,
            employee: {
              _id: row.ref_emp_id,
              name: row.ref_emp_name,
              email: row.ref_emp_email,
            },
          });
        }
      }
    }

    return {
      message: 'Lấy chi tiết yêu cầu thành công',
      data: request,
    };
  }

  //  Hàm này dùng cho hủy yêu cầu của người tạo đơn
  async cancelRequest({requestEmpId, employeeId}: {requestEmpId: number; employeeId: number}) {
    const requestEmployee = await this.requestEmployeeRepo.findOne({
      where: {_id: requestEmpId, employee_id: employeeId, isDeleted: 0},
    });

    if (!requestEmployee) {
      throw new NotFoundException('Không tìm thấy yêu cầu');
    }

    if (requestEmployee.employee_id !== employeeId) {
      throw new BadRequestException('Bạn không có quyền hủy yêu cầu này');
    }

    const hasApproved = await this.approverListService.hasApprovedRequest(requestEmpId);

    if (hasApproved) {
      throw new BadRequestException('Không thể hủy yêu cầu đã được duyệt');
    }

    requestEmployee.isDeleted = 1;
    await this.requestEmployeeRepo.save(requestEmployee);
    return {
      message: 'Hủy yêu cầu thành công',
      data: null,
    };
  }

  // Hàm này dùng cho từ chối yêu cầu của người duyệt đơn
  async rejectRequest({
    requestEmpId,
    employeeId,
    appover_feaback,
  }: {
    requestEmpId: number;
    employeeId: number;
    appover_feaback: string;
  }) {
    const requestEmployee = await this.requestEmployeeRepo.findOne({
      where: {_id: requestEmpId, isDeleted: 0},
    });

    if (!requestEmployee) {
      throw new NotFoundException('Không tìm thấy yêu cầu');
    }

    const hasApproved = await this.approverListService.findApproverListByRequestEmpIdAnyEmpId({
      requestEmpId: requestEmpId,
      employeeId: employeeId,
    });

    if (!hasApproved) {
      throw new BadRequestException('Bạn không có quyền từ chối yêu cầu này');
    }

    await this.approverListService.updateStatusApproval(hasApproved._id);
    requestEmployee.finalStatusAproval = 0;
    requestEmployee.appover_feaback = appover_feaback;
    await this.requestEmployeeRepo.save(requestEmployee);

    return {
      message: 'Từ chối yêu cầu thành công',
      data: null,
    };
  }

  async countPendingRequests(employeeId: number) {
    if (!employeeId) {
      return {
        message: 'Không tìm thấy yêu cầu chưa duyệt',
        data: {count: 0},
      };
    }
    const count = await this.requestEmployeeRepo
      .createQueryBuilder('request_employee')
      .leftJoin('request_employee.request', 'request')
      .leftJoin('approver_list', 'apl', 'apl.request_employee_id = request_employee._id')
      .leftJoin('employees', 'emp', 'emp._id = apl.employee_id')
      .where('request_employee.isDeleted = 0')
      .andWhere('emp.isDeleted = 0')
      .andWhere('request_employee.employee_id = :employeeId', {employeeId})
      .andWhere('request_employee.finalStatusAproval IS NULL')
      .distinct(true)
      .getCount();
    return {
      message: 'Lấy số lượng yêu cầu chưa duyệt thành công',
      data: {count},
    };
  }

  async countApprovedRequests(employeeId: number) {
    if (!employeeId) {
      return {
        message: 'Không tìm thấy yêu cầu đã duyệt',
        data: {count: 0},
      };
    }
    const count = await this.requestEmployeeRepo
      .createQueryBuilder('request_employee')
      .leftJoin('request_employee.request', 'request')
      .leftJoin('approver_list', 'apl', 'apl.request_employee_id = request_employee._id')
      .leftJoin('employees', 'emp', 'emp._id = apl.employee_id')
      .where('request_employee.isDeleted = 0')
      .andWhere('emp.isDeleted = 0')
      .andWhere('request_employee.employee_id = :employeeId', {employeeId})
      .andWhere('request_employee.finalStatusAproval IS NOT NULL')
      .distinct(true)
      .getCount();
    return {
      message: 'Lấy số lượng yêu cầu đã duyệt thành công',
      data: {count},
    };
  }

  // REPOSITORIES
  async hasExistingRequestOnDate({
    employeeId,
    requestType,
    dateOrFrom,
    type,
    toDate,
  }: {
    employeeId: number;
    requestType: number;
    dateOrFrom: string;
    type: 'single' | 'multiple' | 'inDay';
    toDate?: string;
  }): Promise<boolean> {
    const formattedFrom = dayjs(dateOrFrom).format('YYYY-MM-DD');
    const formattedTo = toDate ? dayjs(toDate).format('YYYY-MM-DD') : formattedFrom;
    let result = null;
    // Kiểm tra yêu cầu cùng ngày tạo
    if (type === 'inDay') {
      result = await this.requestEmployeeRepo
        .createQueryBuilder('request')
        .select('1')
        .where('request.employee_id = :employeeId AND request.isDeleted=0', {employeeId})
        .andWhere('request.request_id = :requestType', {requestType})
        .andWhere(`JSON_UNQUOTE(JSON_EXTRACT(request.fields, '$.created_request')) = :targetDate`, {
          targetDate: formattedFrom,
        })
        .limit(1)
        .getRawOne();

      if (result) return true;
    }
    // Nếu là yêu cầu một ngày cụ thể, kiểm tra:
    // 1. Trùng với yêu cầu một ngày khác
    // 2. Nằm trong khoảng thời gian của yêu cầu nhiều ngày
    if (type === 'single') {
      // Kiểm tra trùng ngày với yêu cầu một ngày khác
      result = await this.requestEmployeeRepo
        .createQueryBuilder('request')
        .select('1')
        .where('request.employee_id = :employeeId AND request.isDeleted=0', {employeeId})
        .andWhere('request.request_id = :requestType', {requestType})
        .andWhere(`JSON_UNQUOTE(JSON_EXTRACT(request.fields, '$.date')) = :targetDate`, {
          targetDate: formattedFrom,
        })
        .limit(1)
        .getRawOne();
      if (result) return true;
      // Kiểm tra ngày đó có nằm trong khoảng thời gian của yêu cầu nhiều ngày nào không
      result = await this.requestEmployeeRepo
        .createQueryBuilder('request')
        .select('1')
        .where('request.employee_id = :employeeId', {employeeId})
        .andWhere('request.request_id = :requestType', {requestType})
        .andWhere(`JSON_UNQUOTE(JSON_EXTRACT(request.fields, '$.from_date')) <= :targetDate`, {
          targetDate: formattedFrom,
        })
        .andWhere(`JSON_UNQUOTE(JSON_EXTRACT(request.fields, '$.to_date')) >= :targetDate`, {
          targetDate: formattedFrom,
        })
        .andWhere(`JSON_UNQUOTE(JSON_EXTRACT(request.fields, '$.hinh_thuc')) = 'NHIEU_NGAY'`)
        .limit(1)
        .getRawOne();

      if (result) return true;
    }
    // Nếu là yêu cầu nhiều ngày
    if (type === 'multiple') {
      // Kiểm tra chồng chéo với các yêu cầu nhiều ngày khác
      result = await this.requestEmployeeRepo
        .createQueryBuilder('request')
        .select('1')
        .where('request.employee_id = :employeeId AND request.isDeleted=0', {employeeId})
        .andWhere('request.request_id = :requestType', {requestType})
        .andWhere(`JSON_UNQUOTE(JSON_EXTRACT(request.fields, '$.hinh_thuc')) = 'NHIEU_NGAY'`)
        .andWhere(`JSON_UNQUOTE(JSON_EXTRACT(request.fields, '$.from_date')) <= :toDate`, {
          toDate: formattedTo,
        })
        .andWhere(`JSON_UNQUOTE(JSON_EXTRACT(request.fields, '$.to_date')) >= :fromDate`, {
          fromDate: formattedFrom,
        })
        .limit(1)
        .getRawOne();
      if (result) return true;
      // Kiểm tra có yêu cầu một ngày nào nằm trong khoảng thời gian này không
      result = await this.requestEmployeeRepo
        .createQueryBuilder('request')
        .select('1')
        .where('request.employee_id = :employeeId AND request.isDeleted=0', {employeeId})
        .andWhere('request.request_id = :requestType', {requestType})
        .andWhere(`JSON_UNQUOTE(JSON_EXTRACT(request.fields, '$.date')) >= :fromDate`, {
          fromDate: formattedFrom,
        })
        .andWhere(`JSON_UNQUOTE(JSON_EXTRACT(request.fields, '$.date')) <= :toDate`, {
          toDate: formattedTo,
        })
        .andWhere(`JSON_UNQUOTE(JSON_EXTRACT(request.fields, '$.hinh_thuc')) = 'MOT_NGAY'`)
        .limit(1)
        .getRawOne();
    }
    return !!result;
  }

  async findRequestEmpById(id: number) {
    const requestEmp = await this.requestEmployeeRepo.findOne({
      where: {_id: id, isDeleted: 0},
      relations: ['request'],
      select: {
        _id: true,
        employee_id: true,
        request_id: true,
        fields: true,
        finalStatusAproval: true,
        request: {
          _id: true,
          name: true,
          code: true,
          fields: true,
        },
      },
    });
    return requestEmp;
  }
}
