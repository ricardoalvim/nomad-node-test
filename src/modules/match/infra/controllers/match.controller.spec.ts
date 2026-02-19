import { Test, TestingModule } from '@nestjs/testing'
import { MatchController } from './match.controller'
import { ProcessLogUseCase } from '../../application/use-cases/process-log.use-case'
import { GetMatchDetailsUseCase } from '../../application/use-cases/get-match-details.use-case'

describe('MatchController', () => {
  let controller: MatchController
  let processLogUseCase: jest.Mocked<ProcessLogUseCase>
  let getMatchDetailsUseCase: jest.Mocked<GetMatchDetailsUseCase>

  beforeEach(async () => {
    const mockProcessLogUseCase = {
      execute: jest.fn(),
    }
    const mockGetMatchDetailsUseCase = {
      execute: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchController],
      providers: [
        {
          provide: ProcessLogUseCase,
          useValue: mockProcessLogUseCase,
        },
        {
          provide: GetMatchDetailsUseCase,
          useValue: mockGetMatchDetailsUseCase,
        },
      ],
    }).compile()

    controller = module.get<MatchController>(MatchController)
    processLogUseCase = module.get(ProcessLogUseCase) as jest.Mocked<ProcessLogUseCase>
    getMatchDetailsUseCase = module.get(GetMatchDetailsUseCase) as jest.Mocked<GetMatchDetailsUseCase>
  })

  it('uploadLog delega processamento e retorna UploadResult', async () => {
    processLogUseCase.execute.mockResolvedValue(undefined)

    const fakeFile: any = { buffer: Buffer.from('x'), originalname: 'file.log', size: 10 }

    const res = await controller.uploadLog(fakeFile)

    expect(processLogUseCase.execute).toHaveBeenCalledWith(fakeFile.buffer)
    expect(res.filename).toBe('file.log')
    expect(res.message).toBeDefined()
  })

  it('getMatchBadges retorna badges por jogador', async () => {
    getMatchDetailsUseCase.execute.mockResolvedValue({
      matchId: '1',
      players: { A: { badges: ['X'] } as any }
    } as any)

    const res = await controller.getMatchBadges('1')

    expect(getMatchDetailsUseCase.execute).toHaveBeenCalledWith('1')
    expect(res.matchId).toBe('1')
    expect((res as any).playerBadges['A']).toEqual(['X'])
  })

  it('getMatchTimeline retorna timeline quando presente', async () => {
    getMatchDetailsUseCase.execute.mockResolvedValue({
      matchId: '1',
      players: {},
      timeline: [{ timestamp: new Date(), type: 'x', description: 'd', players: [], severity: 'low' }]
    } as any)

    const res = await controller.getMatchTimeline('1')

    expect(getMatchDetailsUseCase.execute).toHaveBeenCalledWith('1')
    expect(Array.isArray(res)).toBe(true)
  })
})