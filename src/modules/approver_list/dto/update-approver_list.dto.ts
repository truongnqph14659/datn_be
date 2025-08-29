import { PartialType } from '@nestjs/swagger';
import { CreateApproverListDto } from './create-approver_list.dto';

export class UpdateApproverListDto extends PartialType(CreateApproverListDto) {}
