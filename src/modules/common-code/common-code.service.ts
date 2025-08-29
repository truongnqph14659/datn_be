import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {FilterCommonCode} from 'src/modules/common-code/dto/filter-common.dto';
import {CommonCodeEntity} from 'src/modules/common-code/entities/common-code.entity';
import {Repository} from 'typeorm';
import {CreateCommonCodeDto} from './dto/create-common-code.dto';
import {UpdateCommonCodeDto} from './dto/update-common-code.dto';

@Injectable()
export class CommonCodeService {
  constructor(
    @InjectRepository(CommonCodeEntity)
    private readonly commonRepo: Repository<CommonCodeEntity>,
  ) {}

  create(createCommonCodeDto: CreateCommonCodeDto) {
    return 'This action adds a new commonCode';
  }

  async findAll({type_code}: FilterCommonCode) {
    try {
      const result = await this.commonRepo.find({
        where: {
          type_code,
        },
      });

      return {
        message: 'Lấy code thành công',
        data: result,
      };
    } catch (error) {
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} commonCode`;
  }

  update(id: number, updateCommonCodeDto: UpdateCommonCodeDto) {
    return `This action updates a #${id} commonCode`;
  }

  remove(id: number) {
    return `This action removes a #${id} commonCode`;
  }
}
