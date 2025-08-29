import {IsSkipAuth} from 'src/modules/auth/is-skip-auth.decorator';
import {Body, Controller, Delete, Get, Param, Post, Query, Request, UseInterceptors} from '@nestjs/common';
import {AnyFilesInterceptor} from '@nestjs/platform-express';
import {ApiTags} from '@nestjs/swagger';
import {ParamIdDto} from 'src/shared/dto/common.dto';
import {QuerySpecificationDto} from 'src/shared/dto/query-specification.dto';
import {CreateEmployeeDto} from './dto/create-employee.dto';
import {EmployeeService} from './employee.service';

@ApiTags('employee')
@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  async create(@Body() createEmployeeDto: CreateEmployeeDto, @Request() req: Request) {
    return this.employeeService.create(createEmployeeDto, req);
  }

  @Post('update-emp')
  @UseInterceptors(AnyFilesInterceptor())
  async updateEmp(@Body() updateEmployeeDto: any, @Request() req: Request) {
    return this.employeeService.updateEmpInfo(updateEmployeeDto, req);
  }

  @Post('schedule')
  async updateWorkSchedule(@Body() dataEmployeeSchedule: any, @Request() req: Request) {
    return this.employeeService.updateEmpWorkSchedule(dataEmployeeSchedule, req);
  }

  @Delete(':id')
  remove(@Param() params: ParamIdDto) {
    return this.employeeService.remove(params.id);
  }

  @Get()
  findAll(@Query() paramsQuery: QuerySpecificationDto, @Request() req: Request) {
    return this.employeeService.findAll(paramsQuery, req);
  }

  @IsSkipAuth()
  @Get('cam-stores')
  findAllForCamera() {
    return this.employeeService.findAllForCamera();
  }

  @Get('organization-chart')
  getOrganizationChart(@Request() req: Request) {
    return this.employeeService.getOrganizationChart(req);
  }

  @Get(':id')
  findOne(@Param() params: ParamIdDto) {
    return this.employeeService.findOne(params.id);
  }
}
