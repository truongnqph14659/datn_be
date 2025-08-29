import {BaseEntityCRUD} from 'src/modules/base-modules/model/model.entity';
import {EmployeeEntity} from 'src/modules/employee/entities/employee.entity';
import {Column, Entity, JoinColumn, OneToOne} from 'typeorm';

@Entity('work_scheduled')
export class WorkScheduleEntity extends BaseEntityCRUD {
  @Column({type: 'int'})
  employeeId: number;

  @Column({type: 'decimal', precision: 5, scale: 2})
  expected_hours: number;

  @Column({type: 'varchar', length: 10})
  shiftStart: string;

  @Column({type: 'varchar', length: 10})
  shiftEnd: string;

  @Column({type: 'tinyint', default: 1})
  status: number;

  @Column({type: 'int'})
  break_time: number;

  @Column({type: 'int', nullable: true, default: null})
  createdBy: number;

  @Column({type: 'int', nullable: true, default: null})
  updatedBy: number;

  @OneToOne(() => EmployeeEntity, (employee) => employee.workScheduled)
  @JoinColumn({name: 'employeeId'})
  employees: EmployeeEntity;
}
