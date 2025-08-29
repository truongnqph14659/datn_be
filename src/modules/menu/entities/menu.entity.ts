import {AclEntity} from 'src/modules/acl/entities/acl.entity';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('menu')
export class MenuEntity {
  @PrimaryGeneratedColumn()
  _id: number;

  @Column({type: 'varchar', length: 256})
  name: string;

  @Column({type: 'varchar', length: 256})
  code: string;

  @Column({type: 'varchar', length: 256})
  parent: string;

  @Column({type: 'varchar', length: 256})
  route: string;

  @Column({type: 'float'})
  order: number;

  @CreateDateColumn({type: 'datetime'})
  createdAt: Date;

  @UpdateDateColumn({type: 'datetime'})
  updatedAt: Date;

  @Column({type: 'int', default: null})
  createdBy: number;

  @Column({type: 'int', default: null})
  updatedBy: number;

  @OneToMany(() => AclEntity, (acl) => acl.menu)
  acls: AclEntity[];

  @BeforeInsert()
  setDefaultT() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.createdBy = this.createdBy ?? null;
    this.updatedBy = this.updatedBy ?? null;
  }
}
