import { Test, TestingModule } from '@nestjs/testing'
import { GetMatchDetailsUseCase } from './get-match-details.use-case'
import { MatchRepository } from '../../domain/repositories/match.repository'
import { NotFoundException } from '@nestjs/common'

describe('GetMatchDetailsUseCase', () => {
    let useCase: GetMatchDetailsUseCase
    let matchRepository: jest.Mocked<MatchRepository>

    beforeEach(async () => {
        const mockRepository = {
            findById: jest.fn(),
            save: jest.fn(),
            findAll: jest.fn(),
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetMatchDetailsUseCase,
                {
                    provide: MatchRepository,
                    useValue: mockRepository,
                },
            ],
        }).compile()

        useCase = module.get<GetMatchDetailsUseCase>(GetMatchDetailsUseCase)
        matchRepository = module.get(MatchRepository) as jest.Mocked<MatchRepository>
    })

    it('lança NotFoundException quando match não encontrado', async () => {
        matchRepository.findById.mockResolvedValue(null)
        await expect(useCase.execute('123')).rejects.toThrow(NotFoundException)
        expect(matchRepository.findById).toHaveBeenCalledWith('123')
    })

    it('retorna detalhes convertendo o Map do Mongoose para Record', async () => {
        const mockMap = new Map()
        mockMap.set('Roman', { frags: 10, deaths: 2 })

        const mockMatch = {
            matchId: '123',
            winningWeapon: 'M16',
            players: mockMap
        }

        matchRepository.findById.mockResolvedValue(mockMatch as any)

        const res = await useCase.execute('123')

        expect(res.matchId).toBe('123')
        expect(res.winningWeapon).toBe('M16')
        // Verifica se a conversão funcionou
        expect(res.players['Roman'].frags).toBe(10)
    })
})