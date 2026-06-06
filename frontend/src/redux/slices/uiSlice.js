import { createSlice } from '@reduxjs/toolkit'
import { loadTheme, saveTheme } from '../../lib/storage'

const initialTheme = loadTheme() || (window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light')

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    loading: false,
    error: null,
    theme: initialTheme,
  },
  reducers: {
    setLoading(state, action) {
      state.loading = Boolean(action.payload)
    },
    setError(state, action) {
      state.error = action.payload ?? null
    },
    clearError(state) {
      state.error = null
    },
    setTheme(state, action) {
      const t = action.payload === 'dark' ? 'dark' : 'light'
      state.theme = t
      saveTheme(t)
    },
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark'
      saveTheme(state.theme)
    },
  },
})

export const { setLoading, setError, clearError, setTheme, toggleTheme } = uiSlice.actions
export default uiSlice.reducer

