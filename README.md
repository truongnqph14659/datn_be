# kidzania-res-be-api

### Database migration:

- After pull code, if there are new migration files, run migration script by:

  `npm run migrate`

- Each time change db struct, create a new migration file

  - Auto generate new migrations by auto detect from Entities

    `npm run migrate:gen --name=<migration_name>`

  - Create a new empty migration file using

    `npm run migrate:create --name=<migration_name>`

- Revert the last migration

  `npm run migrate:revert`
