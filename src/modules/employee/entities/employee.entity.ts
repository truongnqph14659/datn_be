import {AttendanceEntity} from 'src/modules/attendances/entities/attendance.entity';
import {BaseEntityCRUD} from 'src/modules/base-modules/model/model.entity';
import {ContractEntity} from 'src/modules/contracts/entities/contract.entity';
import {DepartmentEntity} from 'src/modules/departments/entities/department.entity';
import {EmpImageEntity} from 'src/modules/emp-images/entities/emp-image.entity';
import {RoleEntity} from 'src/modules/roles/entities/role.entity';
import {WorkScheduleEntity} from 'src/modules/work_schedules/entities/work_schedule.entity';
import {hasPassword} from 'src/utils/helper';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('employees')
export class EmployeeEntity extends BaseEntityCRUD {
  @PrimaryGeneratedColumn()
  _id: number;

  @Column({length: 100})
  name: string;

  @Column({length: 100, unique: true})
  email: string;

  @Column({type: 'int', nullable: true})
  roleId: number;

  @Column({default: 1})
  status: number;

  @Column({type: 'int', nullable: true})
  deprId: number;

  @Column({type: 'datetime'})
  start_working: Date;

  @Column({type: 'datetime', nullable: true})
  end_working: Date;

  @Column({type: 'tinyint', default: 1})
  isActive: number;

  @Column({type: 'varchar', nullable: true})
  id_no: string;

  @Column({length: 20, unique: true, nullable: true})
  tax_no: string;

  @Column({nullable: true})
  address: string;

  @Column({length: 255, nullable: true})
  position_name: string;

  @Column({length: 255, nullable: true})
  password: string;

  @Column()
  createdBy: number;

  @Column()
  updatedBy: number;

  @OneToMany(() => AttendanceEntity, (attendances) => attendances.employees)
  attendances: AttendanceEntity[];

  @OneToOne(() => WorkScheduleEntity, (workScheduled) => workScheduled.employees)
  workScheduled: WorkScheduleEntity;

  @OneToMany(() => ContractEntity, (contract) => contract.employees)
  contract: ContractEntity[];

  @ManyToOne(() => RoleEntity, (role) => role.employees)
  @JoinColumn({
    name: 'roleId',
    referencedColumnName: '_id',
  })
  roles: RoleEntity;

  @OneToMany(() => EmpImageEntity, (empImages) => empImages.employees)
  images: EmpImageEntity[];

  @ManyToOne(() => DepartmentEntity, (department) => department.employee)
  @JoinColumn({name: 'deprId'})
  department: DepartmentEntity;

  @BeforeInsert()
  async setDefaultValues() {
    this.isActive = this.isActive ?? 1;
    this.status = this.status ?? 1;
    const password = this.password;

    if (password) {
      this.password = await hasPassword(password);
    }
  }
}
