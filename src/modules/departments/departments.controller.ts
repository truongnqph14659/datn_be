import {Controller, Get, Post, Body, Patch, Param, Delete, Query} from '@nestjs/common';
import {DepartmentsService} from './departments.service';
import {CreateDepartmentDto} from './dto/create-department.dto';
import {UpdateDepartmentDto} from './dto/update-department.dto';
import {ApiOperation, ApiResponse, ApiTags} from '@nestjs/swagger';
import {QuerySpecificationDto} from 'src/shared/dto/query-specification.dto';

@ApiTags('departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Get()
  @ApiOperation({summary: 'Lấy danh sách phòng ban'})
  @ApiResponse({status: 200, description: 'Thành công'})
  findAll(@Query() paramsQuery: QuerySpecificationDto) {
    return this.departmentsService.findAll(paramsQuery);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDepartmentDto: UpdateDepartmentDto) {
    return this.departmentsService.update(+id, updateDepartmentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.departmentsService.remove(+id);
  }
}
