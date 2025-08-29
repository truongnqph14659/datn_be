import {Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {RequestReferencesEntity} from 'src/modules/request_references/entities/request_reference.entity';
import {QuerySpecificationDto} from 'src/shared/dto/query-specification.dto';
import {Repository} from 'typeorm';

@Injectable()
export class RequestReferencesService {
  constructor(
    @InjectRepository(RequestReferencesEntity)
    private requestReferenceRepo: Repository<RequestReferencesEntity>,
  ) {}

  async createManyRequestReference(
    data: {
      request_employee_id: number;
      employee_id: number;
      is_seen: number;
      createdBy: number;
      updatedBy: number;
    }[],
  ) {
    const requestReferenceEntities = this.requestReferenceRepo.create(
      data.map((item) => ({
        requestEmployeeId: item.request_employee_id,
        employeeId: item.employee_id,
        is_seen: item.is_seen,
        createdBy: item.createdBy,
        updatedBy: item.updatedBy,
      })),
    );
    await this.requestReferenceRepo.save(requestReferenceEntities);
  }

  async getRequestReferencesByUser({
    userId,
    query: {page = 1, limit = 10},
  }: {
    userId: number;
    query: QuerySpecificationDto;
  }) {
    const query = this.requestReferenceRepo
      .createQueryBuilder('req_ref')
      .leftJoin('request_employee', 'req', 'req._id = req_ref.requestEmployeeId')
      .leftJoin('employees', 'emp', 'emp._id = req.employee_id')
      .leftJoin('requests', 'request', 'request._id = req.request_id')
      .where('req_ref.employeeId = :employeeId', {employeeId: userId})
      .select([
        'req_ref._id AS req_ref_id',
        'req_ref.requestEmployeeId AS request_employee_id',
        'req_ref.is_seen AS is_seen',
        'req_ref.employeeId AS req_ref_employee_id',
        'req.fields AS fields',
        'emp.name AS requester',
        'request.name AS request_type',
        'request.code AS request_code',
      ])
      .orderBy('req_ref.updatedAt', 'DESC');

    const [total, approvedRequests] = await Promise.all([
      query.getCount(),
      query
        .limit(limit)
        .offset((page - 1) * limit)
        .getRawMany(),
    ]);

    const formattedResults = approvedRequests.map((item) => ({
      ...item,
      fields: JSON.parse(item.fields || '{}'),
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      message: 'Danh sách CC/References thành công',
      data: formattedResults,
      meta: {
        page,
        limit,
        totalItems: total,
        totalPages,
      },
    };
  }

  async markAsSeen(referenceId: number, employeeId: number) {
    const reference = await this.requestReferenceRepo.findOne({
      where: {_id: referenceId, employeeId: employeeId},
    });

    if (!reference) {
      throw new NotFoundException('Không tìm thấy tham chiếu');
    }

    reference.is_seen = 1;
    await this.requestReferenceRepo.save(reference);

    return {
      message: 'Đánh dấu đã xem thành công',
      data: reference,
    };
  }

  async countUnseenReferences(employeeId: number) {
    if (!employeeId) {
      return 0;
    }
    const count = await this.requestReferenceRepo
      .createQueryBuilder('req_ref')
      .where('req_ref.employeeId = :employeeId', {employeeId})
      .andWhere('req_ref.is_seen = 0')
      .getCount();
    return {
      message: 'Lấy số lượng tham chiếu chưa xem thành công',
      data: {count},
    };
  }
}
