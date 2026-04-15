import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

const extractList = (payload, key) => {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.[key])) {
    return payload[key]
  }

  return []
}

const extractItem = (payload, key) => payload?.[key] ?? payload

const initialState = {
  channels: [],
  messages: [],
  currentChannelId: null,
  status: 'idle',
  error: null,
}

const normalizeFetchArg = (arg) => {
  if (typeof arg === 'string') {
    return { token: arg, silent: false }
  }

  return { token: arg.token, silent: Boolean(arg.silent) }
}

export const fetchChatData = createAsyncThunk(
  'chat/fetchChatData',
  async (arg, { rejectWithValue }) => {
    const { token } = normalizeFetchArg(arg)
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
        channels: extractList(channelsData, 'channels'),
        messages: extractList(messagesData, 'messages'),
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

      const payload = await response.json()
      return extractList(payload, 'messages')
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

      const payload = await response.json()
      return extractItem(payload, 'message')
    } catch (error) {
      return rejectWithValue(error.message)
    }
  },
)

export const addChannel = createAsyncThunk(
  'chat/addChannel',
  async ({ token, name }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/v1/channels', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        throw new Error('Failed to add channel')
      }

      const payload = await response.json()
      return extractItem(payload, 'channel')
    } catch (error) {
      return rejectWithValue(error.message)
    }
  },
)

export const renameChannel = createAsyncThunk(
  'chat/renameChannel',
  async ({ token, channelId, name }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/channels/${channelId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        throw new Error('Failed to rename channel')
      }

      const payload = await response.json()
      return extractItem(payload, 'channel')
    } catch (error) {
      return rejectWithValue(error.message)
    }
  },
)

export const removeChannel = createAsyncThunk(
  'chat/removeChannel',
  async ({ token, channelId }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/v1/channels/${channelId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to remove channel')
      }

      return { id: String(channelId) }
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
      .addCase(fetchChatData.pending, (state, action) => {
        const { silent } = normalizeFetchArg(action.meta.arg)
        if (!silent) {
          state.status = 'loading'
          state.error = null
        }
      })
      .addCase(fetchChatData.fulfilled, (state, action) => {
        state.status = 'succeeded'
        const previousId = state.currentChannelId
        state.channels = action.payload.channels
        state.messages = action.payload.messages
        const channels = action.payload.channels
        const keepSelection =
          previousId != null
          && channels.some((ch) => String(ch.id) === String(previousId))
        state.currentChannelId = keepSelection
          ? previousId
          : channels[0]?.id ?? null
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
      .addCase(addChannel.fulfilled, (state, action) => {
        state.channels.push(action.payload)
        state.currentChannelId = action.payload.id
      })
      .addCase(addChannel.rejected, (state, action) => {
        state.error = action.payload ?? 'Failed to add channel'
      })
      .addCase(renameChannel.fulfilled, (state, action) => {
        const index = state.channels.findIndex(
          (channel) => String(channel.id) === String(action.payload.id),
        )
        if (index !== -1) {
          state.channels[index] = action.payload
        }
      })
      .addCase(renameChannel.rejected, (state, action) => {
        state.error = action.payload ?? 'Failed to rename channel'
      })
      .addCase(removeChannel.fulfilled, (state, action) => {
        const removedId = String(action.payload.id)
        state.channels = state.channels.filter(
          (channel) => String(channel.id) !== removedId,
        )
        state.messages = state.messages.filter(
          (message) => String(message.channelId) !== removedId,
        )

        if (String(state.currentChannelId) === removedId) {
          state.currentChannelId = state.channels[0]?.id ?? null
        }
      })
      .addCase(removeChannel.rejected, (state, action) => {
        state.error = action.payload ?? 'Failed to remove channel'
      })
  },
})

export const { setCurrentChannel } = chatSlice.actions
export default chatSlice.reducer
