import {ContractAppencicesEntity} from 'src/modules/contract_appendices/entities/contract_appendices.entity';
import {EmployeeEntity} from 'src/modules/employee/entities/employee.entity';
import {BeforeInsert, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm';

@Entity('contracts')
export class ContractEntity {
  @PrimaryGeneratedColumn()
  _id: number;

  @Column({type: 'int'})
  employeeId: number;

  @Column({length: 100})
  contract_type: string;

  @Column({type: 'date'})
  start_date: Date;

  @Column({type: 'date', nullable: true})
  end_date: Date;

  @Column({length: 50, default: 'ACTIVE'})
  status: string;

  @Column({length: 100})
  note: string;

  @Column({length: 100})
  url_contract: string;

  @Column({type: 'datetime'})
  createdAt: Date;

  @Column({type: 'datetime'})
  updatedAt: Date;

  @Column({type: 'int', default: null})
  createdBy: number;

  @Column({type: 'int', default: null})
  updatedBy: number;

  @Column({type:'varchar', default:null})
  current_position:string

  @ManyToOne(() => EmployeeEntity, (employee) => employee.contract)
  @JoinColumn({name: 'employeeId'})
  employees: EmployeeEntity;

  @OneToMany(() => ContractAppencicesEntity, (contract_appendices) => contract_appendices.contract)
  contract_appendices: ContractAppencicesEntity[];

  @BeforeInsert()
  setDefaultValues() {
    this.status = this.status ?? 'ACTIVE';
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}
