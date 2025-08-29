import {BeforeInsert, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn} from 'typeorm';

@Entity('check_in_out')
export class CheckInOutEntity {
  @PrimaryGeneratedColumn()
  _id: number;

  @Column({type: 'int'})
  employee_id: number;

  @Column({type: 'datetime'})
  datetime: Date;

  @Column({type: 'varchar', length: 15})
  type: string;

  @Column({type: 'varchar', length: 100})
  url_image?: string;

  @CreateDateColumn({type: 'datetime', default: () => 'CURRENT_TIMESTAMP'})
  createdAt: Date;

  @UpdateDateColumn({type: 'datetime', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP'})
  updatedAt: Date;

  @Column({type: 'int', default: null, nullable: true})
  createdBy?: number;

  @Column({type: 'int', default: null, nullable: true})
  updatedBy?: number;

  @BeforeInsert()
  setDefault() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}
