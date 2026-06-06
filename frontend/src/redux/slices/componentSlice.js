import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { postJSON } from '../../lib/api'
import { setError, setLoading } from './uiSlice'

export const generateComponent = createAsyncThunk(
  'component/generate',
  async ({ prompt, action = 'generate', code } = {}, thunkApi) => {
    thunkApi.dispatch(setLoading(true))
    thunkApi.dispatch(setError(null))
    try {
      const data = await postJSON('/api/generate', { prompt, action, code }, { signal: thunkApi.signal })
      return data
    } catch (e) {
      thunkApi.dispatch(setError(e?.message || 'Something went wrong'))
      return thunkApi.rejectWithValue(e?.message || 'Something went wrong')
    } finally {
      thunkApi.dispatch(setLoading(false))
    }
  }
)

const componentSlice = createSlice({
  name: 'component',
  initialState: {
    code: '',
    explanation: '',
    lastPrompt: '',
    pendingRequestId: null,
  },
  reducers: {
    setCode(state, action) {
      state.code = action.payload ?? ''
    },
    clearComponent(state) {
      state.code = ''
      state.explanation = ''
      state.lastPrompt = ''
    },
  },
  extraReducers: (builder) => {
    builder.addCase(generateComponent.pending, (state, action) => {
      state.pendingRequestId = action.meta.requestId

      const actionType = action.meta.arg?.action || 'generate'
      const requestedPrompt = typeof action.meta.arg?.prompt === 'string' ? action.meta.arg.prompt : ''
      state.lastPrompt = requestedPrompt

      // For a new generation flow, clear stale output so preview never shows old prompt results.
      if (actionType === 'generate' || actionType === 'regenerate') {
        state.code = ''
        state.explanation = ''
      }
    })

    builder.addCase(generateComponent.fulfilled, (state, action) => {
      if (state.pendingRequestId !== action.meta.requestId) return
      state.pendingRequestId = null
      const payload = action.payload || {}
      if (typeof payload.code === 'string') state.code = payload.code
      if (typeof payload.explanation === 'string') state.explanation = payload.explanation
      if (typeof payload.prompt === 'string') state.lastPrompt = payload.prompt
    })

    builder.addCase(generateComponent.rejected, (state, action) => {
      if (state.pendingRequestId === action.meta.requestId) {
        state.pendingRequestId = null
      }
    })
  },
})

export const { setCode, clearComponent } = componentSlice.actions
export default componentSlice.reducer

