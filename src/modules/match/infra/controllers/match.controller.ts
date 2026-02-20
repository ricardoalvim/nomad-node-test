import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiConsumes, ApiBody, ApiOperation, ApiParam } from '@nestjs/swagger'
import { UploadResult } from 'src/shared/interfaces/api.interfaces'
import { Express } from 'express'
import { ProcessLogUseCase } from '../../application/use-cases/process-log.use-case'
import { GetMatchDetailsUseCase } from '../../application/use-cases/get-match-details.use-case'
import { ApiRoutes } from 'src/shared/enum/api-routes.enum'
import { ParsedMatch, TimelineEvent } from 'src/shared/interfaces/match.interfaces'
import { Badge } from 'src/shared/enum/badge.enum'
import { BadgesResponse } from './interface/badge.response.dto'
import { TextFileValidator } from '../validator/text-file-validator'

@ApiTags('Matches')
@Controller('matches')
export class MatchController {
  constructor(
    private readonly processLogUseCase: ProcessLogUseCase,
    private readonly getMatchDetailsUseCase: GetMatchDetailsUseCase,
  ) { }

  @Post(ApiRoutes.MatchesUpload)
  @ApiOperation({ summary: 'Upload game log for processing' })
  @ApiConsumes('multipart/form-data')
  // ... ApiBody ...
  @UseInterceptors(FileInterceptor('file'))
  async uploadLog(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(new TextFileValidator())
        .addMaxSizeValidator({ maxSize: 1024 * 1024 * 5 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
  ): Promise<UploadResult> {
    await this.processLogUseCase.execute(file.buffer)

    return {
      message: 'Log file processed and saved successfully!',
      filename: file.originalname,
      size: file.size,
    }
  }

  @Get(':matchId')
  @ApiOperation({ summary: 'Get complete match details' })
  @ApiParam({ name: 'matchId', type: String, description: 'Match ID' })
  async getMatchDetails(@Param('matchId') matchId: string): Promise<ParsedMatch> {
    return this.getMatchDetailsUseCase.execute(matchId)
  }

  @Get(':matchId/badges')
  @ApiOperation({ summary: 'Get match badges' })
  @ApiParam({ name: 'matchId', type: String, description: 'Match ID' })
  async getMatchBadges(@Param('matchId') matchId: string): Promise<BadgesResponse> {
    const match = await this.getMatchDetailsUseCase.execute(matchId)

    const playerBadges: Record<string, Badge[]> = {}
    for (const playerName in match.players) {
      playerBadges[playerName] = match.players[playerName].badges || []
    }

    return {
      matchId,
      playerBadges,
    }
  }

  @Get(':matchId/timeline')
  @ApiOperation({ summary: 'Get match timeline with significant events' })
  @ApiParam({ name: 'matchId', type: String, description: 'Match ID' })
  async getMatchTimeline(@Param('matchId') matchId: string): Promise<TimelineEvent[]> {
    const match = await this.getMatchDetailsUseCase.execute(matchId)
    return match.timeline || []
  }
}
