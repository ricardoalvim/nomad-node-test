import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
    const app = await NestFactory.create(AppModule)

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
        }),
    )

    const config = new DocumentBuilder()
        .setTitle('Nomad FPS Log Parser')
        .setDescription('API para processamento e ranking de partidas de FPS')
        .setVersion('1.0')
        .build()

    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, document)

    const port = process.env.PORT || 3000
    await app.listen(port)
    console.log(`Application::${port} port`)
}

bootstrap()