interface OverlayControlsProps {
  showReports: boolean
  showWarnings: boolean
  showPostEventAssessments: boolean
  onShowReports: (value: boolean) => void
  onShowWarnings: (value: boolean) => void
  onShowPostEventAssessments: (value: boolean) => void
}

export function OverlayControls({
  showReports,
  showWarnings,
  showPostEventAssessments,
  onShowReports,
  onShowWarnings,
  onShowPostEventAssessments,
}: OverlayControlsProps) {
  return (
    <div className="swx-control">
      <h3 className="swx-control__title">Overlays</h3>
      <div className="swx-overlay-list">
        <label className="swx-checkbox">
          <input
            type="checkbox"
            checked={showReports}
            onChange={(event) => onShowReports(event.target.checked)}
          />
          Storm reports
        </label>
        <label className="swx-checkbox">
          <input
            type="checkbox"
            checked={showWarnings}
            onChange={(event) => onShowWarnings(event.target.checked)}
          />
          NWS warnings
        </label>
        <label className="swx-checkbox swx-checkbox--warn">
          <input
            type="checkbox"
            checked={showPostEventAssessments}
            onChange={(event) => onShowPostEventAssessments(event.target.checked)}
          />
          Post-event damage assessment
        </label>
      </div>
      {showPostEventAssessments && (
        <p className="swx-disclosure" role="note">
          Post-event analysis. These features were not available during the live event.
        </p>
      )}
    </div>
  )
}
