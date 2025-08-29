import {Module} from '@nestjs/common';
import {APP_FILTER, APP_INTERCEPTOR} from '@nestjs/core';
import {EventEmitterModule} from '@nestjs/event-emitter';
import {AuthGuard} from 'src/modules/auth/auth.guard';
import {AuthModule} from 'src/modules/auth/auth.module';
import {CompanyModule} from 'src/modules/company/company.module';
import {EmployeeModule} from 'src/modules/employee/employee.module';
import {ApproverListModule} from './modules/approver_list/approver_list.module';
import {AttendancesModule} from './modules/attendances/attendances.module';
import {AttendancesRequestsModule} from './modules/attendances_requests/attendances_requests.module';
import ConfigurationModule from './modules/base-modules/configuration/configuration.module';
import {AllExceptionsFilter} from './modules/base-modules/exception-filter/all-exception-filter.exception';
import {LoggingInterceptor} from './modules/base-modules/interception/logging.intercept';
import {JwtModule} from './modules/base-modules/jwt/jwt.module';
import {TypeOrmRootModule} from './modules/base-modules/type-orm/type-orm.module';
import {CheckInOutModule} from './modules/check-in-out/check-in-out.module';
import {CommonCodeModule} from './modules/common-code/common-code.module';
import {ContractAppendicesModule} from './modules/contract_appendices/contract_appendices.module';
import {ContractsModule} from './modules/contracts/contracts.module';
import {DepartmentsModule} from './modules/departments/departments.module';
import {EmpImagesModule} from './modules/emp-images/emp-images.module';
import {RequestEmployeeModule} from './modules/request-employee/request-employee.module';
import {RequestReferencesModule} from './modules/request_references/request_references.module';
import {RequestsModule} from './modules/requests/requests.module';
import {RolesModule} from './modules/roles/roles.module';
import {UploadModule} from './modules/upload/upload.module';
import {WorkSchedulesModule} from './modules/work_schedules/work_schedules.module';
import {AclModule} from './modules/acl/acl.module';
import {MenuModule} from './modules/menu/menu.module';

const coreModules = [ConfigurationModule, TypeOrmRootModule];

const appModules = [
  JwtModule,
  AuthModule,
  EmployeeModule,
  DepartmentsModule,
  CompanyModule,
  RolesModule,
  AttendancesModule,
  WorkSchedulesModule,
  RequestsModule,
  RequestEmployeeModule,
  CheckInOutModule,
  ContractsModule,
  ContractAppendicesModule,
  AttendancesRequestsModule,
  EmpImagesModule,
  UploadModule,
  CommonCodeModule,
  ApproverListModule,
  RequestReferencesModule,
  AclModule,
  MenuModule,
];

@Module({
  imports: [...coreModules, ...appModules, EventEmitterModule.forRoot()],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: 'APP_GUARD',
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
