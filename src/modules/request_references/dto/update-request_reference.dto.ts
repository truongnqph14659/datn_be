import { PartialType } from '@nestjs/swagger';
import { CreateRequestReferenceDto } from './create-request_reference.dto';

export class UpdateRequestReferenceDto extends PartialType(CreateRequestReferenceDto) {}
