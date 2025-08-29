import {EmployeeEntity} from 'src/modules/employee/entities/employee.entity';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('attendances')
export class AttendanceEntity {
  @PrimaryGeneratedColumn()
  _id: number;

  @Column()
  employeeId: number;

  @Column({type: 'datetime'})
  checkin: Date;

  @Column({type: 'datetime'})
  checkout: Date;

  @Column({type: 'decimal', precision: 5, scale: 2})
  total_hours: number;

  @Column({type: 'decimal', precision: 5, scale: 2})
  overtime: number;

  @Column({type: 'tinyint', default: 0})
  isPenalty: number;

  @Column({type: 'datetime'})
  workDate: Date;

  @Column({type: 'decimal', precision: 5, scale: 2})
  total_request_hours: number;

  @Column({type: 'decimal', precision: 5, scale: 2})
  rateOfWork: number;

  @Column({nullable: true, default: null})
  createdBy: number;

  @Column({nullable: true, default: null})
  updatedBy: number;

  @CreateDateColumn({type: 'datetime'})
  createdAt: Date;

  @UpdateDateColumn({type: 'datetime'})
  updatedAt: Date;

  @ManyToOne(() => EmployeeEntity, (employee) => employee.attendances)
  @JoinColumn({name: 'employeeId'})
  employees: EmployeeEntity;

  @BeforeInsert()
  setDefaultValues() {
    this.isPenalty = this.isPenalty ?? 0;
    this.overtime = this.overtime ?? 0;
    this.total_hours = this.total_hours ?? 0;
    this.createdBy = this.createdBy ?? null;
    this.updatedBy = this.updatedBy ?? null;
    this.createdAt = this.createdAt ?? new Date();
    this.updatedAt = this.updatedAt ?? new Date();
  }
}
