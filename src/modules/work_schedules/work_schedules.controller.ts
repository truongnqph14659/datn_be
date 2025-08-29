import {Controller, Get, Post, Body, Patch, Param, Delete, Query, Res, Req} from '@nestjs/common';
import {Request, Response} from 'express';
import {WorkSchedulesService} from './work_schedules.service';
import {CreateWorkScheduleDto} from './dto/create-work_schedule.dto';
import {UpdateWorkScheduleDto} from './dto/update-work_schedule.dto';

@Controller('work-schedules')
export class WorkSchedulesController {
  constructor(private readonly workSchedulesService: WorkSchedulesService) {}

  @Post()
  create(@Body() createWorkScheduleDto: CreateWorkScheduleDto) {
    return this.workSchedulesService.create(createWorkScheduleDto);
  }

  @Get('export-excel')
  exportEmployeeWorkScheduleExcel(@Query() params: any, @Res() res: Response) {
    return this.workSchedulesService.exportEmployeeWorkScheduleExcel(params, res);
  }

  @Get()
  findAll() {
    return this.workSchedulesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workSchedulesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWorkScheduleDto: UpdateWorkScheduleDto) {
    return this.workSchedulesService.update(+id, updateWorkScheduleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workSchedulesService.remove(+id);
  }
}
