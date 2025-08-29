import {Body, Controller, Delete, Get, Param, Patch, Post, Query} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';
import {FilterCommonCode} from 'src/modules/common-code/dto/filter-common.dto';
import {CommonCodeService} from './common-code.service';
import {CreateCommonCodeDto} from './dto/create-common-code.dto';
import {UpdateCommonCodeDto} from './dto/update-common-code.dto';

@ApiTags('common-code')
@Controller('common-code')
export class CommonCodeController {
  constructor(private readonly commonCodeService: CommonCodeService) {}

  @Post()
  create(@Body() createCommonCodeDto: CreateCommonCodeDto) {
    return this.commonCodeService.create(createCommonCodeDto);
  }

  @Get()
  findAll(@Query() filter: FilterCommonCode) {
    return this.commonCodeService.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.commonCodeService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCommonCodeDto: UpdateCommonCodeDto) {
    return this.commonCodeService.update(+id, updateCommonCodeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.commonCodeService.remove(+id);
  }
}
