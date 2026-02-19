export const ApiRoutes = {
    MatchesUpload: '/matches/upload',
    MatchesById: (id = ':id') => `/matches/${id}`,
    RankingGlobal: '/ranking/global',
} as const
