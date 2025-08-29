import { Module } from '@nestjs/common';
import { AclService } from './acl.service';
import { AclController } from './acl.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AclEntity } from './entities/acl.entity';

@Module({
  imports:[TypeOrmModule.forFeature([AclEntity])],
  controllers: [AclController],
  providers: [AclService]
})
export class AclModule {}
