import {Global, Module} from '@nestjs/common';
import {ConfigModule as NestConfigModule} from '@nestjs/config';
import {ConfigurationService} from './configuration.service';

const ConfigModule = NestConfigModule.forRoot({
  envFilePath: process.env.NODE_ENV !== 'production' ? '.env.development' : '.env.production',
});

@Global()
@Module({
  imports: [ConfigModule],
  providers: [ConfigurationService],
  exports: [ConfigurationService],
})
export default class ConfigurationModule {}
