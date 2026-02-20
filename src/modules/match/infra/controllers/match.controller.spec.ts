import { Test, TestingModule } from '@nestjs/testing'
import { MatchController } from './match.controller'
import { ProcessLogUseCase } from '../../application/use-cases/process-log.use-case'
import { GetMatchDetailsUseCase } from '../../application/use-cases/get-match-details.use-case'
import { Badge } from 'src/shared/enum/badge.enum'

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

  it('uploadLog delega processamento e retorna UploadResult', async () => {
    processLogUseCase.execute.mockResolvedValue(undefined)
    const fakeFile: any = { buffer: Buffer.from('x'), originalname: 'file.log', size: 10 }

    const res = await controller.uploadLog(fakeFile)
    expect(processLogUseCase.execute).toHaveBeenCalledWith(fakeFile.buffer)
    expect(res.filename).toBe('file.log')
  })

  it('getMatchDetails retorna detalhes do caso de uso', async () => {
    const fakeMatch: any = { matchId: '123', players: {} }
    getMatchDetailsUseCase.execute.mockResolvedValue(fakeMatch)

    const res = await controller.getMatchDetails('123')
    expect(getMatchDetailsUseCase.execute).toHaveBeenCalledWith('123')
    expect(res).toEqual(fakeMatch)
  })

  it('getMatchBadges retorna as badges por jogador', async () => {
    getMatchDetailsUseCase.execute.mockResolvedValue({
      matchId: '123',
      players: { Roman: { badges: [Badge.Flawless] as any } }
    } as any)

    const res = await controller.getMatchBadges('123')
    expect(res.matchId).toBe('123')
    expect(res.playerBadges['Roman']).toEqual([Badge.Flawless])
  })

  it('getMatchTimeline retorna a timeline quando presente', async () => {
    getMatchDetailsUseCase.execute.mockResolvedValue({
      matchId: '123',
      players: {},
      timeline: [{ description: 'First Blood' }]
    } as any)

    const res = await controller.getMatchTimeline('123')
    expect(res).toHaveLength(1)
    expect(res[0].description).toBe('First Blood')
  })

  it('getMatchBadges retorna array vazio se o jogador não tiver badges', async () => {
    getMatchDetailsUseCase.execute.mockResolvedValue({
      matchId: '123',
      players: { Roman: {} as any }
    } as any)

    const res = await controller.getMatchBadges('123')
    expect(res.playerBadges['Roman']).toEqual([])
  })

  it('getMatchTimeline retorna array vazio se não houver timeline', async () => {
    getMatchDetailsUseCase.execute.mockResolvedValue({
      matchId: '123',
      players: {},
      timeline: undefined
    } as any)

    const res = await controller.getMatchTimeline('123')
    expect(res).toEqual([])
  })
})