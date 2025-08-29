import {Roles} from './../auth/roles.decorator';
import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {ContractAppencicesEntity} from 'src/modules/contract_appendices/entities/contract_appendices.entity';
import {ContractEntity} from 'src/modules/contracts/entities/contract.entity';
import {EmpImageEntity} from 'src/modules/emp-images/entities/emp-image.entity';
import {EmployeeEntity} from 'src/modules/employee/entities/employee.entity';
import {WorkScheduleEntity} from 'src/modules/work_schedules/entities/work_schedule.entity';
import {QuerySpecificationDto} from 'src/shared/dto/query-specification.dto';
import {Repository, ReturnDocument} from 'typeorm';
import {CreateEmployeeDto} from './dto/create-employee.dto';
import {UpdateEmployeeDto} from './dto/update-employee.dto';
import {handleAndUploadFile} from 'src/utils/upload-files.util';
import {calculateWorkingHours, parseContractRange, parseWorkingTime} from 'src/utils/time-helper';
import {TYPE_UPDATE_WORK} from 'src/shared/constants/constant';
import {hasPassword} from 'src/utils/helper';
import {CommonCodeEntity} from '../common-code/entities/common-code.entity';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(EmployeeEntity)
    private employeeRepo: Repository<EmployeeEntity>,
    @InjectRepository(ContractEntity)
    private contractRepo: Repository<ContractEntity>,
    @InjectRepository(ContractAppencicesEntity)
    private contractAppendixRepo: Repository<ContractAppencicesEntity>,
    @InjectRepository(EmpImageEntity)
    private imageRepo: Repository<EmpImageEntity>,
    @InjectRepository(WorkScheduleEntity)
    private workScheduledRepo: Repository<WorkScheduleEntity>,
    @InjectRepository(CommonCodeEntity)
    private CommonCodeRepo: Repository<CommonCodeEntity>,
  ) {}

  async create(payload: any, req: Request) {
    const existedEmployee = await this.findEmployeeByEmail(payload.email);
    if (existedEmployee) {
      throw new BadRequestException('Email đã tồn tại');
    }
    const {startTime, endTime, hours} = parseWorkingTime(payload.time_working);
    const expected_hours = payload.break_time / 60;
    const avatarImg = [];
    const contractImg = [];
    const subContractImg = [];
    req['files'].forEach((file) => {
      switch (file.fieldname) {
        case 'files':
          avatarImg.push(file);
          break;
        case 'contract_files':
          contractImg.push(file);
          break;
        case 'sub_contract_files':
          subContractImg.push(file);
          break;
      }
    });
    req['files'] = avatarImg;
    const {data} = await handleAndUploadFile(req);
    const newEmployee: any = this.employeeRepo.create({
      name: payload.name,
      email: payload.email,
      roleId: payload.roleId,
      deprId: payload.deprId,
      id_no: payload.id_no,
      tax_no: payload.tax_no,
      address: payload.address,
      position_name: payload.position_name,
      password: payload.password,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req['user']?.id,
      updatedBy: req['user']?.id,
      start_working: new Date(),
    });
    await this.employeeRepo.save(newEmployee);
    const scheduleWorking = this.workScheduledRepo.create({
      employeeId: newEmployee._id,
      expected_hours: hours - expected_hours,
      shiftStart: startTime,
      shiftEnd: endTime,
      break_time: payload.break_time,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req['user']?.id,
      updatedBy: req['user']?.id,
    });
    await this.workScheduledRepo.save(scheduleWorking);
    if (avatarImg) {
      await this.imageRepo.save({
        image: data[0].url_image,
        employeeId: newEmployee._id,
      });
    }

    if (contractImg.length > 0) {
      req['files'] = contractImg;
      const {data} = await handleAndUploadFile(req);
      const {startDate, endDate} = parseContractRange(payload.contract_range_picker);
      const dataContract = this.contractRepo.create({
        contract_type: payload?.contract_type,
        start_date: startDate,
        end_date: endDate,
        note: payload.contract_note,
        employeeId: newEmployee._id,
        current_position: payload.position_name,
        url_contract: data[0].url_image,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: req['user']?.id,
        updatedBy: req['user']?.id,
      });
      await this.contractRepo.save(dataContract);
      if (subContractImg.length > 0 && contractImg.length > 0) {
        req['files'] = subContractImg;
        const {data} = await handleAndUploadFile(req);
        const newAppendix = this.contractAppendixRepo.create({
          contractId: dataContract._id,
          change_type: payload?.sub_contract_sub_type,
          note: payload?.sub_contract_note,
          url_sub_contract: data[0].url_image,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: req['user']?.id,
          updatedBy: req['user']?.id,
        });
        await this.contractAppendixRepo.save(newAppendix);
      }
    }
    return {
      message: 'Tạo mới nhân viên thành công',
      data: newEmployee,
    };
  }

  async updateEmpInfo(payload: any, req: Request) {
    const _idEmp = payload._id;
    const employee = await this.employeeRepo.findOneBy({_id: _idEmp});
    if (!employee) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }
    if (!payload.password) {
      payload.password = await hasPassword(payload.password);
    } else {
      console.log(employee);
      payload.password = employee.password;
    }

    if (req['user'].roles.name !== 'Admin') {
      await this.employeeRepo.update(
        {_id: _idEmp},
        {
          password: payload.password,
          updatedAt: new Date(),
          updatedBy: req['user']?.id,
        },
      );
      return {
        message: 'Cập nhật nhân viên thành công',
        data: await this.employeeRepo.findOneBy({_id: _idEmp}),
      };
    }
    // Nếu thay đổi email thì kiểm tra trùng
    if (payload.email && payload.email !== employee.email) {
      const existedEmployee = await this.findEmployeeByEmail(payload.email);
      if (existedEmployee.email !== payload.email) {
        throw new BadRequestException('Email không đúng!');
      }
    }

    const {startTime, endTime, hours} = parseWorkingTime(payload.time_working);
    const expected_hours = payload.break_time / 60;

    const avatarImg = [];
    const contractImg = [];
    const subContractImg = [];

    req['files']?.forEach((file) => {
      switch (file.fieldname) {
        case 'files':
          avatarImg.push(file);
          break;
        case 'contract_files':
          console.log(file);
          contractImg.push(file);
          break;
        case 'sub_contract_files':
          subContractImg.push(file);
          break;
      }
    });

    // Avatar
    if (avatarImg.length > 0) {
      req['files'] = avatarImg;
      const {data} = await handleAndUploadFile(req);
      // Cập nhật ảnh (hoặc insert nếu chưa có)
      const existImage = await this.imageRepo.findOneBy({employeeId: _idEmp});
      if (existImage) {
        existImage.image = data[0].url_image;
        await this.imageRepo.save(existImage);
      } else {
        await this.imageRepo.save({
          image: data[0].url_image,
          employeeId: payload._id,
        });
      }
    }
    // Cập nhật nhân viên
    await this.employeeRepo.update(
      {_id: _idEmp},
      {
        name: payload.name,
        email: payload.email,
        roleId: payload.roleId,
        deprId: payload.deprId,
        id_no: payload.id_no,
        tax_no: payload.tax_no,
        address: payload.address,
        position_name: payload.position_name,
        password: payload.password,
        updatedAt: new Date(),
        updatedBy: req['user']?.id,
      },
    );

    // Cập nhật thời gian làm việc
    const existSchedule = await this.workScheduledRepo.findOneBy({employeeId: _idEmp});
    if (existSchedule) {
      await this.workScheduledRepo.update(
        {_id: existSchedule._id},
        {
          expected_hours: hours - expected_hours,
          shiftStart: startTime,
          shiftEnd: endTime,
          break_time: payload.break_time,
          updatedAt: new Date(),
          updatedBy: req['user']?.id,
        },
      );
    } else {
      await this.workScheduledRepo.save({
        employeeId: payload._id,
        expected_hours: hours - expected_hours,
        shiftStart: startTime,
        shiftEnd: endTime,
        break_time: payload.break_time,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: req['user']?.id,
        updatedBy: req['user']?.id,
      });
    }

    // Cập nhật hợp đồng nếu có file mới
    if (contractImg.length > 0) {
      req['files'] = contractImg;
      const {data} = await handleAndUploadFile(req);
      const {startDate, endDate} = parseContractRange(payload.contract_range_picker);
      // tìm contract hiện tại
      let existingContract = await this.contractRepo.findOneBy({employeeId: _idEmp});
      if (existingContract) {
        await this.contractRepo.update(
          {employeeId: _idEmp, status: 'ACTIVE'},
          {
            status: 'EXPIRED',
            updatedAt: new Date(),
            updatedBy: req['user']?.id,
          },
        );
        existingContract = await this.contractRepo.save({
          contract_type: payload.contract_type,
          start_date: startDate,
          status: 'ACTIVE',
          end_date: endDate,
          note: payload.contract_note,
          current_position: payload.position_name,
          url_contract: data[0].url_image,
          employeeId: payload._id,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: req['user']?.id,
          updatedBy: req['user']?.id,
        });
      } else {
        existingContract = await this.contractRepo.save({
          contract_type: payload.contract_type,
          start_date: startDate,
          end_date: endDate,
          status: 'ACTIVE',
          note: payload.contract_note,
          url_contract: data[0].url_image,
          position_name: payload.position_name,
          employeeId: payload._id,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: req['user']?.id,
          updatedBy: req['user']?.id,
        });
      }
      // Nếu có phụ lục hợp đồng
      if (subContractImg.length > 0) {
        req['files'] = subContractImg;
        const {data} = await handleAndUploadFile(req);
        const newAppendix = this.contractAppendixRepo.create({
          contractId: existingContract?._id,
          change_type: payload?.sub_contract_sub_type,
          note: payload?.sub_contract_note,
          url_sub_contract: data[0].url_image,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: req['user']?.id,
          updatedBy: req['user']?.id,
        });
        await this.contractAppendixRepo.save(newAppendix);
      }
    }
    return {
      message: 'Cập nhật nhân viên thành công',
      data: await this.employeeRepo.findOneBy({_id: _idEmp}),
    };
  }

  async updateEmpWorkSchedule(payload: any, req: Request) {
    if (payload.type == TYPE_UPDATE_WORK.PERSONAL_UP) {
      const existedEmpWorkSchedule = await this.workScheduledRepo.findOne({
        where: {_id: payload.work_schedule_id, isDeleted: false, employeeId: payload.emp_id},
      });
      if (!existedEmpWorkSchedule) {
        throw new BadRequestException('không tìm thấy lịch');
      }
      const {startTime, endTime, hours} = parseWorkingTime(payload.time_working);
      const expected_hours = payload.breakTime / 60;
      const scheduleWorking = await this.workScheduledRepo.update(
        {
          _id: payload.workScheduleId,
        },
        {
          expected_hours: parseFloat((hours - expected_hours).toFixed(2)),
          shiftStart: startTime,
          shiftEnd: endTime,
          break_time: payload.breakTime,
          updatedAt: new Date(),
          updatedBy: req['user']?.id,
        },
      );
      return {
        message: 'Tạo mới nhân viên thành công',
        data: scheduleWorking,
      };
    }
    if (payload.type == TYPE_UPDATE_WORK.EXCEL_UP) {
      let isErrorSystem = false;
      const listEmployee = await this.workScheduledRepo.find();
      const listEmpId = new Set(listEmployee.map((emp) => emp.employeeId));
      for (let index = 0; index < payload?.data.length; index++) {
        if (!listEmpId.has(payload?.data[index].employeeId)) {
          isErrorSystem = true;
          break;
        }
      }
      if (isErrorSystem) {
        throw new BadRequestException('Check! Có mã nhân viên không tồn tại trên lịch làm việc!');
      }
      const updatePromises = payload?.data.map((workingTime) => {
        const expected_hours = calculateWorkingHours(
          workingTime.shiftStart,
          workingTime.shiftEnd,
          workingTime.breakTime,
        );
        return this.workScheduledRepo.update(
          {employeeId: workingTime.employeeId},
          {
            expected_hours: expected_hours,
            shiftStart: workingTime.shiftStart,
            shiftEnd: workingTime.shiftEnd,
            break_time: workingTime.breakTime,
            updatedAt: new Date(),
            updatedBy: req['user']?.id,
          },
        );
      });
      await Promise.all(updatePromises);
      return {
        message: 'Cập nhật lịch làm việc thành công!',
        data: [],
      };
    }
  }

  async remove(id: number) {
    const employee = await this.findEmployeeById(id);
    if (!employee) {
      throw new NotFoundException('Nhân viên không tồn tại');
    }
    await this.employeeRepo.update(id, {isDeleted: true});
    return {
      message: 'Xóa nhân viên thành công',
      data: null,
    };
  }

  async findAll(params: QuerySpecificationDto, req: Request) {
    const user = req['user'];
    const {limit = 10, page = 1, disablePagination = true} = params;
    const query = this.employeeRepo
      .createQueryBuilder('employees')
      .innerJoin('employees.department', 'department')
      .innerJoin('department.company', 'company')
      .leftJoin('employees.contract', 'contract')
      .leftJoin('employees.images', 'images')
      .leftJoin('contract.contract_appendices', 'contract_appendices')
      .leftJoin('employees.workScheduled', 'workScheduled')
      .where('employees.isDeleted = 0')
      .select([
        'employees._id',
        'employees.name',
        'employees.email',
        'employees.roleId',
        'employees.start_working',
        'employees.end_working',
        'employees.status',
        'employees.isActive',
        'employees.id_no',
        'employees.tax_no',
        'employees.address',
        'employees.position_name',
        // Chọn các cột từ bảng departments
        'department._id',
        'department.name_depart',
        // Chọn các cột từ bảng companies
        'company.company_name',
        // chọn các cột từ bảng contact
        'contract._id',
        'contract.contract_type',
        'contract.start_date',
        'contract.end_date',
        'contract.status',
        'contract.note',
        'contract.url_contract',
        'contract.createdAt',
        'contract.current_position',
        // Chọn các cột từ contract_appendices
        'contract_appendices._id',
        'contract_appendices.change_type',
        'contract_appendices.note',
        'contract_appendices.url_sub_contract',
        //chọn các cột từ workScheduled
        'workScheduled._id',
        'workScheduled.expected_hours',
        'workScheduled.shiftStart',
        'workScheduled.shiftEnd',
        'workScheduled.status',
        'workScheduled.break_time',
        //chọn cột từ bẳng images
        'images._id',
        'images.image',
      ])
      .orderBy('employees.createdAt', 'DESC');
    if (user.roles.name !== 'Admin') {
      query.andWhere('(employees._id = :id)', {id: user.id});
    }
    if (params.search && user.roles.name === 'Admin') {
      const {department = null, role_id = null, employee_id = null} = params.search;
      if (department) {
        query.andWhere('employees.deprId = :department', {department});
      }
      if (role_id) {
        query.andWhere('employees.roleId = :role_id', {role_id});
      }
      if (employee_id) {
        query.andWhere('employees._id = :employee_id', {employee_id});
      }
    }
    if (!disablePagination) {
      query.skip((page - 1) * limit).take(limit);
      query.take(limit);
    }
    const getListCommondCode = await this.CommonCodeRepo.find({
      where: {type_code: 'TYPE_CONTRACT'},
    });
    const [data, total] = await query.getManyAndCount();
    const handleData = data.map((emp) => {
      return {
        ...emp,
        contract: emp?.contract?.map((contract) => {
          return {
            ...contract,
            contract_commond: getListCommondCode.find((type_contract) => type_contract.code == contract?.contract_type),
          };
        }),
      };
    });

    const totalPage = Math.ceil(total / limit);
    return {
      message: 'Lấy danh sách nhân viên thành công',
      data: handleData,
      meta: {
        page,
        limit,
        totalItems: total,
        totalPage,
      },
    };
  }

  async findOne(id: number) {
    const employee = await this.findEmployeeById(id);
    if (!employee) {
      throw new NotFoundException('Nhân viên không tồn tại');
    }
    return {
      message: 'Lấy thông tin nhân viên thành công',
      data: employee,
    };
  }

  async getOrganizationChart(req: Request) {
    const user = req['user'];
    const query = this.employeeRepo
      .createQueryBuilder('employees')
      .select([
        'employees._id',
        'employees.name',
        'employees.email',
        'employees.position_name',
        // Chọn các cột từ bảng departments
        'department._id',
        'department.name_depart',
        'department.companyId',
        // Chọn các cột từ bảng companies
        'company._id',
        'company.company_name',
      ])
      .leftJoin('employees.department', 'department')
      .leftJoin('department.company', 'company')
      .where('employees.isDeleted = 0 and employees._id <> :id', {id: user.id});
    const data = await query.getMany();
    const grouped = {};
    for (const user of data) {
      const department = user.department;
      const {_id, name_depart} = department;
      if (!grouped[_id]) {
        grouped[_id] = {
          id_depart: _id,
          name_depart,
          children: [],
        };
      }
      grouped[_id].children.push({
        _id: user._id,
        name: user.name,
        email: user.email,
        position_name: user.position_name,
        company: {
          _id: department.company._id,
          company_name: department.company.company_name,
        },
      });
    }
    return {
      message: 'Lấy danh sách nhân viên thành công',
      data: Object.values(grouped),
    };
  }

  // REPOSITORY METHODS
  async findEmployeeByEmail(email: string) {
    const query = this.employeeRepo
      .createQueryBuilder('employee')
      .innerJoin('employee.roles', 'roles')
      .leftJoin('roles.acls', 'role_acl')
      .innerJoin('role_acl.menu', 'menu')
      .where('employee.email = :email', {email})
      .andWhere('employee.isDeleted = :isDeleted', {isDeleted: false})
      .andWhere('employee.isActive = :isActive', {isActive: 1})
      .andWhere('role_acl.isView = :isView', {isView: 1})
      .select(['employee._id', 'employee.email', 'employee.name', 'employee.password', 'roles', 'role_acl', 'menu']);
    return query.getOne();
  }

  // find employee by id with relations roles
  // and role_permissions
  async findEmployeeByIdWithRoles(id: number) {
    // return this.employeeRepo.findOne({
    //   where: {
    //     _id: id,
    //     isDeleted: false,
    //     isActive: 1,
    //     roles: {
    //       role_permissions: {
    //         isDeleted: false,
    //       },
    //     },
    //   },
    //   relations: ['roles', 'roles.role_permissions'],
    //   select: ['_id', 'email', 'name', 'password', 'roles'],
    // });
    const query = this.employeeRepo
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.roles', 'roles')
      .leftJoinAndSelect(
        'roles.role_permissions',
        'role_permissions',
        'role_permissions.isDeleted = :rolePermissionsIsDeleted',
        {rolePermissionsIsDeleted: false},
      )
      .where('employee._id = :id', {id})
      .andWhere('employee.isDeleted = :isDeleted', {isDeleted: false})
      .andWhere('employee.isActive = :isActive', {isActive: 1})
      .select(['employee._id', 'employee.email', 'employee.name', 'employee.password', 'roles']);
    return query.getOne();
  }

  async findEmployeeById(id: number) {
    return this.employeeRepo.findOne({
      where: {_id: id, isDeleted: false},
      relations: ['roles', 'workScheduled', 'attendances'],
    });
  }

  async findEmployeeWithSchedule(id: number) {
    const employee = await this.employeeRepo
      .createQueryBuilder('employees')
      .select([
        'employees._id',
        'employees.name',
        'employees.email',
        'employees.roleId',
        'employees.start_working',
        'employees.end_working',
        'employees.status',
        'employees.isActive',
        // Work Schedule
        'workScheduled._id',
        'workScheduled.employeeId',
        'workScheduled.shiftStart',
        'workScheduled.shiftEnd',
        'workScheduled.expected_hours',
        'workScheduled.break_time',
      ])
      .leftJoin('employees.workScheduled', 'workScheduled', 'workScheduled.isDeleted = :isDeleted', {isDeleted: false})
      .where('employees._id = :id', {id})
      .andWhere('employees.isDeleted = :isDeleted', {isDeleted: false})
      .getOne();
    return employee;
  }

  async findAllForCamera() {
    const query = this.employeeRepo
      .createQueryBuilder('employees')
      .select(['employees._id', 'employees.name', 'img.image'])
      .leftJoin('employees.images', 'img')
      .where('employees.isDeleted = 0 and employees.isActive = 1');
    const [data, total] = await query.getManyAndCount();
    return {
      message: 'success',
      data: data,
    };
  }
}
