import { useCallback, useEffect, useRef, useState } from 'react'
import type { Locale, NarrationTrack } from '../../content/types'

type NarrationState = 'idle' | 'playing' | 'paused' | 'unavailable'

export function useNarration(track: NarrationTrack | undefined, locale: Locale) {
  const [state, setState] = useState<NarrationState>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
      audioRef.current = null
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    utteranceRef.current = null
    setState(track ? 'idle' : 'unavailable')
  }, [track])

  useEffect(() => stop, [stop])

  const toggle = useCallback(async () => {
    if (!track) return
    if (track.audioSrc) {
      let audio = audioRef.current
      if (!audio) {
        audio = new Audio(track.audioSrc)
        audio.onended = () => setState('idle')
        audioRef.current = audio
      }
      if (state === 'playing') {
        audio.pause()
        setState('paused')
      } else {
        await audio.play()
        setState('playing')
      }
      return
    }
    if (!('speechSynthesis' in window)) {
      setState('unavailable')
      return
    }
    if (state === 'playing') {
      window.speechSynthesis.pause()
      setState('paused')
    } else if (state === 'paused') {
      window.speechSynthesis.resume()
      setState('playing')
    } else {
      const utterance = new SpeechSynthesisUtterance(track.transcript)
      utterance.lang = locale === 'ru' ? 'ru-RU' : 'en-US'
      utterance.rate = 0.94
      utterance.onend = () => setState('idle')
      utterance.onerror = () => setState('unavailable')
      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
      setState('playing')
    }
  }, [locale, state, track])

  return { state, toggle, stop }
}

