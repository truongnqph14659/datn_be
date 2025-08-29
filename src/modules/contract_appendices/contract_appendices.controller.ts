import {Controller, Get, Post, Body, Patch, Param, Delete} from '@nestjs/common';
import {ContractAppendicesService} from './contract_appendices.service';
import {CreateContractAppendiesDto} from './dto/create-contract_appendices.dto';
import {UpdateContractAppendicesDto} from './dto/update-contract_appendices.dto';

@Controller('contract-appendices')
export class ContractAppendicesController {
  constructor(private readonly contractAppendicesService: ContractAppendicesService) {}

  @Post()
  create(@Body() CreateContractAppendiesDto: CreateContractAppendiesDto) {
    return this.contractAppendicesService.create(CreateContractAppendiesDto);
  }

  @Get()
  findAll() {
    return this.contractAppendicesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contractAppendicesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() UpdateContractAppendicesDto: UpdateContractAppendicesDto) {
    return this.contractAppendicesService.update(+id, UpdateContractAppendicesDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contractAppendicesService.remove(+id);
  }
}
