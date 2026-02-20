import { ParsedMatch } from 'src/shared/interfaces/match.interfaces'
import { MatchEntity } from '../../infra/persistence/model/match.model'

export abstract class MatchRepository {
  abstract save(match: ParsedMatch): Promise<void>
  abstract findById(matchId: string): Promise<MatchEntity | null>
  abstract findAll(): Promise<MatchEntity[]>
  abstract findPlayersInteractions(p1: string, p2: string): Promise<ParsedMatch[]>
}
