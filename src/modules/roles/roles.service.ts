import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {RoleEntity} from 'src/modules/roles/entities/role.entity';
import {QuerySpecificationDto} from 'src/shared/dto/query-specification.dto';
import {ILike, In, Repository} from 'typeorm';
import {AclEntity} from '../acl/entities/acl.entity';
import {MenuEntity} from '../menu/entities/menu.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleEntity)
    private roleRepo: Repository<RoleEntity>,
    @InjectRepository(AclEntity)
    private aclRepo: Repository<AclEntity>,
    @InjectRepository(MenuEntity)
    private menuRepo: Repository<MenuEntity>,
  ) {}

  async listRoleWithAcl(query: any) {
    const rawData = await this.menuRepo
      .createQueryBuilder('menu')
      .leftJoin(
        (subQueryBuilder) => {
          return subQueryBuilder
            .select(['acl.isView AS isView', 'acl.isEdit AS isEdit', 'acl.menu_id AS _id_menu'])
            .from('acl', 'acl')
            .innerJoin('menu', 'm2', 'acl.menu_id = m2._id')
            .where('acl.role_id = :role_id', {role_id: query._id});
        },
        'sub_menu',
        'menu._id = sub_menu._id_menu',
      )
      .select([
        'menu._id AS id',
        'menu.name AS name',
        'menu.code AS code',
        'menu.parent AS parent',
        'menu.route AS route',
        'COALESCE(sub_menu.isView, 0) AS isView',
        'COALESCE(sub_menu.isEdit, 0) AS isEdit',
      ])
      .orderBy('menu.order', 'ASC')
      .getRawMany();

    const handleDataRolePermission = rawData.map((menu) => {
      return {
        id: menu.id,
        key: menu.id,
        code: menu.code,
        parent: menu.parent,
        labelParent: menu.code !== menu.parent ? '' : menu.name,
        labelChildren: menu.code == menu.parent ? '' : menu.name,
        isParent: menu.code == menu.parent ? true : false,
        isView: menu.isView == 1 ? true : false,
        isEdit: menu.isEdit == 1 ? true : false,
      };
    });
    return {
      message: 'Lấy danh sách nhóm quyền thành công',
      data: {
        role_name: query.name,
        role_id: query._id,
        desc: query.desc,
        permissionData: handleDataRolePermission,
      },
    };
  }

  async createRole(payload: any, {user}: any) {
    const {role, permissionList} = payload;
    const isDuplicate = await this.roleRepo.findOne({
      where: {name: ILike(role.name)},
    });
    if (isDuplicate) {
      throw new NotFoundException('Duplicate name role!');
    }

    const newRole = this.roleRepo.create({
      ...role,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user.id,
      updatedBy: user.id,
    });
    const role_res = await this.roleRepo.save(newRole);
    const handleDataPermission = permissionList.map((permission) => {
      return {
        menu_id: Number(permission.id),
        role_id: Number(role_res['_id']),
        isView: permission.isView == true ? 1 : 0,
        isEdit: permission.isEdit == true ? 1 : 0,
      };
    });
    await this.aclRepo.save(handleDataPermission);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      message: 'Tạo mới nhóm quyền thành công',
      data: [],
    };
  }

  async editRolePermission(payload: any, {user}: any) {
    const {role, permissionList} = payload;
    const handleDataPermission = permissionList.map((permission: any) => {
      return {
        menu_id: Number(permission.id),
        role_id: Number(role.role_id),
        isView: permission.isView == true ? 1 : 0,
        isEdit: permission.isEdit == true ? 1 : 0,
      };
    });
    try {
      await this.aclRepo.delete({role_id: role.role_id});
      await Promise.all([
        this.roleRepo.update(
          {_id: role.role_id},
          {name: role.name, desc: role.desc, updatedAt: new Date(), updatedBy: user.id},
        ),
        this.aclRepo.save(handleDataPermission),
      ]);
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        message: 'cập nhật nhóm quyền thành công',
        data: [],
      };
    } catch (error) {
      throw new NotFoundException('Edit role permission error!');
    }
  }

  async findAll(params: QuerySpecificationDto) {
    const {limit = 10, page = 1, disablePagination = true} = params;
    const query = this.roleRepo
      .createQueryBuilder('roles')
      // .leftJoinAndSelect('roles.role_permissions', 'role_permissions')
      .where('roles.isDeleted = 0')
      .orderBy('roles.createdAt', 'DESC');
    if (params.search) {
      query.andWhere('(roles.name LIKE :search)', {search: `%${params.search}%`});
    }

    if (params.sort) {
      //
    }
    if (!disablePagination) {
      query.skip((page - 1) * limit).take(limit);
      query.take(limit);
    }

    const [data, total] = await query.getManyAndCount();
    const totalPage = Math.ceil(total / limit);
    return {
      message: 'Lấy danh sách nhóm quyền thành công',
      data: data,
      meta: {
        page,
        limit,
        totalItems: total,
        totalPage,
      },
    };
  }

  async findRoleById(id: number) {
    return await this.roleRepo.findOneBy({
      _id: id,
      isDeleted: false,
    });
  }

  async findOne(id: number) {
    const role = await this.findRoleById(id);
    if (!role) {
      throw new NotFoundException('Nhóm quyền không tồn tại');
    }
    return {
      message: 'Lấy thông tin nhóm quyền thành công',
      data: role,
    };
  }

  async remove(id: number) {
    const employee = await this.findRoleById(id);
    if (!employee) {
      throw new NotFoundException('Nhóm quyền không tồn tại');
    }
    await this.roleRepo.update(id, {isDeleted: true});
    return {
      message: 'Xóa nhóm quyền thành công',
      data: null,
    };
  }
}
