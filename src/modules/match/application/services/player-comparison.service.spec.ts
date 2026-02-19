import { Test, TestingModule } from '@nestjs/testing'
import { PlayerComparisonService } from './player-comparison.service'
import { MatchRepository } from '../../domain/repositories/match.repository'

describe('PlayerComparisonService', () => {
    let service: PlayerComparisonService
    let matchRepository: jest.Mocked<MatchRepository>

    const makeMatch = (p1Name: string, p2Name: string, p1Frags = 1, p2Frags = 0) => ({
        players: {
            [p1Name]: { frags: p1Frags, deaths: 0, longestStreak: 1, weapons: { AK: p1Frags } },
            [p2Name]: { frags: p2Frags, deaths: 0, longestStreak: 0, weapons: { M16: p2Frags } },
        },
    })

    beforeEach(async () => {
        const mockRepository = {
            findAll: jest.fn(),
            save: jest.fn(),
            findById: jest.fn(),
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PlayerComparisonService,
                {
                    provide: MatchRepository,
                    useValue: mockRepository,
                },
            ],
        }).compile()

        service = module.get<PlayerComparisonService>(PlayerComparisonService)
        matchRepository = module.get(MatchRepository) as jest.Mocked<MatchRepository>
    })

    it('retorna valores zero quando não há partidas em comum', async () => {
        matchRepository.findAll.mockResolvedValue([])

        const res = await service.compareHeadToHead('A', 'B')

        expect(res.matches_played_together).toBe(0)
        expect(res.player1.frags).toBe(0)
        expect(res.prediction).toBe('tie')
    })

    it('calcula estatísticas básicas quando há partidas em comum', async () => {
        matchRepository.findAll.mockResolvedValue([
            makeMatch('A', 'B', 3, 1) as any,
            makeMatch('A', 'B', 2, 4) as any,
        ])

        const res = await service.compareHeadToHead('A', 'B')

        expect(res.matches_played_together).toBe(2)
        expect(res.player1.frags).toBe(5)
        expect(res.player2.frags).toBe(5)
        expect(['player1', 'player2', 'tie']).toContain(res.prediction)
        expect(typeof res.confidence).toBe('number')
    })
})