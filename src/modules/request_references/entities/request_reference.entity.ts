import {BeforeInsert, Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity('request_references')
export class RequestReferencesEntity {
  @PrimaryGeneratedColumn()
  _id: number;

  @Column({type: 'int'})
  requestEmployeeId: number;

  @Column({type: 'int'})
  employeeId: number;

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

  @BeforeInsert()
  setDefault() {
    this.is_seen = 0;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}
