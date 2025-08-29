import {Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn} from 'typeorm';

@Entity('commond_codes')
export class CommonCodeEntity {
  @PrimaryGeneratedColumn()
  _id: number;

  @Column({type: 'varchar', length: 20})
  type_code: string;

  @Column({type: 'varchar', length: 20})
  code: string;

  @Column({type: 'varchar', length: 20})
  name: string;

  @Column({type: 'varchar', length: 100})
  desc: string;

  @CreateDateColumn({type: 'timestamp'})
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
  })
  updatedAt: Date;

  @Column({type: 'int', default: null, nullable: true})
  createdBy?: number;

  @Column({type: 'int', default: null, nullable: true})
  updatedBy?: number;

  @Column({type: 'int'})
  orderIndex: number;

  @Column({
    type: 'varchar',
    length: 100,
  })
  icon: string;
}
