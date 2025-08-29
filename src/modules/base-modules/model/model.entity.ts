import {BeforeInsert, Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn} from 'typeorm';
import {BaseEntity as OrmBaseEntity} from 'typeorm/repository/BaseEntity';

export class BaseEntity extends OrmBaseEntity {
  constructor(partial: Record<string, any>) {
    super();
    Object.assign(this, partial);
    return this;
  }
}

export class BaseEntityCRUD extends BaseEntity {
  @PrimaryGeneratedColumn()
  _id: number;

  @CreateDateColumn({type: 'datetime'})
  createdAt: Date;

  @UpdateDateColumn({type: 'datetime'})
  updatedAt: Date;

  @Column({type: 'tinyint', default: 0})
  isDeleted: Number;

  @BeforeInsert()
  setDefaultTimestamps() {
    this.isDeleted = this.isDeleted ?? 0;
  }
}
