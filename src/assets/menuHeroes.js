import apexWide640 from './ui/menu/apex-gp-hero-wide-640.webp'
import apexWide1280 from './ui/menu/apex-gp-hero-wide-1280.webp'
import apexWide1672 from './ui/menu/apex-gp-hero-wide-1672.webp'
import apexPortrait480 from './ui/menu/apex-gp-hero-portrait-480.webp'
import apexPortrait720 from './ui/menu/apex-gp-hero-portrait-720.webp'
import apexPortrait941 from './ui/menu/apex-gp-hero-portrait-941.webp'
import harbourWide640 from './ui/menu/harbour-street-hero-wide-640.webp'
import harbourWide1280 from './ui/menu/harbour-street-hero-wide-1280.webp'
import harbourWide1672 from './ui/menu/harbour-street-hero-wide-1672.webp'
import harbourPortrait480 from './ui/menu/harbour-street-hero-portrait-480.webp'
import harbourPortrait720 from './ui/menu/harbour-street-hero-portrait-720.webp'
import harbourPortrait941 from './ui/menu/harbour-street-hero-portrait-941.webp'
import templeWide640 from './ui/menu/temple-speedway-hero-wide-640.webp'
import templeWide1280 from './ui/menu/temple-speedway-hero-wide-1280.webp'
import templeWide1672 from './ui/menu/temple-speedway-hero-wide-1672.webp'
import templePortrait480 from './ui/menu/temple-speedway-hero-portrait-480.webp'
import templePortrait720 from './ui/menu/temple-speedway-hero-portrait-720.webp'
import templePortrait941 from './ui/menu/temple-speedway-hero-portrait-941.webp'

const createResponsiveAsset = (src, candidates, width, height) => Object.freeze({
  src,
  srcSet: candidates.map(([url, candidateWidth]) => `${url} ${candidateWidth}w`).join(', '),
  width,
  height,
})

const apexHero = Object.freeze({
  wide: createResponsiveAsset(
    apexWide1280,
    [
      [apexWide640, 640],
      [apexWide1280, 1280],
      [apexWide1672, 1672],
    ],
    1672,
    941,
  ),
  portrait: createResponsiveAsset(
    apexPortrait720,
    [
      [apexPortrait480, 480],
      [apexPortrait720, 720],
      [apexPortrait941, 941],
    ],
    941,
    1672,
  ),
})

const harbourHero = Object.freeze({
  wide: createResponsiveAsset(
    harbourWide1280,
    [
      [harbourWide640, 640],
      [harbourWide1280, 1280],
      [harbourWide1672, 1672],
    ],
    1672,
    941,
  ),
  portrait: createResponsiveAsset(
    harbourPortrait720,
    [
      [harbourPortrait480, 480],
      [harbourPortrait720, 720],
      [harbourPortrait941, 941],
    ],
    941,
    1672,
  ),
})

const templeHero = Object.freeze({
  wide: createResponsiveAsset(
    templeWide1280,
    [
      [templeWide640, 640],
      [templeWide1280, 1280],
      [templeWide1672, 1672],
    ],
    1672,
    941,
  ),
  portrait: createResponsiveAsset(
    templePortrait720,
    [
      [templePortrait480, 480],
      [templePortrait720, 720],
      [templePortrait941, 941],
    ],
    941,
    1672,
  ),
})

export const MENU_HEROES = Object.freeze({
  apex_gp: apexHero,
  harbour_street: harbourHero,
  temple_speedway: templeHero,
})

export function getMenuHero(trackId) {
  return MENU_HEROES[trackId] ?? null
}
