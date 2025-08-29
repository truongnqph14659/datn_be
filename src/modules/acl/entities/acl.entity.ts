import {MenuEntity} from 'src/modules/menu/entities/menu.entity';
import {RoleEntity} from 'src/modules/roles/entities/role.entity';
import {Column, Entity, JoinColumn,ManyToOne, PrimaryGeneratedColumn} from 'typeorm';

@Entity('acl')
export class AclEntity {
  @PrimaryGeneratedColumn()
  _id: number;

  @Column({type: 'int'})
  menu_id: number;

  @Column({type: 'int'})
  role_id: number;

  @Column({default: 0})
  isView: number;

  @Column({default: 0})
  isEdit: number;

  @ManyToOne(() => RoleEntity, (role) => role.acls, {onDelete: 'CASCADE'})
  @JoinColumn({name: 'role_id'})
  role: RoleEntity;

  @ManyToOne(() => MenuEntity, (menu) => menu.acls, {onDelete: 'CASCADE'})
  @JoinColumn({name: 'menu_id'})
  menu: MenuEntity;
}
