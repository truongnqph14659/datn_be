import {Injectable} from '@nestjs/common';
import {CreateEmpImageDto} from './dto/create-emp-image.dto';
import {UpdateEmpImageDto} from './dto/update-emp-image.dto';

@Injectable()
export class EmpImagesService {
  create(createEmpImageDto: CreateEmpImageDto) {
    return 'This action adds a new empImage';
  }

  findAll() {
    return `This action returns all empImages`;
  }

  findOne(id: number) {
    return `This action returns a #${id} empImage`;
  }

  update(id: number, updateEmpImageDto: UpdateEmpImageDto) {
    return `This action updates a #${id} empImage`;
  }

  remove(id: number) {
    return `This action removes a #${id} empImage`;
  }
}
