import { Test, TestingModule } from '@nestjs/testing'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { ProcessLogUseCase } from '../../process-log.use-case'
import { LogParserService } from '../../../services/log-parser.service'
import { MatchRepository } from '../../../../domain/repositories/match.repository'
import { PlayerName } from 'src/shared/enum/player.enum'
import { Weapon } from 'src/shared/enum/weapon.enum'
import { Award } from 'src/shared/enum/award.enum'

describe('ProcessLogUseCase', () => {
  let useCase: ProcessLogUseCase
  let repository: jest.Mocked<MatchRepository>
  let parser: jest.Mocked<LogParserService>
  let eventEmitter: jest.Mocked<EventEmitter2>

  beforeEach(async () => {
    const mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
    }

    const mockParser = {
      parseLogContent: jest.fn(),
    }

    const mockEventEmitter = {
      emit: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessLogUseCase,
        { provide: MatchRepository, useValue: mockRepository },
        { provide: LogParserService, useValue: mockParser },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile()

    useCase = module.get<ProcessLogUseCase>(ProcessLogUseCase)
    repository = module.get(MatchRepository) as jest.Mocked<MatchRepository>
    parser = module.get(LogParserService) as jest.Mocked<LogParserService>
    eventEmitter = module.get(EventEmitter2) as jest.Mocked<EventEmitter2>
  })

  it('should process, save and emit event', async () => {
    parser.parseLogContent.mockReturnValue([
      {
        matchId: '111',
        winningWeapon: Weapon.M16,
        players: {
          [PlayerName.Roman]: {
            name: PlayerName.Roman,
            frags: 3,
            deaths: 0,
            weapons: { [Weapon.M16]: 2 },
            currentStreak: 3,
            longestStreak: 3,
            killTimestamps: [],
            awards: [Award.Immortal],
          } as any,
        },
      },
    ])

    await useCase.execute(Buffer.from('dummy log content'))

    expect(repository.save).toHaveBeenCalledTimes(1)
    const [savedMatch] = repository.save.mock.calls[0]
    expect(savedMatch.matchId).toBe('111')
    expect(eventEmitter.emit).toHaveBeenCalledWith('match.processed', savedMatch)
  })

  it('should skip processing if matchId already exists (idempotency)', async () => {
    const fileBuffer = Buffer.from('23/04/2019 15:34:22 - New match 123 has started')
    const mockMatch = { matchId: '123', players: {} }

    // Usando as variáveis injetadas corretamente (parser e repository)
    parser.parseLogContent.mockReturnValue([mockMatch as any])
    repository.findById.mockResolvedValue(mockMatch as any)

    await useCase.execute(fileBuffer)

    // Verifica a idempotência: não deve salvar nem emitir evento se o ID já existe
    expect(repository.save).not.toHaveBeenCalled()
    expect(eventEmitter.emit).not.toHaveBeenCalled()
  })
})