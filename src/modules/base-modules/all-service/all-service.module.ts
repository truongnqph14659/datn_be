import {Global, Module} from '@nestjs/common';
import {AllService} from './all-service.provider';

@Global()
@Module({
  providers: [AllService],
  exports: [AllService],
})
export class AllServiceModule {}
