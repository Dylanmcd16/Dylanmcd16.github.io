export type HeroSceneVariant = 'plrb' | 'corteva'

const HERO_IMAGES: Record<HeroSceneVariant, { src: string; alt: string }> = {
  plrb: {
    src: '/smoke_map_hero.png',
    alt: 'Smoke analysis map showing weather data visualization',
  },
  corteva: {
    src: '/station_image.jpeg',
    alt: 'Field sensing station used for agronomic data collection',
  },
}

/**
 * Decorative background image for the professional case-study hero.
 *
 * Both variants show a real photograph that bleeds off the right edge of
 * the page and dissolves toward the left via a CSS mask — the same fade
 * grammar as the original SVG scenes.
 */
export function CaseStudyHeroScene({ variant }: { variant: HeroSceneVariant }) {
  const { src, alt } = HERO_IMAGES[variant]

  return (
    <div
      className={`case-hero-scene case-hero-scene--${variant}`}
      aria-hidden="true"
    >
      <img
        className="case-hero-photo"
        src={src}
        alt={alt}
        loading="eager"
        draggable={false}
      />
    </div>
  )
}
