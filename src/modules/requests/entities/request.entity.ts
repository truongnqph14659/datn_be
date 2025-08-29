import {BeforeInsert, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn} from 'typeorm';

@Entity('requests')
export class RequestEntity {
  @PrimaryGeneratedColumn()
  _id: number;

  @Column({type: 'varchar', length: 100})
  name: string;

  @Column({type: 'varchar', length: 10})
  code: string;

  @Column({type: 'varchar', length: 100})
  desc: string;

  @Column({type: 'longtext'})
  fields: string;

  @CreateDateColumn({type: 'datetime'})
  createdAt: Date;

  @UpdateDateColumn({type: 'datetime'})
  updatedAt: Date;

  @Column({type: 'int', default: 0})
  createdBy: number;

  @Column({type: 'int', default: 0})
  updatedBy: number;

  @BeforeInsert()
  setDefaultT() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}
