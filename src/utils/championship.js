import { sortRacersWithCheckpoints, getRacerRank } from './raceLogic'

export const CHAMPIONSHIP_POINTS = Object.freeze([10, 6, 4, 2])
export const RACER_NAMES = Object.freeze({ player: 'You', ai_1: 'Blue', ai_2: 'Green', ai_3: 'Orange' })

export function finishChampionshipRound(championship, racers) {
  if (!championship || championship.results.length > championship.round) return championship
  const sorted = sortRacersWithCheckpoints(racers)
  const result = sorted.map(racer => ({
    id: racer.id,
    position: getRacerRank(sorted, racer.id),
    points: CHAMPIONSHIP_POINTS[getRacerRank(sorted, racer.id) - 1] ?? 0,
    finished: racer.finished,
  }))
  return { ...championship, results: [...championship.results, result] }
}

export function championshipStandings(championship) {
  const scores = Object.keys(RACER_NAMES).map(id => ({
    id, points: (championship?.results ?? []).reduce((sum, result) => (
      sum + (result.find(racer => racer.id === id)?.points ?? 0)
    ), 0),
  }))
  return scores.sort((a, b) => b.points - a.points || a.id.localeCompare(b.id))
    .map((racer, _, sorted) => ({
      ...racer, position: sorted.findIndex(other => other.points === racer.points) + 1,
    }))
}
