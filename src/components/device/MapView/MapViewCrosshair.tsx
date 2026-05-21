import './MapViewCrosshair.css'

interface MapViewCrosshairProps {
  visible: boolean
  isInteracting: boolean
}

/**
 * MapViewCrosshair displays a crosshair indicator at the center of the map
 * when metadata toggle is enabled. Shows a smaller outer circle at rest,
 * and expands to a larger outer circle when the map is being interacted with.
 */
export default function MapViewCrosshair({ visible, isInteracting }: MapViewCrosshairProps) {
  if (!visible) return null

  // Use fixed viewBox that accommodates both states (400x400 to fit r=200 circle)
  // Rest state: outer circle r=75
  // Active state: outer circle r=200
  // Center circle always r=25
  // Center always at 200,200 (middle of 400 viewBox)
  
  const viewBoxSize = 400
  const centerX = 200
  const centerY = 200
  const centerRadius = 25
  const outerRadiusRest = 75
  const outerRadiusActive = 200
  const outerStrokeWidth = 5

  return (
    <div className={`mapview-crosshair ${isInteracting ? 'mapview-crosshair--interacting' : ''}`}>
      <svg
        width="200"
        height="200"
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="filter0_dropShadow" x="0" y="0" width={viewBoxSize} height={viewBoxSize} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset/>
            <feGaussianBlur stdDeviation="25"/>
            <feComposite in2="hardAlpha" operator="out"/>
            <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0"/>
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
          </filter>
          <filter id="filter1_dropShadow" x={centerX - 72} y={centerY - 72} width="144" height="144" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset/>
            <feGaussianBlur stdDeviation="25"/>
            <feComposite in2="hardAlpha" operator="out"/>
            <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0"/>
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
          </filter>
        </defs>
        {/* Outer circle */}
        <g filter="url(#filter0_dropShadow)">
          <circle 
            cx={centerX} 
            cy={centerY} 
            r={isInteracting ? outerRadiusActive : outerRadiusRest}
            fill="white" 
            fillOpacity="0.5" 
            shapeRendering="crispEdges"
            className="mapview-crosshair__outer-circle"
          />
          <circle 
            cx={centerX} 
            cy={centerY} 
            r={isInteracting ? outerRadiusActive - outerStrokeWidth / 2 : outerRadiusRest - outerStrokeWidth / 2}
            stroke="#649DFF" 
            strokeWidth={outerStrokeWidth}
            shapeRendering="crispEdges"
            fill="none"
            className="mapview-crosshair__outer-stroke"
          />
        </g>
        {/* Center circle */}
        <g filter="url(#filter1_dropShadow)">
          <circle 
            cx={centerX} 
            cy={centerY} 
            r={centerRadius} 
            fill="#649DFF"
            className="mapview-crosshair__center-circle"
          />
        </g>
      </svg>
    </div>
  )
}

