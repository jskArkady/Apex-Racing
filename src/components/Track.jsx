import { getTrackPreset } from '../utils/trackData'
import useTrackAssets from './useTrackAssets'
import TrackSurface from './TrackSurface'
import TrackScenery from './TrackScenery'
export { createTrackTrimeshArgs } from './useTrackAssets'

export default function Track({ track = getTrackPreset() }) {
  const activeTrack = track ?? getTrackPreset()
  const assets = useTrackAssets({ track: activeTrack })
  return <group>
    <TrackSurface track={activeTrack} assets={assets} />
    <TrackScenery assets={assets} />
  </group>
}
