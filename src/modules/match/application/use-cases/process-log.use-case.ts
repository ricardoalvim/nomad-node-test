import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { MatchEntity } from '../../infra/persistence/match.schema'
import { LogParserService, ParsedMatch } from '../services/log-parser.service'

@Injectable()
export class ProcessLogUseCase {
    constructor(
        private readonly logParserService: LogParserService,
        @InjectModel(MatchEntity.name) private readonly matchModel: Model<MatchEntity>,
    ) { }

    async execute(fileBuffer: Buffer): Promise<void> {
        const fileContent = fileBuffer.toString('utf-8')
        const parsedMatches = this.logParserService.parseLogContent(fileContent)

        for (const match of parsedMatches) {
            this.applyBusinessRulesAndAwards(match)
            const winningWeapon = this.getWinningWeapon(match)

            // Faz o upsert para evitar duplicidade caso mandem o mesmo log duas vezes
            await this.matchModel.findOneAndUpdate(
                { matchId: match.matchId },
                {
                    matchId: match.matchId,
                    // Em um parser completo, extrairíamos startTime e endTime do log
                    startTime: new Date(),
                    players: match.players,
                    winningWeapon,
                },
                { upsert: true, new: true },
            )
        }
    }

    private applyBusinessRulesAndAwards(match: ParsedMatch): void {
        for (const playerName in match.players) {
            const player = match.players[playerName]
            const awards: string[] = []

            // Bônus: Award "Imortal"
            if (player.deaths === 0 && player.frags > 0) {
                awards.push('Imortal')
            }

            // Bônus: 5 kills em 1 minuto
            if (this.hasFastKillsStreak(player.killTimestamps)) {
                awards.push('Rambo')
            }

            // Adicionamos os awards no objeto do jogador antes de salvar
            // (Certifique-se de adicionar a propriedade 'awards: string[]' na sua interface ParsedPlayer)
            ; (player as any).awards = awards
        }
    }

    private hasFastKillsStreak(killTimestamps: Date[]): boolean {
        if (killTimestamps.length < 5) return false

        // Garante que os tempos estão em ordem cronológica
        const sortedTimestamps = [...killTimestamps].sort((a, b) => a.getTime() - b.getTime())

        // Percorre o array olhando sempre para a kill atual e a 4 kills para trás
        for (let i = 4; i < sortedTimestamps.length; i++) {
            const timeDiffMs = sortedTimestamps[i].getTime() - sortedTimestamps[i - 4].getTime()

            // 60000 ms = 1 minuto
            if (timeDiffMs <= 60000) {
                return true
            }
        }

        return false
    }

    private getWinningWeapon(match: ParsedMatch): string | null {
        let winner = null
        let maxFrags = -1

        for (const playerName in match.players) {
            const player = match.players[playerName]
            if (player.frags > maxFrags) {
                maxFrags = player.frags
                winner = player
            }
        }

        if (!winner || Object.keys(winner.weapons).length === 0) return null

        // Descobre qual arma o vencedor mais usou
        let bestWeapon = null
        let maxWeaponKills = -1

        for (const weapon in winner.weapons) {
            if (winner.weapons[weapon] > maxWeaponKills) {
                maxWeaponKills = winner.weapons[weapon]
                bestWeapon = weapon
            }
        }

        return bestWeapon
    }
}