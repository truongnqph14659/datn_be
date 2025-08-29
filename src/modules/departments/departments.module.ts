import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {DepartmentEntity} from 'src/modules/departments/entities/department.entity';
import {DepartmentsController} from './departments.controller';
import {DepartmentsService} from './departments.service';

@Module({
  imports: [TypeOrmModule.forFeature([DepartmentEntity])],
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
})
export class DepartmentsModule {}
