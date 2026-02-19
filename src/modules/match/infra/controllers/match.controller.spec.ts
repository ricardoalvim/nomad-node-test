import { Test, TestingModule } from '@nestjs/testing'
import { MatchController } from './match.controller'
import { ProcessLogUseCase } from '../../application/use-cases/process-log.use-case'

describe('MatchController', () => {
  let controller: MatchController
  let useCase: jest.Mocked<ProcessLogUseCase>

  beforeEach(async () => {
    const mockUseCase = {
      execute: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchController],
      providers: [{ provide: ProcessLogUseCase, useValue: mockUseCase }],
    }).compile()

    controller = module.get<MatchController>(MatchController)
    useCase = module.get(ProcessLogUseCase) as jest.Mocked<ProcessLogUseCase>
  })

  it('deve aceitar o upload de um arquivo e chamar o UseCase', async () => {
    const mockFile = {
      originalname: 'test-log.txt',
      size: 1024,
      buffer: Buffer.from('linha de teste'),
    } as Express.Multer.File

    const result = await controller.uploadLog(mockFile)

    expect(useCase.execute).toHaveBeenCalledWith(mockFile.buffer)
    expect(result.message).toBe('Arquivo processado e salvo com sucesso!')
  })
})