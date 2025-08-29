import {EmployeeEntity} from 'src/modules/employee/entities/employee.entity';
import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';

@Entity('emp_images')
export class EmpImageEntity {
  @PrimaryGeneratedColumn()
  _id: number;

  @Column({type: 'int'})
  employeeId: number;

  @Column({length: 255})
  image: string;

  @ManyToOne(() => EmployeeEntity, (employee) => employee.images)
  @JoinColumn({name: 'employeeId'})
  employees: EmployeeEntity;
}
