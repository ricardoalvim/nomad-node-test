import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    ParseFilePipeBuilder,
    HttpStatus
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger'
import { Express } from 'express'

@ApiTags('Matches')
@Controller('matches')
export class MatchController {

    @Post('upload')
    @ApiOperation({ summary: 'Faz o upload do log do jogo para processamento' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    async uploadLog(
        @UploadedFile(
            new ParseFilePipeBuilder()
                .addFileTypeValidator({ fileType: 'text/plain' })
                .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
        )
        file: Express.Multer.File,
    ) {
        return {
            message: 'Arquivo recebido com sucesso!',
            filename: file.originalname,
            size: file.size
        }
    }
}