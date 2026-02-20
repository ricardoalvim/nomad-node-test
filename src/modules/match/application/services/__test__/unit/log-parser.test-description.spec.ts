import { Test, TestingModule } from '@nestjs/testing'
import { LogParserService } from '../../log-parser.service'
import { Award } from 'src/shared/enum/award.enum'

describe('LogParserService - Nomad Test Description Case', () => {
    let service: LogParserService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [LogParserService],
        }).compile()

        service = module.get<LogParserService>(LogParserService)
    })

    it('Requisito: Processar múltiplas rodadas em um arquivo', () => {
        const logContent = `23/04/2019 15:34:22 - New match 11348965 has started
23/04/2019 15:36:04 - Roman killed Nick using M16
23/04/2019 15:36:33 - <WORLD> killed Nick by DROWN
23/04/2019 15:39:22 - Match 11348965 has ended

23/04/2021 16:14:22 - New match 11348966 has started
23/04/2021 16:26:04 - Roman killed Marcus using M16
23/04/2021 16:36:33 - <WORLD> killed Marcus by DROWN
23/04/2021 16:49:22 - Match 11348966 has ended

24/04/2020 16:14:22 - New match 11348961 has started
24/04/2020 16:26:12 - Roman killed Marcus using M16
24/04/2020 16:35:56 - Marcus killed Jhon using AK47
24/04/2020 17:12:34 - Roman killed Bryian using M16
24/04/2020 18:26:14 - Bryan killed Marcus using AK47
24/04/2020 19:36:33 - <WORLD> killed Marcus by DROWN
24/04/2020 20:19:22 - Match 11348961 has ended`

        const matches = service.parseLogContent(logContent)

        // Deve processar 3 partidas
        expect(matches).toHaveLength(3)

        // Partida 1: Roman matou Nick 1x (M16), Nick morreu 2x (Roman + WORLD)
        const match1 = matches[0]
        expect(match1.matchId).toBe('11348965')
        expect(match1.players['Roman'].frags).toBe(1)
        expect(match1.players['Nick'].deaths).toBe(2)

        // Partida 3: Roman 2 kills, Marcus 1, Bryan 1
        const match3 = matches[2]
        expect(match3.players['Roman'].frags).toBe(2)
        expect(match3.players['Marcus'].frags).toBe(1)
        expect(match3.players['Bryan'].frags).toBe(1)
    })

    it('Requisito: Ignorar frags do <WORLD>', () => {
        const logContent = `23/04/2019 15:34:22 - New match 1 has started
23/04/2019 15:36:04 - Roman killed Nick using M16
23/04/2019 15:36:33 - <WORLD> killed Nick by DROWN
23/04/2019 15:39:22 - Match 1 has ended`

        const matches = service.parseLogContent(logContent)
        const match = matches[0]

        // WORLD não aparece em players
        expect(match.players['<WORLD>']).toBeUndefined()

        // Nick: 2 deaths (Roman + WORLD), 0 frags
        expect(match.players['Nick'].deaths).toBe(2)
        expect(match.players['Nick'].frags).toBe(0)
    })

    it('Requisito: Limitar a 20 jogadores', () => {
        const lines = ['23/04/2019 15:34:22 - New match 1 has started']

        // Criar 25 jogadores
        for (let i = 1; i <= 25; i++) {
            const killer = `Player${i}`
            const victim = `Player${i === 25 ? 1 : i + 1}`
            lines.push(`23/04/2019 15:${String(i).padStart(2, '0')}:00 - ${killer} killed ${victim} using M16`)
        }
        lines.push('23/04/2019 15:59:22 - Match 1 has ended')

        const matches = service.parseLogContent(lines.join('\n'))
        const playerCount = Object.keys(matches[0].players).length

        // Máximo 20 jogadores
        expect(playerCount).toBeLessThanOrEqual(20)
    })

    it('Bônus: Arma preferida do vencedor', () => {
        const logContent = `23/04/2019 15:34:22 - New match 1 has started
23/04/2019 15:36:04 - Roman killed A using M16
23/04/2019 15:36:05 - Roman killed B using M16
23/04/2019 15:36:06 - Roman killed C using AK47
23/04/2019 15:39:22 - Match 1 has ended`

        const matches = service.parseLogContent(logContent)

        // Roman: 3 kills (M16x2, AK47x1) -> M16 é favorita
        expect(matches[0].winningWeapon).toBe('M16')
    })

    it('Bônus: Maior sequência (streak)', () => {
        const logContent = `23/04/2019 15:34:22 - New match 1 has started
23/04/2019 15:36:00 - Roman killed A using M16
23/04/2019 15:36:05 - Roman killed B using M16
23/04/2019 15:36:10 - Roman killed C using M16
23/04/2019 15:36:15 - Roman killed D using M16
23/04/2019 15:36:20 - Roman killed E using M16
23/04/2019 15:36:25 - Nick killed Roman using AK47
23/04/2019 15:39:22 - Match 1 has ended`

        const matches = service.parseLogContent(logContent)
        const roman = matches[0].players['Roman']

        // 5 kills consecutivos sem morrer
        expect(roman.longestStreak).toBe(5)
    })

    it('Bônus: Award Immortal (0 deaths, >0 frags)', () => {
        const logContent = `23/04/2019 15:34:22 - New match 1 has started
23/04/2019 15:36:04 - Roman killed A using M16
23/04/2019 15:36:05 - Roman killed B using M16
23/04/2019 15:39:22 - Match 1 has ended`

        const matches = service.parseLogContent(logContent)
        const roman = matches[0].players['Roman']

        expect(roman.frags).toBeGreaterThan(0)
        expect(roman.deaths).toBe(0)
        expect((roman as any).awards).toContain(Award.Immortal)
    })

    it('Bônus: Award Rambo (5 kills em 60s)', () => {
        const logContent = `23/04/2019 15:34:22 - New match 1 has started
23/04/2019 15:36:00 - Roman killed A using M16
23/04/2019 15:36:10 - Roman killed B using M16
23/04/2019 15:36:20 - Roman killed C using M16
23/04/2019 15:36:30 - Roman killed D using M16
23/04/2019 15:36:40 - Roman killed E using M16
23/04/2019 15:39:22 - Match 1 has ended`

        const matches = service.parseLogContent(logContent)
        const roman = matches[0].players['Roman']

        // 5 kills em 40 segundos
        expect((roman as any).awards).toContain(Award.Rambo)
    })
})
