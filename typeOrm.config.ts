// this file used for config typeorm cli, which used for generate migration
import { DataSource } from 'typeorm'
import { config } from 'dotenv'

config({
  path:
    process.env.NODE_ENV !== 'production'
      ? '.env.development'
      : '.env.production'
})

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATASET,
  entities: [`${__dirname}/src/modules/**/entities/*.entity.ts`],
  migrations: [`${__dirname}/src/migrations/*.ts`]
})
