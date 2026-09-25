import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import MainMenu from './MainMenu'
import EndScreen from './EndScreen'
import { TRACK_PRESETS } from '../utils/trackData'
import { useGameStore } from '../store/gameStore'

const initial = useGameStore.getState()
beforeEach(() => useGameStore.setState({ ...initial, gameState: 'menu' }, true))

it('starts the selected five-lap difficulty and lets players disable ghosts', () => {
  render(<MainMenu />)
  fireEvent.change(screen.getByRole('combobox', { name: 'Laps' }), { target: { value: '5' } })
  fireEvent.change(screen.getByRole('combobox', { name: 'AI difficulty' }), { target: { value: 'easy' } })
  fireEvent.click(screen.getByRole('checkbox', { name: /Personal best ghost/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Start Race', exact: true }))
  expect(useGameStore.getState()).toMatchObject({ maxLaps: 5, raceOptions: { difficulty: 'easy' }, ghostEnabled: false })
})

it('shows cup points, moves to the next track and removes advancement after the final round', () => {
  act(() => {
    useGameStore.getState().startChampionship()
    useGameStore.setState({ gameState: 'playing', currentTime: 100 })
    useGameStore.getState().finishGame()
  })
  render(<EndScreen />)
  expect(screen.getByRole('region', { name: 'Championship standings' })).toHaveTextContent('10 pts')
  expect(screen.getByRole('list', { name: 'Race classification' }).children).toHaveLength(4)
  fireEvent.click(screen.getByRole('button', { name: 'Next Round' }))
  expect(useGameStore.getState()).toMatchObject({ selectedTrackId: 'harbour_street', championship: { round: 1 } })
  act(() => useGameStore.setState({ championship: { ...useGameStore.getState().championship, round: TRACK_PRESETS.length - 1 } }))
  expect(screen.queryByRole('button', { name: 'Next Round' })).not.toBeInTheDocument()
  expect(screen.getByText('Championship complete')).toBeInTheDocument()
})
