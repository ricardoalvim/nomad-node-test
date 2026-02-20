import { Test, TestingModule } from '@nestjs/testing'
import { PlayerComparisonService } from '../../player-comparison.service'
import { MatchRepository } from '../../../../domain/repositories/match.repository'

describe('PlayerComparisonService', () => {
    let service: PlayerComparisonService
    let matchRepository: jest.Mocked<MatchRepository>

    beforeEach(async () => {
        const mockRepository = { findAll: jest.fn(), save: jest.fn(), findById: jest.fn() }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PlayerComparisonService,
                { provide: MatchRepository, useValue: mockRepository },
            ],
        }).compile()

        service = module.get<PlayerComparisonService>(PlayerComparisonService)
        matchRepository = module.get(MatchRepository) as jest.Mocked<MatchRepository>
    })

    it('retorna valores zero quando não há partidas em comum', async () => {
        matchRepository.findAll.mockResolvedValue([])
        const res = await service.compareHeadToHead('A', 'B')
        expect(res.prediction).toBe('tie')
        expect(res.matches_played_together).toBe(0)
    })

    it('calcula estatísticas, advantages e prediction corretamente', async () => {
        matchRepository.findAll.mockResolvedValue([
            {
                players: {
                    A: { frags: 10, deaths: 2, longestStreak: 5, weapons: { M16: 10 } },
                    B: { frags: 2, deaths: 10, longestStreak: 1, weapons: { AK47: 2 } }
                }
            } as any
        ])

        const res = await service.compareHeadToHead('A', 'B')

        expect(res.matches_played_together).toBe(1)
        expect(res.player1.frags).toBe(10)
        expect(res.player1.win_rate).toBe(1)
        expect(res.prediction).toBe('player1')
        expect(res.confidence).toBeGreaterThan(0)
    })

    it('prediction favorece player2 se os status dele forem maiores', async () => {
        matchRepository.findAll.mockResolvedValue([
            {
                players: {
                    A: { frags: 1, deaths: 10, longestStreak: 1, weapons: { M16: 1 } },
                    B: { frags: 15, deaths: 1, longestStreak: 8, weapons: { AK47: 15 } }
                }
            } as any
        ])

        const res = await service.compareHeadToHead('A', 'B')
        expect(res.prediction).toBe('player2')
    })

    it('deve retornar vantagens vazias e previsão tie se os status não existirem', async () => {
        const resAdvantages = (service as any).calculateAdvantages(undefined, undefined)
        expect(resAdvantages).toEqual([])

        const resPrediction = (service as any).makePrediction(undefined, undefined)
        expect(resPrediction).toEqual({ prediction: 'tie', confidence: 0 })
    })

    it('deve retornar null se o jogador não tiver armas', async () => {
        const res = (service as any).getMostUsedWeapon({})
        expect(res).toBeNull()
    })

    it('deve lidar com empate técnico na previsão (tie)', async () => {
        // Jogadores com status idênticos
        matchRepository.findAll.mockResolvedValue([
            {
                players: {
                    A: { frags: 5, deaths: 5, longestStreak: 2, weapons: { M16: 5 } },
                    B: { frags: 5, deaths: 5, longestStreak: 2, weapons: { M16: 5 } }
                }
            } as any
        ])

        const res = await service.compareHeadToHead('A', 'B')
        expect(res.prediction).toBe('tie')
        expect(res.player1.win_rate).toBe(0) // Empate em frags não conta como win no seu loop
    })

    it('calcula vantagens de experiência e diversidade de armas', async () => {
        matchRepository.findAll.mockResolvedValue([
            {
                players: {
                    // A tem mais armas, B tem mais frags
                    A: { frags: 1, deaths: 0, longestStreak: 1, weapons: { M16: 1, AK: 1, PISTOL: 1 } },
                    B: { frags: 10, deaths: 1, longestStreak: 5, weapons: { M16: 10 } }
                }
            } as any
        ])

        const res = await service.compareHeadToHead('A', 'B')
        expect(res.advantages.player1).toContain('Weapon diversity')
        expect(res.advantages.player2).toContain('K/D ratio')
    })
})