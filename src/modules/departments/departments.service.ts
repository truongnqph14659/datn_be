import {Injectable} from '@nestjs/common';
import {CreateDepartmentDto} from './dto/create-department.dto';
import {UpdateDepartmentDto} from './dto/update-department.dto';
import {QuerySpecificationDto} from 'src/shared/dto/query-specification.dto';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {DepartmentEntity} from 'src/modules/departments/entities/department.entity';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(DepartmentEntity)
    private departmentRepo: Repository<DepartmentEntity>,
  ) {}

  create(createDepartmentDto: CreateDepartmentDto) {
    return 'This action adds a new department';
  }
  async findAll(params: QuerySpecificationDto) {
    const {limit = 10, page = 1, disablePagination = true} = params;
    const query = this.departmentRepo
      .createQueryBuilder('departments')
      .innerJoin('departments.company', 'company')
      .leftJoin('departments.employee', 'employee')
      .select([
        'departments._id',
        'departments.name_depart',
        'employee.email',
        // 'departments.emp',
        'departments.companyId',
        // Company information
        'company._id',
        'company.company_name',
      ])
    // Handle search
    if (params.search) {
      query.andWhere('(departments.name_depart LIKE :search OR company.company_name LIKE :search)', {
        search: `%${params.search}%`,
      });
    }

    // Handle sorting
    if (params.sort) {
      const sortString = Array.isArray(params.sort) ? params.sort[0] : params.sort;
      const [sortField, sortOrder] = sortString.split(':');
      if (sortField && sortOrder) {
        query.orderBy(`departments.${sortField}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
      }
    } else {
      query.orderBy('departments._id', 'DESC');
    }

    if (params.filter?.companyId) {
      query.andWhere('departments.companyId = :companyId', {companyId: params.filter.companyId});
    }

    // Handle pagination
    if (!disablePagination) {
      query.skip((page - 1) * limit).take(limit);
    }

    const [data, total] = await query.getManyAndCount();
    const totalPage = Math.ceil(total / limit);

    const transformedData = data.map((department) => {
      const company = department.company
        ? {
            _id: department.company._id,
            company_name: department.company.company_name,
          }
        : null;

      const plainDepartment = {...department};
      delete plainDepartment.company;
      return {
        ...plainDepartment,
        company,
      };
    });

    return {
      message: 'Lấy danh sách phòng ban thành công',
      data: transformedData,
      meta: {
        page,
        limit,
        totalItems: total,
        totalPage,
      },
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} department`;
  }

  update(id: number, updateDepartmentDto: UpdateDepartmentDto) {
    return `This action updates a #${id} department`;
  }

  remove(id: number) {
    return `This action removes a #${id} department`;
  }
}
