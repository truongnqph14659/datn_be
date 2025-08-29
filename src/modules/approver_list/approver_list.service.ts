import {forwardRef, Inject, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {ApproveRequestDto} from 'src/modules/approver_list/dto/create-approver_list.dto';
import {ApproverListEntity} from 'src/modules/approver_list/entities/approver_list.entity';
import {RequestEmployeeService} from 'src/modules/request-employee/request-employee.service';
import {QuerySpecificationDto} from 'src/shared/dto/query-specification.dto';
import {Repository} from 'typeorm';
import {AttendancesRequestEntity} from '../attendances_requests/entities/attendances_request.entity';
import {AttendanceEntity} from '../attendances/entities/attendance.entity';

@Injectable()
export class ApproverListService {
  constructor(
    @InjectRepository(ApproverListEntity)
    private approverListRepo: Repository<ApproverListEntity>,
    @InjectRepository(AttendancesRequestEntity)
    private attendanceReqRepo: Repository<AttendancesRequestEntity>,
    @InjectRepository(AttendanceEntity)
    private attendanceRepo: Repository<AttendanceEntity>,
    @Inject(forwardRef(() => RequestEmployeeService))
    private requestEmployeeService: RequestEmployeeService,
  ) {}

  async createManyApproverList(
    data: {
      request_employee_id: number;
      employee_id: number;
      stepOrderAprrover: number;
      statusApproval_id: number | null;
      is_seen: number;
      createdBy: number;
      updatedBy: number;
    }[],
  ) {
    const approverListEntities = this.approverListRepo.create(
      data.map((item) => ({
        request_employee_id: item.request_employee_id,
        employee_id: item.employee_id,
        stepOrderAprrover: item.stepOrderAprrover,
        statusApproval_id: item.statusApproval_id,
        is_seen: item.is_seen,
        createdBy: item.createdBy,
        updatedBy: item.updatedBy,
      })),
    );
    await this.approverListRepo.save(approverListEntities);
  }

  /** Lấy danh sách các yêu cầu chưa được duyệt của một user */
  async getPendingApprovals(employeeId: number) {
    const query = this.approverListRepo
      .createQueryBuilder('approver')
      .leftJoin(
        'approver_list',
        'prev_approver',
        `prev_approver.request_employee_id = approver.request_employee_id
          AND prev_approver.stepOrderAprrover < approver.stepOrderAprrover`,
      )
      .leftJoin('request_employee', 'req', 'req._id = approver.request_employee_id')
      .leftJoin('employees', 'emp', 'emp._id = req.employee_id')
      .leftJoin('requests', 'request', 'request._id = req.request_id')
      .where('approver.employee_id = :employeeId and req.isDeleted=0', {employeeId})
      .andWhere('approver.statusApproval_id IS NULL')
      .groupBy('approver._id')
      .having('COUNT(prev_approver._id) = COUNT(prev_approver.statusApproval_id)')
      .select([
        'approver._id AS approval_id',
        'approver.request_employee_id AS request_employee_id',
        'approver.stepOrderAprrover AS step_order',
        'approver.is_seen AS is_seen',
        'approver.statusApproval_id AS status_approval',
        'req.fields AS fields',
        'emp.name AS requester',
        'request.name AS request_type',
        'request.code AS request_code',
      ]);

    const pendingRequests = await query.getRawMany();

    const formattedResults = pendingRequests.map((item, index) => ({
      ...item,
      fields: JSON.parse(item.fields || '{}'),
    }));

    return {
      message: 'Danh sách yêu cầu cần duyệt',
      data: formattedResults,
    };
  }

  /** Lấy danh sách các yêu cầu đã duyệt của một user  */
  async getApprovedRequests({userId, query: {page = 1, limit = 10}}: {userId: number; query: QuerySpecificationDto}) {
    const query = this.approverListRepo
      .createQueryBuilder('approver')
      .leftJoin('request_employee', 'req', 'req._id = approver.request_employee_id')
      .leftJoin('employees', 'emp', 'emp._id = req.employee_id')
      .leftJoin('requests', 'request', 'request._id = req.request_id')
      .where('approver.employee_id = :employeeId AND req.isDeleted = 0', {employeeId: userId})
      .andWhere('approver.statusApproval_id IS NOT NULL')
      .select([
        'approver._id AS approval_id',
        'approver.request_employee_id AS request_employee_id',
        'approver.stepOrderAprrover AS step_order',
        'approver.is_seen AS is_seen',
        'approver.statusApproval_id AS status_approval',
        'req.fields AS fields',
        'req.appover_feaback',
        'emp.name AS requester',
        'request.name AS request_type',
        'request.code AS request_code',
      ])
      .orderBy('approver.updatedAt', 'DESC');

    const [total, approvedRequests] = await Promise.all([query.getCount(), query.getRawMany()]);
    const offset = (page - 1) * limit;
    query.limit(limit).offset(offset);

    const formattedResults = approvedRequests.map((item) => ({
      ...item,
      fields: JSON.parse(item.fields || '{}'),
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      message: 'Danh sách yêu cầu đã duyệt',
      data: formattedResults,
      meta: {
        page,
        limit,
        totalItems: total,
        totalPages,
      },
    };
  }

  // Duyệt yêu cầu
  async approveRequest({approverId, employeeId, requestEmployeeId}: ApproveRequestDto) {
    const approver = await this.findApproverRecord({
      approverId,
      employeeId,
      requestEmployeeId,
    });
    if (!approver) {
      throw new NotFoundException('Yêu cầu không tồn tại');
    }

    // Check xem phải bước duyệt cuối cùng không
    const lastStep = await this.approverListRepo
      .createQueryBuilder('approver')
      .where('approver.request_employee_id = :requestEmployeeId', {requestEmployeeId})
      .andWhere('approver.stepOrderAprrover > :stepOrderAprrover', {
        stepOrderAprrover: approver.stepOrderAprrover,
      })
      .andWhere('approver.statusApproval_id IS NULL')
      .getOne();

    approver.statusApproval_id = 1;
    approver.is_seen = 1;
    approver.updatedBy = employeeId;
    approver.updatedAt = new Date();
    await this.approverListRepo.save(approver);

    // lastStep = null => Đang ở bước cuối cùng và ko có bước nào sau nó
    if (lastStep === null) {
      await this.requestEmployeeService.updateFinalStatusApproval({
        requestEmpId: requestEmployeeId,
      });
      if (approver?.requestEmp?.request.code == 'LAM_CONG') {
        const fields = JSON.parse(approver?.requestEmp.fields);
        const startDateTime = new Date(`${fields.date}T${fields.start_time}:00`).getTime();
        const endDateTime = new Date(`${fields.date}T${fields.end_time}:00`).getTime();
        const diffHours = (endDateTime - startDateTime) / (1000 * 60 * 60);
        await this.attendanceRepo.update({_id: approver?.attendanceId?.attendanceId}, {overtime: diffHours});
      }
    }

    return {
      message: 'Yêu cầu đã được duyệt',
      data: approver,
    };
  }

  async updateStatusApproval(approverId: number) {
    const approver = await this.approverListRepo.findOne({
      where: {_id: approverId},
      select: {
        _id: true,
        request_employee_id: true,
        employee_id: true,
        stepOrderAprrover: true,
        statusApproval_id: true,
        is_seen: true,
      },
    });
    if (!approver) {
      throw new NotFoundException('Yêu cầu không tồn tại');
    }
    approver.statusApproval_id = 1;
    approver.is_seen = 1;
    approver.updatedBy = approver.employee_id;
    approver.updatedAt = new Date();
    await this.approverListRepo.save(approver);
  }

  async countPendingApprovals(employeeId: number) {
    if (!employeeId) {
      return {
        message: 'Không tìm thấy yêu cầu cần duyệt',
        data: {count: 0},
      };
    }
    const count = await this.approverListRepo
      .createQueryBuilder('approver')
      .leftJoin(
        'approver_list',
        'prev_approver',
        `prev_approver.request_employee_id = approver.request_employee_id
          AND prev_approver.stepOrderAprrover < approver.stepOrderAprrover`,
      )
      .leftJoin('request_employee', 'req', 'req._id = approver.request_employee_id')
      .where('approver.employee_id = :employeeId', {employeeId})
      .andWhere('approver.statusApproval_id IS NULL')
      .andWhere('req.isDeleted = 0')
      .groupBy('approver._id')
      .having('COUNT(prev_approver._id) = COUNT(prev_approver.statusApproval_id)')
      .getCount();
    return {
      message: 'Lấy số lượng yêu cầu cần duyệt thành công',
      data: {count},
    };
  }

  async findApproverRecord({approverId, employeeId, requestEmployeeId}: ApproveRequestDto) {
    const approver = await this.approverListRepo.findOne({
      where: {_id: approverId, request_employee_id: requestEmployeeId, employee_id: employeeId},
      select: {
        _id: true,
        request_employee_id: true,
        employee_id: true,
        stepOrderAprrover: true,
        statusApproval_id: true,
        is_seen: true,
        requestEmp: {
          fields: true,
          request: {
            name: true,
            code: true,
          },
        },
      },
      relations: {
        requestEmp: {
          request: true,
        },
      },
    });

    const attendanceId = await this.attendanceReqRepo.findOne({
      where: {requestEmpId: requestEmployeeId},
      select: {
        attendanceId: true,
      },
    });
    return {...approver, attendanceId};
  }

  async findApproverListByRequestEmpId(requestEmpId: number) {
    const approverList = await this.approverListRepo.find({
      where: {request_employee_id: requestEmpId},
      select: {
        _id: true,
        request_employee_id: true,
        employee_id: true,
        stepOrderAprrover: true,
        statusApproval_id: true,
        is_seen: true,
      },
    });
    return approverList;
  }

  async findApproverListByRequestEmpIdAnyEmpId({requestEmpId, employeeId}: {requestEmpId: number; employeeId: number}) {
    const approverList = await this.approverListRepo.findOne({
      where: {request_employee_id: requestEmpId, employee_id: employeeId},
      select: {
        _id: true,
        request_employee_id: true,
        employee_id: true,
        stepOrderAprrover: true,
        statusApproval_id: true,
        is_seen: true,
      },
    });
    return approverList;
  }

  async hasApprovedRequest(requestEmpId: number) {
    const approvedCount = await this.approverListRepo
      .createQueryBuilder('approver')
      .where('approver.request_employee_id = :requestEmpId', {requestEmpId})
      .andWhere('approver.statusApproval_id = 1')
      .getCount();
    // Nếu approvedCount > 0 tức là có ít nhất một người đã duyệt
    return approvedCount > 0;
  }
}
