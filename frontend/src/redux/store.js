import { configureStore } from '@reduxjs/toolkit'
import componentReducer from './slices/componentSlice'
import historyReducer from './slices/historySlice'
import promptReducer from './slices/promptSlice'
import uiReducer from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    prompt: promptReducer,
    component: componentReducer,
    history: historyReducer,
    ui: uiReducer,
  },
})

