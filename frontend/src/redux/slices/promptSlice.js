import { createSlice } from '@reduxjs/toolkit'

const promptSlice = createSlice({
  name: 'prompt',
  initialState: {
    value: '',
  },
  reducers: {
    setPrompt(state, action) {
      state.value = action.payload ?? ''
    },
    clearPrompt(state) {
      state.value = ''
    },
  },
})

export const { setPrompt, clearPrompt } = promptSlice.actions
export default promptSlice.reducer

