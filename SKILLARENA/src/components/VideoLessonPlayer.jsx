import { useCallback, useEffect, useRef, useState } from 'react'
import VideoEmbed from './VideoEmbed'
import { learningApi } from '../services/api'
import './VideoLessonPlayer.css'

const SAVE_INTERVAL_MS = 12000

const VideoLessonPlayer = ({ lessonId, url, title, progress, onCompleted }) => {
  const [position, setPosition] = useState(progress?.lastVideoPositionSeconds || 0)
  const [manualSaving, setManualSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const videoRef = useRef(null)
  const lastSentRef = useRef(0)
  const isCompleted = progress?.status === 'COMPLETED'

  const sendProgress = useCallback(
    async ({ positionSeconds, durationSeconds, manualComplete = false }) => {
      try {
        const result = await learningApi.videoProgress(lessonId, {
          positionSeconds,
          durationSeconds,
          manualComplete,
        })
        if (result.lessonCompleted && onCompleted) {
          onCompleted(result)
          setFeedback(
            result.xp?.earned
              ? `Lesson completed ✓ · +${result.xp.earned} XP`
              : 'Lesson completed ✓',
          )
        } else if (manualComplete) {
          setFeedback('Progress saved')
        }
      } catch (err) {
        setError(err.message || 'Failed to save video progress')
      }
    },
    [lessonId, onCompleted],
  )

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined

    const handleTimeUpdate = () => {
      const current = Math.floor(video.currentTime || 0)
      setPosition(current)
      const now = Date.now()
      if (now - lastSentRef.current < SAVE_INTERVAL_MS) return
      lastSentRef.current = now
      sendProgress({
        positionSeconds: current,
        durationSeconds: Math.floor(video.duration || 0),
      })
    }

    const handleLoaded = () => {
      if (position > 0 && video.duration > position) {
        video.currentTime = position
      }
    }

    const handleLeave = () => {
      sendProgress({
        positionSeconds: Math.floor(video.currentTime || 0),
        durationSeconds: Math.floor(video.duration || 0),
      })
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoaded)
    window.addEventListener('beforeunload', handleLeave)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoaded)
      window.removeEventListener('beforeunload', handleLeave)
      handleLeave()
    }
  }, [position, sendProgress])

  const isDirectVideo = /\.(mp4|webm|ogg)(\?|$)/i.test(String(url || ''))

  const handleManualComplete = async () => {
    setManualSaving(true)
    setError('')
    await sendProgress({
      positionSeconds: position,
      durationSeconds: 0,
      manualComplete: true,
    })
    setManualSaving(false)
  }

  return (
    <div className="video-lesson-player">
      {isDirectVideo ? (
        <video ref={videoRef} controls playsInline src={url?.trim()} title={title} />
      ) : (
        <>
          <VideoEmbed url={url} title={title} />
          <p className="video-lesson-player-note">
            Embedded videos may not report watch progress. Use the button below if you finished
            watching.
          </p>
        </>
      )}

      <div className="video-lesson-player-actions">
        {!isCompleted ? (
          <button
            type="button"
            className="app-section-button"
            onClick={handleManualComplete}
            disabled={manualSaving}
          >
            {manualSaving ? 'Saving…' : 'Mark as Complete'}
          </button>
        ) : (
          <p className="video-lesson-player-complete" aria-live="polite">
            Completed ✓
          </p>
        )}
      </div>

      {feedback ? <p className="video-lesson-player-feedback">{feedback}</p> : null}
      {error ? <p className="app-section-error">{error}</p> : null}
    </div>
  )
}

export default VideoLessonPlayer
