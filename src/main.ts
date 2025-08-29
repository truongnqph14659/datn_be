import {ValidationPipe} from '@nestjs/common';
import {NestFactory, Reflector} from '@nestjs/core';
import {NestExpressApplication} from '@nestjs/platform-express';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';
import {ResponseTransformInterceptor} from 'src/modules/base-modules/interception/response.interceptor';
import {AppModule} from './app.module';
import {HEADER_TOKEN_KEY} from 'src/shared/constants/constant';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const APP_PORT = Number(process.env.APP_PORT);
  const reflector = app.get(Reflector);

  app.setGlobalPrefix('/api');
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseTransformInterceptor(reflector));

  const config = new DocumentBuilder()
    .setTitle('API')
    .setVersion(process.env.DOC_VERSION || '1.0')
    .addSecurity(HEADER_TOKEN_KEY, {
      type: 'apiKey',
      in: 'header',
      name: HEADER_TOKEN_KEY,
      description: 'Access token for accessing protected API.',
    })
    .setDescription(`update: 2025-22-03`)
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('/api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(APP_PORT, () => {
    console.log(`Listening on port`, APP_PORT);
    console.log(`Docs link:`, 'http://localhost:' + APP_PORT + '/api/docs');
  });
}
void bootstrap();
