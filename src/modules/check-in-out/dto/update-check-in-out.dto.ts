import {PartialType} from '@nestjs/swagger';
import {CreateCheckInOutDto} from './create-check-in-out.dto';

export class UpdateCheckInOutDto extends PartialType(CreateCheckInOutDto) {}
