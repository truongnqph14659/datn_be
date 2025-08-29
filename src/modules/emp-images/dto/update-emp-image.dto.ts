import {PartialType} from '@nestjs/swagger';
import {CreateEmpImageDto} from './create-emp-image.dto';

export class UpdateEmpImageDto extends PartialType(CreateEmpImageDto) {}
