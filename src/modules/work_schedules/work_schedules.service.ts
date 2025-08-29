import {BadRequestException, Injectable} from '@nestjs/common';
import {CreateWorkScheduleDto} from './dto/create-work_schedule.dto';
import {UpdateWorkScheduleDto} from './dto/update-work_schedule.dto';
import {Request, Response} from 'express';
import * as ExcelJS from 'exceljs';
import {format} from 'date-fns';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeEntity } from '../employee/entities/employee.entity';

@Injectable()
export class WorkSchedulesService {

   constructor(
      @InjectRepository(EmployeeEntity)
      private employeeRepo: Repository<EmployeeEntity>,
    ) {}

  create(createWorkScheduleDto: CreateWorkScheduleDto) {
    return 'This action adds a new workSchedule';
  }

  findAll() {
    return `This action returns all workSchedules`;
  }

  findOne(id: number) {
    return `This action returns a #${id} workSchedule`;
  }

  update(id: number, updateWorkScheduleDto: UpdateWorkScheduleDto) {
    return `This action updates a #${id} workSchedule`;
  }

  remove(id: number) {
    return `This action removes a #${id} workSchedule`;
  }

  async exportEmployeeWorkScheduleExcel(params: any, res: Response) {
    try {
      const query = this.employeeRepo
      .createQueryBuilder('employee')
      .leftJoin('employee.workScheduled','workScheduled')
      .leftJoin('employee.department','department')
      .select([
        'employee._id AS emp_id',
        'employee.name AS name',
        'department.name_depart AS department_name',
        'workScheduled.shiftStart AS shift_start',
        'workScheduled.shiftEnd AS shift_end',
        'workScheduled.break_time AS break_time',
      ])

      if (params.search) {
        const { department=null, role_id=null, employee_id=null } = params.search;
        if (department) {
          query.andWhere('employee.deprId = :department', { department });
        }

        if (role_id) {
          query.andWhere('employee.roleId = :role_id', { role_id });
        }

        if (employee_id ) {
          query.andWhere('employee._id = :employee_id', { employee_id });
        }
      }

      const dataEmplyeeWorkSchedule = await query.getRawMany();
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Lịch làm việc');
      // Định nghĩa các cột
      const columns = [
        {header: 'Mã nhân viên', key: 'emp_id', width: 10},
        {header: 'Tên nhân viên', key: 'name', width: 25},
        {header: 'Phòng ban', key: 'department_name', width: 25},
        {header: 'Thời gian bắt đầu', key: 'shift_start', width: 15},
        {header: 'Thời gian kết thúc', key: 'shift_end', width: 15},
        {header: 'Thời gian nghỉ (min)', key: 'break_time', width: 15},
      ];
      worksheet.columns = columns;
      // Tính chữ cột cuối cùng để merge cell đúng
      const lastColLetter = worksheet.getColumn(columns.length).letter;
      // Title
      worksheet.mergeCells(`A1:${lastColLetter}1`);
      const titleRow = worksheet.getRow(1);
      titleRow.getCell(1).value = 'LỊCH LÀM VIỆC';
      titleRow.getCell(1).font = {size: 16, bold: true};
      titleRow.getCell(1).alignment = {horizontal: 'center'};
      titleRow.height = 25;
      // Thời gian xuất báo cáo
      const headerRow1 = worksheet.getRow(2);
      // Header chính
      headerRow1.getCell(1).value = 'Mã nhân viên';
      headerRow1.getCell(2).value = 'Tên nhân viên';
      headerRow1.getCell(3).value = 'Phòng ban';
      headerRow1.getCell(4).value = 'Thời gian bắt đầu';
      headerRow1.getCell(5).value = 'Thời gian kết thúc';
      headerRow1.getCell(6).value = 'Thời gian nghỉ (min)';

      [headerRow1].forEach((row) => {
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
      headerRow1.height = 30;
      // Total Row
      // Dữ liệu workSchedule
      dataEmplyeeWorkSchedule.forEach((v) => {
        const rowData = [
          v.emp_id,
          v.name,
          v.department_name,
          v.shift_start,
          v.shift_end,
          v.break_time
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
}
