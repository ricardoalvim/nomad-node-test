import { Test, TestingModule } from '@nestjs/testing'
import { GetPlayerComparisonUseCase } from './get-player-comparison.use-case'
import { BadRequestException } from '@nestjs/common'
import { PlayerComparisonService } from '../services/player-comparison.service'

describe('GetPlayerComparisonUseCase', () => {
    let useCase: GetPlayerComparisonUseCase
    let comparisonService: jest.Mocked<PlayerComparisonService>

    beforeEach(async () => {
        const mockComparisonService = {
            compareHeadToHead: jest.fn(),
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetPlayerComparisonUseCase,
                {
                    provide: PlayerComparisonService,
                    useValue: mockComparisonService,
                },
            ],
        }).compile()

        useCase = module.get<GetPlayerComparisonUseCase>(GetPlayerComparisonUseCase)
    })

    it('lança BadRequest quando parâmetros ausentes', async () => {
        await expect(useCase.execute('', 'B')).rejects.toThrow(BadRequestException)
        await expect(useCase.execute('A', '')).rejects.toThrow(BadRequestException)
    })

    it('lança BadRequest quando nomes iguais', async () => {
        await expect(useCase.execute('A', 'A')).rejects.toThrow(BadRequestException)
    })

    it('delegates para o serviço de comparação quando válidos', async () => {
        const expected = { player1: { name: 'A' }, player2: { name: 'B' } }

        comparisonService.compareHeadToHead.mockResolvedValue(expected as any)

        const res = await useCase.execute('A', 'B')

        expect(comparisonService.compareHeadToHead).toHaveBeenCalledWith('A', 'B')
        expect(res).toBe(expected)
    })
})
