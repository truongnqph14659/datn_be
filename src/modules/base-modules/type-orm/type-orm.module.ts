import {TypeOrmModule} from '@nestjs/typeorm';

const TypeOrmRootModule = TypeOrmModule.forRoot({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATASET,
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  autoLoadEntities: true,
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
});

export {TypeOrmRootModule};
