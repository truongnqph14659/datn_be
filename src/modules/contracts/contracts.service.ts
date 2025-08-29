import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {CreateContractDto} from './dto/create-contract.dto';
import {UpdateContractDto} from './dto/update-contract.dto';
import {QuerySpecificationDto} from 'src/shared/dto/query-specification.dto';
import {InjectRepository} from '@nestjs/typeorm';
import {ContractEntity} from './entities/contract.entity';
import {Repository} from 'typeorm';
import {EmployeeEntity} from '../employee/entities/employee.entity';
import {table} from 'console';
import {handleAndUploadFile} from 'src/utils/upload-files.util';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(ContractEntity)
    private contractRepo: Repository<ContractEntity>,
    @InjectRepository(EmployeeEntity)
    private employeeRepo: Repository<EmployeeEntity>,
  ) {}

  create(createContractDto: CreateContractDto) {
    return 'This action adds a new contract';
  }

  async createContractFile(req: Request, createContractDto: any) {
    try {
      const {data, message} = await handleAndUploadFile(req);
      // handle createContractDto
      return {
        message: message,
        data: data,
      };
    } catch (error) {
      throw new HttpException('upload error.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findAll(params: QuerySpecificationDto) {
    const {limit = 10, page = 1, disablePagination = true} = params;
    // const query = await this.contractRepo.query(`SELECT
    //     c._id as contractId,
    //     c.employeeId as emp_id,
    //     c.contract_type,
    //     c.note,
    //     c_app._id as contract_sub_id,
    //     c_app.change_type,
    //     c_app.url_sub_contract,
    //     c_app.note as note_sub
    //     FROM contracts c LEFT JOIN  contract_appendices c_app ON c._id = c_app.contractId`)
    const query = this.employeeRepo
      .createQueryBuilder('emp')
      .select([
        'contract.contract_type',
        'contract._id',
        'contract_sub.change_type',
        'contract_sub.url_sub_contract',
        'contract_sub._id',
        'emp.name',
        'emp.email',
        'emp.status',
        'emp.teamId',
      ])
      .leftJoin('emp.contract', 'contract')
      .leftJoin('contract.contract_appendices', 'contract_sub');

    const [data, total] = await query.getManyAndCount();
    return {
      message: 'Lấy danh sách contract thành công',
      data: data,
      totals: total,
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} contract`;
  }

  update(id: number, updateContractDto: UpdateContractDto) {
    return `This action updates a #${id} contract`;
  }

  remove(id: number) {
    return `This action removes a #${id} contract`;
  }
}
