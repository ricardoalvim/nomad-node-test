import { Test, TestingModule } from '@nestjs/testing'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { ProcessLogUseCase } from './process-log.use-case'
import { LogParserService } from '../services/log-parser.service'
import { MatchRepository } from '../../domain/repositories/match.repository'
import { PlayerName } from 'src/shared/player.enum'
import { Weapon } from 'src/shared/weapon.enum'
import { Award } from 'src/shared/award.enum'

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

  it('deve processar, salvar e emitir evento', async () => {
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
    expect(savedMatch.winningWeapon).toBe(Weapon.M16)

    expect(eventEmitter.emit).toHaveBeenCalledWith('match.processed', savedMatch)
  })
})