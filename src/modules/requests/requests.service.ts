import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {RequestEntity} from 'src/modules/requests/entities/request.entity';
import {Repository} from 'typeorm';

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(RequestEntity)
    private requestRepo: Repository<RequestEntity>,
  ) {}

  async findAll() {
    const requests = await this.requestRepo
      .createQueryBuilder('requests')
      .select(['requests._id', 'requests.name', 'requests.code', 'requests.desc', 'requests.fields'])
      .getMany();

    const formattedRequests = requests.map((request) => ({
      ...request,
      fields: request.fields ? JSON.parse(request.fields) : null,
    }));

    return {
      message: 'Lấy danh sách yêu cầu thành công',
      data: formattedRequests,
    };
  }

  // REPOSITORIES
  async findRequestById(id: number) {
    const request = await this.requestRepo.findOne({
      where: {_id: id},
      select: {
        _id: true,
        name: true,
        code: true,
        desc: true,
        fields: true,
      },
    });
    return request;
  }
}
