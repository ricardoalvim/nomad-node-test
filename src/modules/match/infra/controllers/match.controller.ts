import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger'
import { UploadResult } from 'src/shared/interfaces/api.interfaces'
import { Express } from 'express'
import { ProcessLogUseCase } from '../../application/use-cases/process-log.use-case'
import { ApiRoutes } from 'src/shared/api-routes'

@ApiTags('Matches')
@Controller('matches')
export class MatchController {
  constructor(private readonly processLogUseCase: ProcessLogUseCase) { }

  @Post(ApiRoutes.MatchesUpload)
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
  ): Promise<UploadResult> {

    await this.processLogUseCase.execute(file.buffer)

    return {
      message: 'Arquivo processado e salvo com sucesso!',
      filename: file.originalname,
      size: file.size,
    }
  }
}
