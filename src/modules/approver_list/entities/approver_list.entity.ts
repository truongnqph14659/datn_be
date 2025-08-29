import {AttendancesRequestEntity} from 'src/modules/attendances_requests/entities/attendances_request.entity';
import {RequestEmployeeEntity} from 'src/modules/request-employee/entities/request-employee.entity';
import {BeforeInsert, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';

@Entity('approver_list')
export class ApproverListEntity {
  @PrimaryGeneratedColumn()
  _id: number;

  @Column({type: 'int'})
  request_employee_id: number;

  @Column({type: 'int'})
  employee_id: number;

  @Column({type: 'int'})
  stepOrderAprrover: number;

  @Column({type: 'int'})
  statusApproval_id: number;

  @Column({type: 'tinyint'})
  is_seen: number;

  @Column({type: 'datetime'})
  createdAt: Date;

  @Column({type: 'datetime'})
  updatedAt: Date;

  @Column({type: 'int', default: null})
  createdBy: number;

  @Column({type: 'int', default: null})
  updatedBy: number;

  @ManyToOne(() => RequestEmployeeEntity)
  @JoinColumn({name: 'request_employee_id'})
  requestEmp: RequestEmployeeEntity;

  @BeforeInsert()
  setDefault() {
    this.statusApproval_id = null;
    this.is_seen = 0;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}
