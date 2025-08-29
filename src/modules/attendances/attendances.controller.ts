import {Controller, Get, Query, Req, Res} from '@nestjs/common';
import {ApiOperation, ApiResponse} from '@nestjs/swagger';
import {Request, Response} from 'express';
import {QueryAttendanceDto} from 'src/modules/attendances/dto/query-attendance.dto';
import {AttendancesService} from './attendances.service';

@Controller('attendances')
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}
  @Get()
  @ApiOperation({summary: 'Lấy bảng chấm công của nhân viên'})
  @ApiResponse({status: 200, description: 'Thành công'})
  getAttendances(@Query() paramsQuery: QueryAttendanceDto, @Req() req: Request) {
    if (req.user && (req.user as any)?.roles?.name === 'Admin') {
      return this.attendancesService.findAll(paramsQuery);
    } else {
      return this.attendancesService.findOne(paramsQuery);
    }
  }

  @Get('timekeeping')
  @ApiOperation({summary: 'Lấy thống kê chấm công theo tháng và năm'})
  @ApiResponse({status: 200, description: 'Thành công'})
  async getTimekeepingStatistics(@Query() paramsQuery: QueryAttendanceDto, @Req() req: Request) {
    if (req.user && (req.user as any)?.roles?.name === 'Admin') {
      return this.attendancesService.getTimekeepingStatistics(paramsQuery);
    } else {
      return this.attendancesService.getTimekeepingStatisticsByEmployeeId(paramsQuery);
    }
  }

  @Get('/fake-data')
  generateFakeData() {
    return this.attendancesService.generateFakeData();
  }

  @Get('export-excel')
  exportExcel(@Query() params: QueryAttendanceDto, @Res() res: Response, @Req() req: Request) {
    const isAdmin = req.user && (req.user as any)?.roles?.name === 'Admin';
    return this.attendancesService.exportTimekeepingStatisticsExcel(params, res, isAdmin);
  }
}
