import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {ContractsService} from './contracts.service';
import {CreateContractDto} from './dto/create-contract.dto';
import {UpdateContractDto} from './dto/update-contract.dto';
import {QuerySpecificationDto} from 'src/shared/dto/query-specification.dto';
import {AnyFilesInterceptor} from '@nestjs/platform-express';
import axios from 'axios';
import * as FormData from 'form-data';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  create(@Body() createContractDto: CreateContractDto) {
    return this.contractsService.create(createContractDto);
  }

  @Get()
  findAll(@Query() paramsQuery: QuerySpecificationDto) {
    return this.contractsService.findAll(paramsQuery);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contractsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateContractDto: UpdateContractDto) {
    return this.contractsService.update(+id, updateContractDto);
  }

  @Post('/upload-file')
  @UseInterceptors(AnyFilesInterceptor())
  uploadContractFile(@Req() req: Request, @Body() createContractDto: any) {
    return this.contractsService.createContractFile(req, createContractDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contractsService.remove(+id);
  }
}
