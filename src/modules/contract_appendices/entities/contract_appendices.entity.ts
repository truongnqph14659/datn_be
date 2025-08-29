import {ContractEntity} from 'src/modules/contracts/entities/contract.entity';
import {BeforeInsert, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';

@Entity('contract_appendices')
export class ContractAppencicesEntity {
  @PrimaryGeneratedColumn()
  _id: number;

  @Column({type: 'int'})
  contractId: number;

  @Column({length: 20})
  change_type: string;

  @Column({type: 'text'})
  note: Date;

  @Column({length: 100})
  url_sub_contract: string;

  @Column({type: 'datetime'})
  createdAt: Date;

  @Column({type: 'datetime'})
  updatedAt: Date;

  @Column({type: 'int', default: null})
  createdBy: number;

  @Column({type: 'int', default: null})
  updatedBy: number;

  @ManyToOne(() => ContractEntity, (contract) => contract.contract_appendices)
  @JoinColumn({name: 'contractId'})
  contract: ContractEntity;

  @BeforeInsert()
  setDefaultValues() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}
