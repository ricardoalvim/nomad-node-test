import { ParsedMatch } from '../../application/services/log-parser.service'
import { MatchEntity } from '../../infra/persistence/match.schema'

export abstract class MatchRepository {
    abstract save(match: ParsedMatch, winningWeapon: string | null): Promise<void>
    abstract findById(matchId: string): Promise<MatchEntity | null>
    abstract findAll(): Promise<MatchEntity[]>
}