import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

const initialState = {
  channels: [],
  messages: [],
  currentChannelId: null,
  status: 'idle',
  error: null,
}

export const fetchChatData = createAsyncThunk(
  'chat/fetchChatData',
  async (token, { rejectWithValue }) => {
    const headers = {
      Authorization: `Bearer ${token}`,
    }

    try {
      const [channelsResponse, messagesResponse] = await Promise.all([
        fetch('/api/v1/channels', { headers }),
        fetch('/api/v1/messages', { headers }),
      ])

      if (!channelsResponse.ok || !messagesResponse.ok) {
        throw new Error('Failed to load chat data')
      }

      const channelsData = await channelsResponse.json()
      const messagesData = await messagesResponse.json()

      return {
        channels: channelsData,
        messages: messagesData,
      }
    } catch (error) {
      return rejectWithValue(error.message)
    }
  },
)

export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (token, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/v1/messages', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load messages')
      }

      return await response.json()
    } catch (error) {
      return rejectWithValue(error.message)
    }
  },
)

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ token, body, channelId, username }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/v1/messages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body, channelId, username }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      return await response.json()
    } catch (error) {
      return rejectWithValue(error.message)
    }
  },
)

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setCurrentChannel(state, action) {
      state.currentChannelId = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChatData.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchChatData.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.channels = action.payload.channels
        state.messages = action.payload.messages
        state.currentChannelId = action.payload.channels[0]?.id ?? null
      })
      .addCase(fetchChatData.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? 'Failed to load chat data'
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.messages = action.payload
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.messages.push(action.payload)
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.error = action.payload ?? 'Failed to send message'
      })
  },
})

export const { setCurrentChannel } = chatSlice.actions
export default chatSlice.reducer
