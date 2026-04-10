import { Formik } from 'formik'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import {
  fetchChatData,
  fetchMessages,
  sendMessage,
  setCurrentChannel,
} from './store/chatSlice'
import './App.css'

const tokenKey = 'token'
const usernameKey = 'username'

const getToken = () => localStorage.getItem(tokenKey)
const getUsername = () => localStorage.getItem(usernameKey)

const RequireAuth = ({ children }) => {
  if (!getToken()) {
    return <Navigate to="/login" replace />
  }

  return children
}

const HomePage = () => {
  const dispatch = useDispatch()
  const { channels, messages, currentChannelId, status, error } = useSelector(
    (state) => state.chat,
  )

  useEffect(() => {
    const token = getToken()
    if (token) {
      dispatch(fetchChatData(token))
    }
  }, [dispatch])

  useEffect(() => {
    const token = getToken()
    if (!token) {
      return undefined
    }

    const timerId = setInterval(() => {
      dispatch(fetchMessages(token))
    }, 5000)

    return () => {
      clearInterval(timerId)
    }
  }, [dispatch])

  const selectedChannelMessages = messages.filter(
    (message) => String(message.channelId) === String(currentChannelId),
  )

  if (status === 'loading') {
    return <main className="chat-page">Loading chat data...</main>
  }

  if (status === 'failed') {
    return <main className="chat-page">Error: {error}</main>
  }

  return (
    <main className="chat-page">
      <aside className="channels">
        <h2>Channels</h2>
        <ul>
          {channels.map((channel) => (
            <li key={channel.id}>
              <button
                type="button"
                className={
                  String(channel.id) === String(currentChannelId)
                    ? 'channel-button active'
                    : 'channel-button'
                }
                onClick={() => dispatch(setCurrentChannel(channel.id))}
              >
                {channel.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="messages">
        <h2>
          Chat
          {currentChannelId
            ? `: ${channels.find((channel) => String(channel.id) === String(currentChannelId))?.name ?? ''}`
            : ''}
        </h2>
        <div className="messages-list">
          {selectedChannelMessages.map((message) => (
            <p key={message.id}>
              <strong>{message.username}: </strong>
              {message.body}
            </p>
          ))}
        </div>
        <Formik
          initialValues={{ body: '' }}
          onSubmit={async ({ body }, { resetForm }) => {
            const token = getToken()
            const username = getUsername()

            if (!token || !username || !currentChannelId || !body.trim()) {
              return
            }

            await dispatch(
              sendMessage({
                token,
                body: body.trim(),
                channelId: currentChannelId,
                username,
              }),
            )
            resetForm()
          }}
        >
          {({ handleSubmit, handleChange, values }) => (
            <form className="new-message-form" onSubmit={handleSubmit}>
              <input
                type="text"
                name="body"
                placeholder="Type your message..."
                aria-label="New message"
                onChange={handleChange}
                value={values.body}
              />
              <button type="submit">Send</button>
            </form>
          )}
        </Formik>
      </section>
    </main>
  )
}

const LoginPage = () => {
  const navigate = useNavigate()

  if (getToken()) {
    return <Navigate to="/" replace />
  }

  return (
    <main>
      <h1>Login</h1>
      <Formik
        initialValues={{ username: '', password: '' }}
        onSubmit={async (values, { setStatus, setSubmitting }) => {
          setStatus(null)

          try {
            const response = await fetch('/api/v1/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(values),
            })

            if (!response.ok) {
              throw new Error('Invalid username or password')
            }

            const data = await response.json()
            localStorage.setItem(tokenKey, data.token)
            localStorage.setItem(usernameKey, data.username)
            navigate('/')
          } catch {
            setStatus('Authorization failed. Check username or password.')
            setSubmitting(false)
          }
        }}
      >
        {({ handleSubmit, handleChange, values, isSubmitting, status }) => (
          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                onChange={handleChange}
                value={values.username}
              />
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                onChange={handleChange}
                value={values.password}
              />
            </div>
            {status && <p>{status}</p>}
            <button type="submit" disabled={isSubmitting}>
              Sign in
            </button>
          </form>
        )}
      </Formik>
      <p>
        <Link to="/">Back to home</Link>
      </p>
    </main>
  )
}

const NotFoundPage = () => (
  <main>
    <h1>404</h1>
    <p>Page not found.</p>
    <Link to="/">Back to home</Link>
  </main>
)

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={(
          <RequireAuth>
            <HomePage />
          </RequireAuth>
        )}
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  )
}

export default App
