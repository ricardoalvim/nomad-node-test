import { Injectable } from '@nestjs/common'

// Interfaces locais para tipar o retorno provisório antes de ir pro banco
export interface ParsedPlayer {
    name: string
    frags: number
    deaths: number
    weapons: Record<string, number>
    currentStreak: number
    longestStreak: number
    killTimestamps: Date[]
}

export interface ParsedMatch {
    matchId: string
    players: Record<string, ParsedPlayer>
}

@Injectable()
export class LogParserService {
    // Regex para extrair a data e a ação principal da linha
    private readonly LINE_REGEX = /^(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}) - (.*)$/
    private readonly MATCH_START_REGEX = /New match (\d+) has started/
    private readonly MATCH_END_REGEX = /Match (\d+) has ended/
    private readonly WORLD_KILL_REGEX = /<WORLD> killed (.*) by/
    private readonly PLAYER_KILL_REGEX = /(.*) killed (.*) using (.*)/

    parseLogContent(content: string): ParsedMatch[] {
        const lines = content.split('\n')
        const matches: ParsedMatch[] = []
        let currentMatch: ParsedMatch | null = null

        for (const rawLine of lines) {
            const lineMatch = rawLine.match(this.LINE_REGEX)
            if (!lineMatch) continue

            const dateStr = lineMatch[1] // ex: 23/04/2019 15:36:04
            const action = lineMatch[2]  // ex: Roman killed Nick using M16

            // 1. Início de Partida
            const startMatch = action.match(this.MATCH_START_REGEX)
            if (startMatch) {
                currentMatch = {
                    matchId: startMatch[1],
                    players: {},
                }
                continue
            }

            // Se não tem partida rolando, ignora as linhas
            if (!currentMatch) continue

            // 2. Fim de Partida
            const endMatch = action.match(this.MATCH_END_REGEX)
            if (endMatch) {
                matches.push(currentMatch)
                currentMatch = null
                continue
            }

            // 3. Morte pelo Mundo (WORLD)
            const worldKillMatch = action.match(this.WORLD_KILL_REGEX)
            if (worldKillMatch) {
                const victimName = worldKillMatch[1]
                this.ensurePlayerExists(currentMatch, victimName)

                const victim = currentMatch.players[victimName]
                victim.deaths += 1
                victim.currentStreak = 0 // Zerou o streak porque morreu
                continue
            }

            // 4. Morte entre Jogadores (Player kill)
            const playerKillMatch = action.match(this.PLAYER_KILL_REGEX)
            if (playerKillMatch) {
                const killerName = playerKillMatch[1]
                const victimName = playerKillMatch[2]
                const weapon = playerKillMatch[3]

                this.ensurePlayerExists(currentMatch, killerName)
                this.ensurePlayerExists(currentMatch, victimName)

                const killer = currentMatch.players[killerName]
                const victim = currentMatch.players[victimName]

                // Atualiza o Atirador
                if (killerName !== victimName) {
                    killer.frags += 1
                    killer.currentStreak += 1
                    if (killer.currentStreak > killer.longestStreak) {
                        killer.longestStreak = killer.currentStreak
                    }

                    killer.weapons[weapon] = (killer.weapons[weapon] || 0) + 1

                    // Guarda o timestamp para o cálculo de 5 kills / 1 min depois
                    // O formato DD/MM/YYYY HH:mm:ss precisa de parse correto no Date, 
                    // mas vamos simplificar a string por enquanto.
                    killer.killTimestamps.push(this.parseDate(dateStr))
                }

                // Atualiza a Vítima
                victim.deaths += 1
                victim.currentStreak = 0

                continue
            }
        }

        return matches
    }

    // Helper para inicializar o jogador caso ele não exista no objeto da partida
    private ensurePlayerExists(match: ParsedMatch, playerName: string) {
        if (!match.players[playerName]) {
            match.players[playerName] = {
                name: playerName,
                frags: 0,
                deaths: 0,
                weapons: {},
                currentStreak: 0,
                longestStreak: 0,
                killTimestamps: [],
            }
        }
    }

    // Helper simples para converter a data do log para objeto Date do JS
    private parseDate(dateStr: string): Date {
        const [datePart, timePart] = dateStr.split(' ')
        const [day, month, year] = datePart.split('/')
        return new Date(`${year}-${month}-${day}T${timePart}Z`)
    }
}