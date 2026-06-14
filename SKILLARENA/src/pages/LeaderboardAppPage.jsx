import { useEffect, useState } from 'react'
import { homeApi } from '../services/api'
import './AppSectionPage.css'

const LeaderboardAppPage = () => {
  const [leaderboard, setLeaderboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    homeApi
      .get()
      .then((home) => setLeaderboard(home.weeklyLeaderboard))
      .catch((err) => setError(err.message || 'Failed to load leaderboard'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="app-section">
      <div className="app-section-inner">
        <p className="app-section-eyebrow">Leaderboard</p>
        <h1>Weekly leaderboard</h1>
        <p className="app-section-lead">See who is climbing the arena ladder this week.</p>

        {error ? <p className="app-section-error">{error}</p> : null}
        {loading ? <p className="app-section-meta">Loading leaderboard…</p> : null}

        {!loading && leaderboard?.yourRank ? (
          <div className="app-leaderboard-you">
            <span>Your rank</span>
            <strong>#{leaderboard.yourRank}</strong>
          </div>
        ) : null}

        {!loading && leaderboard?.entries?.length ? (
          <div className="app-leaderboard" role="table" aria-label="Weekly leaderboard">
            <div className="app-leaderboard-head" role="row">
              <span role="columnheader">Rank</span>
              <span role="columnheader">Player</span>
              <span role="columnheader">XP</span>
            </div>
            {leaderboard.entries.map((entry) => (
              <div key={entry.rank} className="app-leaderboard-row" role="row">
                <span className="app-leaderboard-rank" role="cell">
                  {entry.rank}
                </span>
                <span className="app-leaderboard-name" role="cell">
                  {entry.name}
                </span>
                <span className="app-leaderboard-xp" role="cell">
                  {entry.xp.toLocaleString()} XP
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {!loading && !error && !leaderboard?.entries?.length ? (
          <div className="app-section-card app-section-card--wide">
            <h2>No rankings yet</h2>
            <p>Check back soon once battles and practice scores start rolling in.</p>
          </div>
        ) : null}
      </div>
    </main>
  )
}

export default LeaderboardAppPage
