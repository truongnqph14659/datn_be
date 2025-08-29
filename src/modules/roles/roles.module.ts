import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {RoleEntity} from 'src/modules/roles/entities/role.entity';
import {RolesController} from './roles.controller';
import {RolesService} from './roles.service';
import {AclEntity} from '../acl/entities/acl.entity';
import {MenuEntity} from '../menu/entities/menu.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RoleEntity, AclEntity, MenuEntity])],
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}
