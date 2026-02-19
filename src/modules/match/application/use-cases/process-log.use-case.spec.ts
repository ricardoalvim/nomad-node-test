import { Test, TestingModule } from '@nestjs/testing'
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

  beforeEach(async () => {
    // 1. Criamos os Mocks com as funções que vamos espionar (jest.fn)
    const mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
    }

    const mockParser = {
      parseLogContent: jest.fn(),
    }

    // 2. Montamos o módulo de teste injetando os mocks no lugar das classes reais
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessLogUseCase,
        { provide: MatchRepository, useValue: mockRepository },
        { provide: LogParserService, useValue: mockParser },
      ],
    }).compile()

    useCase = module.get<ProcessLogUseCase>(ProcessLogUseCase)
    repository = module.get(MatchRepository) as jest.Mocked<MatchRepository>
    parser = module.get(LogParserService) as jest.Mocked<LogParserService>
  })

  it('deve aplicar o award Imortal e descobrir a arma vencedora', async () => {
    // Preparamos o Mock do Parser para devolver um cenário controlado
    parser.parseLogContent.mockReturnValue([
      {
        matchId: '111',
        players: {
          [PlayerName.Roman]: {
            name: PlayerName.Roman,
            frags: 3,
            deaths: 0, // Zero mortes = Imortal
            weapons: { [Weapon.M16]: 2, [Weapon.AK47]: 1 }, // Arma vencedora deve ser M16
            currentStreak: 3,
            longestStreak: 3,
            killTimestamps: [
              new Date('2020-01-01T10:00:00Z'),
              new Date('2020-01-01T10:05:00Z'),
              new Date('2020-01-01T10:10:00Z'),
            ],
          },
          [PlayerName.Nick]: {
            name: PlayerName.Nick,
            frags: 0,
            deaths: 3,
            weapons: {},
            currentStreak: 0,
            longestStreak: 0,
            killTimestamps: [],
          },
        },
      },
    ])

    // Executamos o UseCase enviando um buffer qualquer (o parser real está mockado)
    await useCase.execute(Buffer.from('dummy log content'))

    // Verificamos se o repositório foi chamado para salvar
    expect(repository.save).toHaveBeenCalledTimes(1)

    // Inspecionamos os argumentos que o UseCase mandou para o repository.save()
    const [savedMatch, winningWeapon] = repository.save.mock.calls[0]

    expect(winningWeapon).toBe(Weapon.M16)
    expect((savedMatch.players[PlayerName.Roman] as any).awards).toContain(Award.Immortal)
    expect((savedMatch.players[PlayerName.Nick] as any).awards).toHaveLength(0)
  })

  it('deve aplicar o award Rambo para 5 kills em menos de 1 minuto', async () => {
    const baseTime = new Date('2020-01-01T10:00:00Z').getTime()

    parser.parseLogContent.mockReturnValue([
      {
        matchId: '222',
        players: {
          [PlayerName.Roman]: {
            name: PlayerName.Roman,
            frags: 5,
            deaths: 0,
            weapons: { M16: 5 },
            currentStreak: 5,
            longestStreak: 5,
            killTimestamps: [
              new Date(baseTime), // 0s
              new Date(baseTime + 10000), // 10s
              new Date(baseTime + 20000), // 20s
              new Date(baseTime + 30000), // 30s
              new Date(baseTime + 50000), // 50s (Total = 5 kills em 50 segundos)
            ],
          },
        },
      },
    ])

    await useCase.execute(Buffer.from('dummy'))

    const [savedMatch] = repository.save.mock.calls[0]

    // O Roman estava com a corda toda, tem que ganhar os dois prêmios
    expect((savedMatch.players[PlayerName.Roman] as any).awards).toContain(Award.Rambo)
    expect((savedMatch.players[PlayerName.Roman] as any).awards).toContain(Award.Immortal)
  })
})
