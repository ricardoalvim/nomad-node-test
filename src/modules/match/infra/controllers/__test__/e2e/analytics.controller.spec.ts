import { Test, TestingModule } from '@nestjs/testing'
import { AnalyticsController } from '../../analytics.controller'
import { GetPlayerComparisonUseCase } from '../../../../application/use-cases/get-player-comparison.use-case'
import { BadRequestException } from '@nestjs/common'

describe('AnalyticsController', () => {
    let controller: AnalyticsController
    let useCase: jest.Mocked<GetPlayerComparisonUseCase>

    beforeEach(async () => {
        const mockUseCase = {
            execute: jest.fn(),
        }

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AnalyticsController],
            providers: [
                {
                    provide: GetPlayerComparisonUseCase,
                    useValue: mockUseCase,
                },
            ],
        }).compile()

        controller = module.get<AnalyticsController>(AnalyticsController)
        useCase = module.get(GetPlayerComparisonUseCase) as jest.Mocked<GetPlayerComparisonUseCase>
    })

    it('should throw BadRequest when parameters are missing', async () => {
        await expect(controller.compareHeadToHead('', 'B')).rejects.toThrow(BadRequestException)
        await expect(controller.compareHeadToHead('A', '')).rejects.toThrow(BadRequestException)
    })

    it('retorna resultado do caso de uso quando válido', async () => {
        const expected = { player1: { name: 'A' }, player2: { name: 'B' } }
        useCase.execute.mockResolvedValue(expected as any)

        const res = await controller.compareHeadToHead('A', 'B')

        expect(useCase.execute).toHaveBeenCalledWith('A', 'B')
        expect(res).toBe(expected)
    })
})