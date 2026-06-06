import { createSlice, nanoid } from '@reduxjs/toolkit'
import { loadHistory, saveHistory } from '../../lib/storage'

const initialItems = loadHistory()

const historySlice = createSlice({
  name: 'history',
  initialState: {
    items: initialItems,
  },
  reducers: {
    addHistoryItem: {
      reducer(state, action) {
        state.items.unshift(action.payload)
        state.items = state.items.slice(0, 50)
        saveHistory(state.items)
      },
      prepare({ prompt, code }) {
        return {
          payload: {
            id: nanoid(),
            prompt: prompt ?? '',
            code: code ?? '',
            createdAt: Date.now(),
          },
        }
      },
    },
    setHistoryItems(state, action) {
      state.items = Array.isArray(action.payload) ? action.payload : []
      saveHistory(state.items)
    },
    clearHistory(state) {
      state.items = []
      saveHistory(state.items)
    },
    removeHistoryItem(state, action) {
      state.items = state.items.filter((x) => x.id !== action.payload)
      saveHistory(state.items)
    },
  },
})

export const { addHistoryItem, setHistoryItems, clearHistory, removeHistoryItem } = historySlice.actions
export default historySlice.reducer

