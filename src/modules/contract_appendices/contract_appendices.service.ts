import {Injectable} from '@nestjs/common';
import {CreateContractAppendiesDto} from './dto/create-contract_appendices.dto';
import {UpdateContractAppendicesDto} from './dto/update-contract_appendices.dto';
import {Repository} from 'typeorm';
import {InjectRepository} from '@nestjs/typeorm';
import {ContractAppencicesEntity} from './entities/contract_appendices.entity';

@Injectable()
export class ContractAppendicesService {
  // constructor(
  //   @InjectRepository(ContractAppencicesEntity)
  //   private contractRepo: Repository<ContractAppencicesEntity>,
  // ) {}

  create(CreateContractAppendiesDto: CreateContractAppendiesDto) {
    return 'This action adds a new contractAppendix';
  }

  findAll() {
    return `This action returns all contractAppendices`;
  }

  findOne(id: number) {
    return `This action returns a #${id} contractAppendix`;
  }

  update(id: number, updateContractAppendixDto: UpdateContractAppendicesDto) {
    return `This action updates a #${id} contractAppendix`;
  }

  remove(id: number) {
    return `This action removes a #${id} contractAppendix`;
  }
}
