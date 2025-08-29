import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {CompanyEntity} from 'src/modules/company/entities/company.entity';
import {CompanyController} from './company.controller';
import {CompanyService} from './company.service';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyEntity])],
  controllers: [CompanyController],
  providers: [CompanyService],
})
export class CompanyModule {}
