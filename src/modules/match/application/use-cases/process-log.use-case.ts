import { Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { LogParserService } from '../services/log-parser.service'
import { MatchRepository } from '../../domain/repositories/match.repository'

@Injectable()
export class ProcessLogUseCase {
  constructor(
    private readonly logParserService: LogParserService,
    private readonly matchRepository: MatchRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(fileBuffer: Buffer): Promise<void> {
    const fileContent = fileBuffer.toString('utf-8')

    const parsedMatches = this.logParserService.parseLogContent(fileContent)

    for (const match of parsedMatches) {
      const existingMatch = await this.matchRepository.findById(match.matchId)
      if (existingMatch) continue // Ignore if processed this matchId before - idempotency key

      await this.matchRepository.save(match)
      this.eventEmitter.emit('match.processed', match)
    }
  }
}
