import {BeforeInsert, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {RequestEntity} from '../../requests/entities/request.entity';

@Entity('request_employee')
export class RequestEmployeeEntity {
  @PrimaryGeneratedColumn()
  _id: number;

  @Column({type: 'int'})
  request_id: number;

  @Column({type: 'int'})
  employee_id: number;

  @Column({type: 'tinyint'})
  finalStatusAproval: number;

  @Column({type: 'tinyint'})
  isDeleted: number;

  @Column({type: 'varchar', length: 100})
  desc: string;

  @Column({type: 'varchar', length: 100})
  file_path: string;

  @Column({type: 'longtext'})
  fields: string;

  @Column({type: 'varchar', length: 255})
  appover_feaback:string

  @Column({type: 'datetime'})
  createdAt: Date;

  @Column({type: 'datetime'})
  updatedAt: Date;

  @Column({type: 'int', default: null})
  createdBy: number;

  @Column({type: 'int', default: null})
  updatedBy: number;

  @ManyToOne(() => RequestEntity)
  @JoinColumn({name: 'request_id'})
  request: RequestEntity;

  @BeforeInsert()
  setDefaultT() {
    this.finalStatusAproval = null;
    this.isDeleted = 0;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}
