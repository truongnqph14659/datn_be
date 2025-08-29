import {PartialType} from '@nestjs/swagger';
import {CreateAttendancesRequestDto} from './create-attendances_request.dto';

export class UpdateAttendancesRequestDto extends PartialType(CreateAttendancesRequestDto) {}
