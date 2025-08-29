import {BaseEntityCRUD} from 'src/modules/base-modules/model/model.entity';
import {DepartmentEntity} from 'src/modules/departments/entities/department.entity';
import {Column, Entity, OneToMany} from 'typeorm';

@Entity('company')
export class CompanyEntity extends BaseEntityCRUD {
  @Column({length: 100})
  company_name: string;

  @Column({type: 'int', nullable: true})
  createdBy: number;

  @Column({type: 'int', nullable: true})
  updatedBy: number;

  @OneToMany(() => DepartmentEntity, (depart) => depart.company)
  department: DepartmentEntity[];
}
