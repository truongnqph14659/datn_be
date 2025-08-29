import {AclEntity} from 'src/modules/acl/entities/acl.entity';
import {BaseEntityCRUD} from 'src/modules/base-modules/model/model.entity';
import {EmployeeEntity} from 'src/modules/employee/entities/employee.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('roles')
export class RoleEntity extends BaseEntityCRUD {
  @PrimaryGeneratedColumn()
  _id: number;

  @Column({length: 100})
  name: string;

  @Column({length: 200})
  desc: string;

  @UpdateDateColumn({type: 'timestamp'})
  updatedAt: Date;

  @Column({nullable: true, default: null})
  createdBy: number;

  @CreateDateColumn({type: 'timestamp'})
  createdAt: Date;

  @Column({nullable: true, default: null})
  updatedBy: number;

  @OneToMany(() => EmployeeEntity, (employ) => employ.roles)
  employees: EmployeeEntity[];

  @OneToMany(() => AclEntity, (acl) => acl.role)
  acls: AclEntity[];
}
