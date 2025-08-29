import {Controller, Get, Post, Body, Patch, Param, Delete} from '@nestjs/common';
import {EmpImagesService} from './emp-images.service';
import {CreateEmpImageDto} from './dto/create-emp-image.dto';
import {UpdateEmpImageDto} from './dto/update-emp-image.dto';

@Controller('emp-images')
export class EmpImagesController {
  constructor(private readonly empImagesService: EmpImagesService) {}

  @Post()
  create(@Body() createEmpImageDto: CreateEmpImageDto) {
    return this.empImagesService.create(createEmpImageDto);
  }

  @Get()
  findAll() {
    return this.empImagesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.empImagesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEmpImageDto: UpdateEmpImageDto) {
    return this.empImagesService.update(+id, updateEmpImageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.empImagesService.remove(+id);
  }
}
