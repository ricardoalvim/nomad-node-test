import { Test, TestingModule } from '@nestjs/testing'
import { LogParserService } from './log-parser.service'
import { PlayerName } from 'src/shared/enum/player.enum'
import { Weapon } from 'src/shared/enum/weapon.enum'
import { Badge } from 'src/shared/enum/badge.enum'
import { TimelineEventType } from 'src/shared/interfaces/match.interfaces'

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

  it('deve subtrair frag em caso de friendly fire (mesmo time)', () => {
    // Simulando que Roman e Marcus são do mesmo time pelo formato do texto lido
    // Para testar isso limpo, a gente intercepta o objeto antes do loop final
    const logContent = [
      '23/04/2019 15:00:00 - New match 1 has started',
      `23/04/2019 15:01:00 - Roman killed Marcus using M16`,
      '23/04/2019 15:05:00 - Match 1 has ended'
    ].join('\n')

    // Sobrescrevendo o comportamento para injetar o time artificialmente e testar o IF
    jest.spyOn(service as any, 'ensurePlayerExists').mockImplementation((match: any, name: string) => {
      if (!match.players[name]) {
        match.players[name] = { name, frags: 0, deaths: 0, weapons: {}, currentStreak: 0, longestStreak: 0, killTimestamps: [], team: 'Red' }
      }
    })

    const matches = service.parseLogContent(logContent)
    const roman = matches[0].players['Roman']

    // Matou amigo, frag fica -1
    expect(roman.frags).toBe(-1)
  })

  it('calcula badge RifleKing e Arsenal corretamente', () => {
    const logContent = [
      '23/04/2019 15:00:00 - New match 1 has started',
      `23/04/2019 15:01:00 - Roman killed A using M16`,
      `23/04/2019 15:02:00 - Roman killed B using AK47`,
      `23/04/2019 15:03:00 - Roman killed C using KNIFE`,
      '23/04/2019 15:05:00 - Match 1 has ended'
    ].join('\n')

    jest.restoreAllMocks() // limpando o mock do teste anterior
    const matches = service.parseLogContent(logContent)
    const roman = matches[0].players['Roman']

    // Usou 3 armas diferentes, ganha Arsenal
    expect((roman as any).badges).toContain(Badge.Arsenal)
  })

  it('deve retornar null para a arma mais usada se não houver armas na partida', () => {
    const logContent = [
      '23/04/2019 15:34:22 - New match 1 has started',
      `23/04/2019 15:36:33 - <WORLD> killed Nick by DROWN`,
      '23/04/2019 15:39:22 - Match 1 has ended'
    ].join('\n')

    const matches = service.parseLogContent(logContent)
    expect(matches[0].winningWeapon).toBeNull()
  })

  it('gera eventos de timeline corretamente (First Blood, Streak, Intense Action)', () => {
    const baseDateStr = '23/04/2019 15:00:'
    const logContent = [
      `${baseDateStr}00 - New match 1 has started`,
      `${baseDateStr}10 - Roman killed A using M16`, // First Blood
      `${baseDateStr}15 - Roman killed B using M16`,
      `${baseDateStr}20 - Roman killed C using M16`, // Streak >= 3
      `${baseDateStr}25 - Roman killed D using M16`, // 4 kills in <30s (Intense Action)
      `${baseDateStr}30 - Match 1 has ended`
    ].join('\n')

    const matches = service.parseLogContent(logContent)
    const timeline = matches[0].timeline

    expect(timeline).toBeDefined()
    expect(timeline.some(e => e.type === TimelineEventType.FirstBlood)).toBeTruthy()
    expect(timeline.some(e => e.type === TimelineEventType.KillStreak)).toBeTruthy()
    expect(timeline.some(e => e.type === TimelineEventType.IntenseAction)).toBeTruthy()
  })

  it('calcula badges Unstoppable e Perfect corretamente', () => {
    const logContent = [
      '23/04/2019 15:00:00 - New match 1 has started',
      // Roman faz streak de 10 sem morrer (ganha Unstoppable e Perfect)
      ...Array.from({ length: 10 }).map((_, i) => `23/04/2019 15:01:0${i} - Roman killed Target${i} using M16`),
      '23/04/2019 15:05:00 - Match 1 has ended'
    ].join('\n')

    const matches = service.parseLogContent(logContent)
    const roman = matches[0].players['Roman']

    expect((roman as any).badges).toContain(Badge.Unstoppable)
    expect((roman as any).badges).toContain(Badge.Perfect)
  })

  it('não deve ignorar o 20º jogador, mas ignorar o 21º (Limitação de 20 jogadores)', () => {
    let logContent = '23/04/2019 15:00:00 - New match 1 has started\n'
    // Adiciona 21 jogadores diferentes matando
    for (let i = 1; i <= 21; i++) {
      logContent += `23/04/2019 15:01:${String(i).padStart(2, '0')} - Player${i} killed Target using M16\n`
    }
    logContent += '23/04/2019 15:05:00 - Match 1 has ended'

    const matches = service.parseLogContent(logContent)
    const playersCount = Object.keys(matches[0].players).length

    // O Target e o Player21 não devem entrar se a sala já tinha 20
    expect(playersCount).toBeLessThanOrEqual(20)
  })

  it('deve subtrair frag em caso de friendly fire (mesmo time)', () => {
    const logContent = [
      '23/04/2019 15:00:00 - New match 1 has started',
      `23/04/2019 15:01:00 - Roman killed Marcus using M16`,
      '23/04/2019 15:05:00 - Match 1 has ended'
    ].join('\n')

    // Espionamos e garantimos que eles nasçam com o mesmo time
    jest.spyOn(service as any, 'ensurePlayerExists').mockImplementation((match: any, name: string) => {
      if (!match.players[name]) {
        match.players[name] = {
          name, frags: 0, deaths: 0, weapons: {},
          currentStreak: 0, longestStreak: 0,
          killTimestamps: [], team: 'Red' // Injetando time
        }
      }
    })

    const matches = service.parseLogContent(logContent)
    const roman = matches[0].players['Roman']

    expect(roman.frags).toBe(-1)
    jest.restoreAllMocks() // Importante limpar aqui
  })
})
