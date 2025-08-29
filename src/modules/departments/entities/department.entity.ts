import {BaseEntityCRUD} from 'src/modules/base-modules/model/model.entity';
import {CompanyEntity} from 'src/modules/company/entities/company.entity';
import {EmployeeEntity} from 'src/modules/employee/entities/employee.entity';
import {Column, Entity, JoinColumn, ManyToOne, OneToMany} from 'typeorm';

@Entity('departments')
export class DepartmentEntity extends BaseEntityCRUD {
  @Column({length: 100})
  name_depart: string;

  @Column({type: 'int', nullable: true})
  companyId: number;

  @ManyToOne(() => CompanyEntity, (company) => company.department)
  @JoinColumn({name: 'companyId'})
  company: CompanyEntity;

  @Column({nullable: true, default: null})
  createdBy: number;

  @Column({nullable: true, default: null})
  updatedBy: number;

  @OneToMany(() => EmployeeEntity, (emp) => emp.department)
  employee: EmployeeEntity[];
}
