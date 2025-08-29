import {PartialType} from '@nestjs/swagger';
import {CreateWorkScheduleDto} from './create-work_schedule.dto';

export class UpdateWorkScheduleDto extends PartialType(CreateWorkScheduleDto) {}
