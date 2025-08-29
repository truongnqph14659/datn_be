import {PartialType} from '@nestjs/swagger';
import {CreateContractAppendiesDto} from './create-contract_appendices.dto';

export class UpdateContractAppendicesDto extends PartialType(CreateContractAppendiesDto) {}
