import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationPipe } from './common/pipes/validation.pipe';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // CORS configuration
  // CORS configuration
  const rawOrigins = configService.get('CORS_ORIGIN');

  // دمج القيم الثابتة مع أي قيم جاية من الـ Environment Variables
  const corsOrigins = [
    'https://dyslexia-dysgraphia.netlify.app',                          
    'https://deslexia-desgraphia-production-6886.up.railway.app',        
    'http://localhost:3000',                                            
    'http://localhost:3001',                                            
    ...(rawOrigins ? rawOrigins.split(',').map(o => o.trim()) : [])     
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.some(o => origin.trim() === o.trim())) {
        callback(null, true);
      } else {
        console.log('Blocked by CORS. Origin received:', origin);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization',
  });
  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Deslexia and Desgraphia API')
    .setDescription('The Deslexia and Desgraphia API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
