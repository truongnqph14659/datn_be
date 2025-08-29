import {Controller, Get, Param} from '@nestjs/common';
import {AttendancesRequestsService} from './attendances_requests.service';

@Controller('attendances-requests')
export class AttendancesRequestsController {
  constructor(private readonly attendancesRequestsService: AttendancesRequestsService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attendancesRequestsService.findOne(+id);
  }
}
