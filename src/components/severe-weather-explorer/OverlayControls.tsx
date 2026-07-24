interface OverlayControlsProps {
  showReports: boolean
  showWarnings: boolean
  showPostEventAssessments: boolean
  onShowReports: (value: boolean) => void
  onShowWarnings: (value: boolean) => void
  onShowPostEventAssessments: (value: boolean) => void
  reportsUnavailable?: boolean
  warningsUnavailable?: boolean
  assessmentsUnavailable?: boolean
}

export function OverlayControls({
  showReports,
  showWarnings,
  showPostEventAssessments,
  onShowReports,
  onShowWarnings,
  onShowPostEventAssessments,
  reportsUnavailable,
  warningsUnavailable,
  assessmentsUnavailable,
}: OverlayControlsProps) {
  return (
    <div className="swx-control">
      <h3 className="swx-control__title">Overlays</h3>
      <div className="swx-overlay-list">
        <label className={`swx-checkbox ${reportsUnavailable ? 'is-unavailable' : ''}`}>
          <input
            type="checkbox"
            checked={showReports && !reportsUnavailable}
            disabled={reportsUnavailable}
            onChange={(event) => onShowReports(event.target.checked)}
          />
          Storm reports{reportsUnavailable && ' (unavailable)'}
        </label>
        <label className={`swx-checkbox ${warningsUnavailable ? 'is-unavailable' : ''}`}>
          <input
            type="checkbox"
            checked={showWarnings && !warningsUnavailable}
            disabled={warningsUnavailable}
            onChange={(event) => onShowWarnings(event.target.checked)}
          />
          NWS warnings{warningsUnavailable && ' (unavailable)'}
        </label>
        <label className={`swx-checkbox swx-checkbox--warn ${assessmentsUnavailable ? 'is-unavailable' : ''}`}>
          <input
            type="checkbox"
            checked={showPostEventAssessments && !assessmentsUnavailable}
            disabled={assessmentsUnavailable}
            onChange={(event) => onShowPostEventAssessments(event.target.checked)}
          />
          Post-event damage assessment{assessmentsUnavailable && ' (unavailable)'}
        </label>
      </div>
      {showPostEventAssessments && !assessmentsUnavailable && (
        <p className="swx-disclosure" role="note">
          Post-event analysis. These features were not available during the live event.
        </p>
      )}
    </div>
  )
}
