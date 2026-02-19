import { Test, TestingModule } from '@nestjs/testing'
import { LogParserService } from './log-parser.service'
import { PlayerName } from 'src/shared/enum/player.enum'
import { Weapon } from 'src/shared/enum/weapon.enum'

describe('LogParserService', () => {
  let service: LogParserService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogParserService],
    }).compile()

    service = module.get<LogParserService>(LogParserService)
  })

  it('deve estar definido', () => {
    expect(service).toBeDefined()
  })

  it('deve processar uma partida corretamente e ignorar frags do <WORLD>', () => {
    // Usando exatamente o log do enunciado
    const logContent = `
  23/04/2019 15:34:22 - New match 11348965 has started
  23/04/2019 15:36:04 - ${PlayerName.Roman} killed ${PlayerName.Nick} using M16
  23/04/2019 15:36:33 - ${PlayerName.World} killed ${PlayerName.Nick} by DROWN
  23/04/2019 15:39:22 - Match 11348965 has ended
    `.trim()

    const matches = service.parseLogContent(logContent)

    // Garante que achou apenas 1 partida
    expect(matches).toHaveLength(1)

    const match = matches[0]
    expect(match.matchId).toBe('11348965')

    // Verifica o Atirador (Roman)
    const roman = match.players[PlayerName.Roman]
    expect(roman).toBeDefined()
    expect(roman.frags).toBe(1)
    expect(roman.deaths).toBe(0)
    expect(roman.weapons[Weapon.M16]).toBe(1)
    expect(roman.longestStreak).toBe(1)

    // Verifica a Vítima (Nick)
    const nick = match.players[PlayerName.Nick]
    expect(nick).toBeDefined()
    expect(nick.frags).toBe(0)
    expect(nick.deaths).toBe(2) // Morreu pro Roman e pro WORLD
  })

  it('deve processar logs com múltiplas partidas em sequência', () => {
    const logContent = `
23/04/2019 15:34:22 - New match 1 has started
23/04/2019 15:36:04 - A killed B using AK47
23/04/2019 15:39:22 - Match 1 has ended
24/04/2019 16:14:22 - New match 2 has started
24/04/2019 16:26:04 - C killed D using M16
24/04/2019 16:49:22 - Match 2 has ended
    `.trim()

    const matches = service.parseLogContent(logContent)

    expect(matches).toHaveLength(2)
    expect(matches[0].matchId).toBe('1')
    expect(matches[1].matchId).toBe('2')
    expect(matches[0].players['A'].frags).toBe(1)
    expect(matches[1].players['C'].frags).toBe(1)
  })

  it('deve calcular corretamente o maior streak (sequência) do jogador', () => {
    const logContent = `
  23/04/2019 15:34:22 - New match 1 has started
  23/04/2019 15:36:00 - ${PlayerName.Roman} killed A using M16
  23/04/2019 15:36:10 - ${PlayerName.Roman} killed B using M16
  23/04/2019 15:36:20 - ${PlayerName.Roman} killed C using M16
  23/04/2019 15:36:30 - D killed ${PlayerName.Roman} using AK47
  23/04/2019 15:36:40 - ${PlayerName.Roman} killed E using M16
  23/04/2019 15:39:22 - Match 1 has ended
    `.trim()

    const matches = service.parseLogContent(logContent)
    const roman = matches[0].players[PlayerName.Roman]

    expect(roman.frags).toBe(4)
    expect(roman.deaths).toBe(1)
    expect(roman.longestStreak).toBe(3)
  })
})
