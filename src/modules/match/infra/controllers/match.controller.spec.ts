import { Test, TestingModule } from '@nestjs/testing'
import { MatchController } from './match.controller'

describe('MatchController', () => {
    let controller: MatchController

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [MatchController],
        }).compile()

        controller = module.get<MatchController>(MatchController)
    })

    it('deve aceitar o upload de um arquivo e retornar a mensagem de sucesso', async () => {
        // Simulamos o objeto de arquivo (Express.Multer.File)
        const mockFile = {
            originalname: 'test-log.txt',
            size: 1024,
            buffer: Buffer.from('linha de teste'),
        } as Express.Multer.File

        const result = await controller.uploadLog(mockFile)

        expect(result).toEqual({
            message: 'Arquivo recebido com sucesso!',
            filename: 'test-log.txt',
            size: 1024,
        })
    })
})