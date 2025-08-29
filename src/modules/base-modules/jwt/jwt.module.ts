import {JwtModule as NestJwtModule} from '@nestjs/jwt';
import {ConfigurationService} from 'src/modules/base-modules/configuration/configuration.service';

const JwtModule = NestJwtModule.registerAsync({
  global: true,
  inject: [ConfigurationService],
  useFactory: (config: ConfigurationService) => {
    return {
      secret: config.get('SECRET_KEY'),
      signOptions: {expiresIn: '50h'},
    };
  },
});

export {JwtModule};
