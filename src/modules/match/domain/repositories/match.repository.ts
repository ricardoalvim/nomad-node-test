import { ParsedMatch } from 'src/shared/interfaces/match.interfaces'
import { MatchEntity } from '../../infra/persistence/match.schema'
import { Weapon } from 'src/shared/weapon.enum'

export abstract class MatchRepository {
  abstract save(match: ParsedMatch, winningWeapon: Weapon | null): Promise<void>
  abstract findById(matchId: string): Promise<MatchEntity | null>
  abstract findAll(): Promise<MatchEntity[]>
}
