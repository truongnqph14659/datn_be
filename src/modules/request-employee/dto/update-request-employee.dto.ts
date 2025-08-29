import {PartialType} from '@nestjs/swagger';
import {CreateRequestEmployeeDto} from './create-request-employee.dto';

export class UpdateRequestEmployeeDto extends PartialType(CreateRequestEmployeeDto) {}
