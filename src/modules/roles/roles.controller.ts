import {Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';
import {AuthGuard} from 'src/modules/auth/auth.guard';
import {IsSkipAuth} from 'src/modules/auth/is-skip-auth.decorator';
import {Roles} from 'src/modules/auth/roles.decorator';
import {RolesGuard} from 'src/modules/auth/roles.guard';
import {ROLES_ACTIONS} from 'src/shared/constants/constant';
import {QuerySpecificationDto} from 'src/shared/dto/query-specification.dto';
import {CreateRoleDto} from './dto/create-role.dto';
import {UpdateRoleDto} from './dto/update-role.dto';
import {RolesService} from './roles.service';

@UseGuards(AuthGuard, RolesGuard)
@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post('/create-roles')
  createRolePermission(@Body() dataRolePermission: any, @Request() req: Request) {
    return this.rolesService.createRole(dataRolePermission, req);
  }

  @Post('/edit-roles')
  editRolePermission(@Body() dataRolePermission: any, @Request() req: Request) {
    return this.rolesService.editRolePermission(dataRolePermission, req);
  }

  @Get('/roles-permission-v2')
  getRolePermission(@Query() query: any) {
    return this.rolesService.listRoleWithAcl(query);
  }

  // @Roles(ROLES_ACTIONS.ROLES_READ)
  @IsSkipAuth()
  @Get()
  findAll(@Query() params: QuerySpecificationDto) {
    return this.rolesService.findAll(params);
  }

  @Roles(ROLES_ACTIONS.ROLES_READ_DETAIL)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(+id);
  }

  @Roles(ROLES_ACTIONS.ROLES_DELETE)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(+id);
  }
}
