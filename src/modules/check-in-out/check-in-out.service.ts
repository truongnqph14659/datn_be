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
      const checkInOut = queryRunner.manager.create(CheckInOutEntity, {
        ...payload,
        createdBy: payload.employee_id,
        updatedBy: payload.employee_id,
        url_image: dataInit ? dataInit[0]?.url_image : '',
      });
      const savedCheckInOut = await queryRunner.manager.save(checkInOut);
      await this.eventEmitter.emitAsync('check-in-out.created', {
        manager: queryRunner.manager,
        employeeId: payload.employee_id,
        workDate: payload.datetime,
      });
      await queryRunner.commitTransaction();
      return {
        message: 'Thêm mới check-in/out thành công',
        data: savedCheckInOut,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Error Handler');
    } finally {
      await queryRunner.release();
    }
  }

  // REPOSITORIES

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
