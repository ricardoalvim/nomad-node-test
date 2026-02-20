import { Badge } from "src/shared/enum/badge.enum"

export interface BadgesResponse {
    matchId: string
    playerBadges: Record<string, Badge[]>
}
