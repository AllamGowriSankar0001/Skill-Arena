const AppEmptyState = ({ icon, title, description, action = null }) => (
  <div className="app-empty-state" role="status">
    {icon ? (
      <div className="app-empty-state-icon" aria-hidden="true">
        {icon}
      </div>
    ) : null}
    <h2 className="app-empty-state-title">{title}</h2>
    {description ? <p className="app-empty-state-copy">{description}</p> : null}
    {action ? <div className="app-empty-state-action">{action}</div> : null}
  </div>
)

export default AppEmptyState
