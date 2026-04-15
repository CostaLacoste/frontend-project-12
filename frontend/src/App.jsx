import { Formik } from 'formik'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as yup from 'yup'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import filter from 'leo-profanity'
import { io } from 'socket.io-client'
import {
  addChannel,
  fetchChatData,
  fetchMessages,
  removeChannel,
  renameChannel,
  sendMessage,
  setCurrentChannel,
} from './store/chatSlice'
import './App.css'

const tokenKey = 'token'
const usernameKey = 'username'

filter.loadDictionary()

const getToken = () => localStorage.getItem(tokenKey)
const getUsername = () => localStorage.getItem(usernameKey)
const clearAuth = () => {
  localStorage.removeItem(tokenKey)
  localStorage.removeItem(usernameKey)
}

const buildChannelSchema = (channels, t, currentName = null) =>
  yup.object({
    name: yup
      .string()
      .trim()
      .min(3, t('validation.channelLength'))
      .max(20, t('validation.channelLength'))
      .required(t('common.required'))
      .test('is-unique', t('validation.unique'), (value) => {
        const normalized = value?.trim().toLowerCase()
        if (!normalized) {
          return false
        }

        return !channels.some((channel) => {
          const channelName = channel.name.trim().toLowerCase()
          if (currentName && channelName === currentName.trim().toLowerCase()) {
            return false
          }

          return channelName === normalized
        })
      }),
  })

const RequireAuth = ({ children }) => {
  if (!getToken()) {
    return <Navigate to="/login" replace />
  }

  return children
}

const ModalLayout = ({ title, children, onClose }) => (
  <div className="modal-backdrop" onClick={onClose} role="presentation">
    <div
      className="modal-body"
      onClick={(event) => event.stopPropagation()}
      role="presentation"
    >
      <h3>{title}</h3>
      {children}
    </div>
  </div>
)

const AppHeader = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isAuthorized = Boolean(getToken())

  return (
    <header className="app-header">
      <Link to="/" className="app-logo-link">{t('header.brand')}</Link>
      {isAuthorized && (
        <button
          type="button"
          className="logout-button"
          onClick={() => {
            clearAuth()
            navigate('/login')
          }}
        >
          {t('header.logout')}
        </button>
      )}
    </header>
  )
}

const HomePage = () => {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const token = getToken()
  const username = getUsername()
  const { channels, messages, currentChannelId, status, error } = useSelector(
    (state) => state.chat,
  )
  const [dropdownChannelId, setDropdownChannelId] = useState(null)
  const [isAddModalOpen, setAddModalOpen] = useState(false)
  const [renameModalChannel, setRenameModalChannel] = useState(null)
  const [removeModalChannel, setRemoveModalChannel] = useState(null)
  const lastErrorRef = useRef(null)
  const messagesBoxRef = useRef(null)

  useEffect(() => {
    if (token) {
      dispatch(fetchChatData(token))
    }
  }, [dispatch, token])

  useEffect(() => {
    if (!token) {
      return undefined
    }

    const timerId = setInterval(() => {
      dispatch(fetchChatData({ token, silent: true }))
    }, 1000)

    return () => {
      clearInterval(timerId)
    }
  }, [dispatch, token])

  useEffect(() => {
    if (!token) {
      return undefined
    }

    const socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
    })
    const syncMessages = () => {
      dispatch(fetchMessages(token))
    }
    const syncChat = () => {
      dispatch(fetchChatData({ token, silent: true }))
    }
    const handleNewChannel = (channel) => {
      dispatch(setCurrentChannel(channel.id))
      syncChat()
    }

    socket.on('newMessage', syncMessages)
    socket.on('newChannel', handleNewChannel)
    socket.on('removeChannel', syncChat)
    socket.on('renameChannel', syncChat)
    socket.on('renameMessage', syncMessages)
    socket.on('removeMessage', syncMessages)

    return () => {
      socket.disconnect()
    }
  }, [dispatch, token])

  useEffect(() => {
    const notifyOffline = () => toast.error(t('toast.noNetwork'))
    window.addEventListener('offline', notifyOffline)

    return () => {
      window.removeEventListener('offline', notifyOffline)
    }
  }, [t])

  useEffect(() => {
    if (!error || error === lastErrorRef.current) {
      return
    }

    lastErrorRef.current = error
    if (!navigator.onLine) {
      toast.error(t('toast.noNetwork'))
      return
    }

    toast.error(t('toast.loadingError'))
  }, [error, t])

  const selectedChannelMessages = messages.filter(
    (message) => String(message.channelId) === String(currentChannelId),
  )
  const currentChannel = channels.find(
    (channel) => String(channel.id) === String(currentChannelId),
  )
  const addChannelSchema = useMemo(
    () => buildChannelSchema(channels, t),
    [channels, t],
  )
  const renameChannelSchema = useMemo(
    () => buildChannelSchema(channels, t, renameModalChannel?.name),
    [channels, renameModalChannel?.name, t],
  )

  const handleRemoveChannel = async (channel) => {
    if (!token) {
      return
    }

    const resultAction = await dispatch(
      removeChannel({ token, channelId: channel.id }),
    )

    if (removeChannel.fulfilled.match(resultAction)) {
      toast.success(t('toast.channelRemoved'))
      return
    }

    toast.error(t('toast.loadingError'))
  }

  useEffect(() => {
    if (!messagesBoxRef.current) {
      return
    }

    messagesBoxRef.current.scrollTop = messagesBoxRef.current.scrollHeight
  }, [selectedChannelMessages, currentChannelId])

  if (status === 'loading') {
    return <main className="chat-page">{t('chat.loading')}</main>
  }

  if (status === 'failed') {
    return <main className="chat-page">{t('chat.error', { message: error })}</main>
  }

  return (
    <>
      <main className="chat-page">
        <aside className="channels">
          <h2>{t('chat.channels')}</h2>
          <button
            type="button"
            className="add-channel-button"
            onClick={() => setAddModalOpen(true)}
            aria-label={t('chat.addChannel')}
          >+</button>
          <ul>
            {channels.map((channel) => (
              <li key={channel.id} className="channel-item">
                <button
                  type="button"
                  className={
                    String(channel.id) === String(currentChannelId)
                      ? 'channel-button active'
                      : 'channel-button'
                  }
                  onClick={() => dispatch(setCurrentChannel(channel.id))}
                >
                  # {filter.clean(channel.name)}
                </button>
                {channel.removable && (
                  <div className="channel-actions">
                    <button
                      type="button"
                      className="channel-menu-button"
                      onClick={() => {
                        setDropdownChannelId((prev) => (
                          prev === channel.id ? null : channel.id
                        ))
                      }}
                    >
                      {t('chat.manage')}
                    </button>
                    {dropdownChannelId === channel.id && (
                      <div className="channel-dropdown">
                        <button
                          type="button"
                          onClick={() => {
                            setRenameModalChannel(channel)
                            setDropdownChannelId(null)
                          }}
                        >
                          {t('chat.rename')}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setDropdownChannelId(null)
                            await handleRemoveChannel(channel)
                          }}
                        >
                          {t('chat.remove')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </aside>

        <section className="messages">
          <h2>
            {currentChannel
              ? t('chat.titleWithChannel', { name: filter.clean(currentChannel.name) })
              : t('chat.title')}
          </h2>
          <div id="messages-box" className="messages-list" ref={messagesBoxRef}>
            {selectedChannelMessages.map((message) => (
              <p key={message.id}>
                <strong>{message.username}: </strong>
                {filter.clean(message.body)}
              </p>
            ))}
          </div>
          <Formik
            initialValues={{ body: '' }}
            onSubmit={async ({ body }, { resetForm }) => {
              if (!token || !username || !currentChannelId || !body.trim()) {
                return
              }

              await dispatch(
                sendMessage({
                  token,
                  body: filter.clean(body.trim()),
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
                  id="message-box"
                  name="body"
                  placeholder={t('chat.messagePlaceholder')}
                  aria-label={t('chat.messageLabel')}
                  onChange={handleChange}
                  value={values.body}
                  required
                  autoFocus
                />
                <button type="submit">{t('chat.send')}</button>
              </form>
            )}
          </Formik>
        </section>
      </main>

      {isAddModalOpen && (
        <ModalLayout
          title={t('modals.addChannelTitle')}
          onClose={() => setAddModalOpen(false)}
        >
          <Formik
            initialValues={{ name: '' }}
            validationSchema={addChannelSchema}
            onSubmit={async ({ name }, { setSubmitting }) => {
              if (!token) {
                return
              }

              const resultAction = await dispatch(
                addChannel({ token, name: filter.clean(name.trim()) }),
              )
              if (addChannel.fulfilled.match(resultAction)) {
                toast.success(t('toast.channelCreated'))
              } else {
                return
              }
              setSubmitting(false)
              setAddModalOpen(false)
            }}
          >
            {({
              handleSubmit,
              handleChange,
              values,
              errors,
              touched,
              isSubmitting,
            }) => (
              <form className="modal-form" onSubmit={handleSubmit}>
                <label htmlFor="channelName">{t('modals.channelName')}</label>
                <input
                  id="channelName"
                  name="name"
                  type="text"
                  placeholder={t('modals.channelName')}
                  aria-label={t('modals.channelName')}
                  onChange={handleChange}
                  value={values.name}
                  autoFocus
                />
                {touched.name && errors.name && (
                  <p className="form-error">{errors.name}</p>
                )}
                <div className="modal-actions">
                  <button type="button" onClick={() => setAddModalOpen(false)}>
                    {t('common.cancel')}
                  </button>
                  <button type="submit" disabled={isSubmitting}>
                    {t('common.submit')}
                  </button>
                </div>
              </form>
            )}
          </Formik>
        </ModalLayout>
      )}

      {renameModalChannel && (
        <ModalLayout
          title={t('modals.renameChannelTitle')}
          onClose={() => setRenameModalChannel(null)}
        >
          <Formik
            initialValues={{ name: renameModalChannel.name }}
            validationSchema={renameChannelSchema}
            onSubmit={async ({ name }, { setSubmitting }) => {
              if (!token) {
                return
              }

              const resultAction = await dispatch(
                renameChannel({
                  token,
                  channelId: renameModalChannel.id,
                  name: filter.clean(name.trim()),
                }),
              )
              if (renameChannel.fulfilled.match(resultAction)) {
                toast.success(t('toast.channelRenamed'))
              } else {
                return
              }
              setSubmitting(false)
              setRenameModalChannel(null)
            }}
          >
            {({
              handleSubmit,
              handleChange,
              values,
              errors,
              touched,
              isSubmitting,
            }) => (
              <form className="modal-form" onSubmit={handleSubmit}>
                <label htmlFor="renameChannelName">{t('modals.channelName')}</label>
                <input
                  id="renameChannelName"
                  name="name"
                  type="text"
                  onChange={handleChange}
                  value={values.name}
                  autoFocus
                />
                {touched.name && errors.name && (
                  <p className="form-error">{errors.name}</p>
                )}
                <div className="modal-actions">
                  <button type="button" onClick={() => setRenameModalChannel(null)}>
                    {t('common.cancel')}
                  </button>
                  <button type="submit" disabled={isSubmitting}>
                    {t('common.submit')}
                  </button>
                </div>
              </form>
            )}
          </Formik>
        </ModalLayout>
      )}

      {removeModalChannel && (
        <ModalLayout
          title={t('modals.removeChannelTitle')}
          onClose={() => setRemoveModalChannel(null)}
        >
          <Formik
            initialValues={{ confirm: '' }}
            onSubmit={async (_, { setSubmitting }) => {
              if (!token) {
                return
              }

              const resultAction = await dispatch(
                removeChannel({ token, channelId: removeModalChannel.id }),
              )
              if (removeChannel.fulfilled.match(resultAction)) {
                toast.success(t('toast.channelRemoved'))
              } else {
                return
              }
              setSubmitting(false)
              setRemoveModalChannel(null)
            }}
          >
            {({ handleSubmit, isSubmitting }) => (
              <form
                className="modal-form"
                onSubmit={handleSubmit}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleSubmit()
                  }
                }}
              >
                <p>{t('modals.removeConfirm')}</p>
                <div className="modal-actions">
                  <button type="button" onClick={() => setRemoveModalChannel(null)}>
                    {t('common.cancel')}
                  </button>
                  <button type="submit" disabled={isSubmitting} autoFocus>
                    {t('common.remove')}
                  </button>
                </div>
              </form>
            )}
          </Formik>
        </ModalLayout>
      )}
    </>
  )
}

const LoginPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (getToken()) {
    return <Navigate to="/" replace />
  }

  return (
    <main>
      <h1>{t('auth.loginTitle')}</h1>
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
            setStatus(t('auth.invalidCredentials'))
            setSubmitting(false)
          }
        }}
      >
        {({ handleSubmit, handleChange, values, isSubmitting, status }) => (
          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username">{t('auth.username')}</label>
              <input
                id="username"
                name="username"
                type="text"
                onChange={handleChange}
                value={values.username}
              />
            </div>
            <div>
              <label htmlFor="password">{t('auth.password')}</label>
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
              {t('auth.signIn')}
            </button>
          </form>
        )}
      </Formik>
      <p>
        {t('auth.noAccount')} <Link to="/signup">{t('auth.signUpLink')}</Link>
      </p>
    </main>
  )
}

const SignupPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const signupSchema = useMemo(
    () => yup.object({
      username: yup
        .string()
        .trim()
        .min(3, t('validation.usernameLength'))
        .max(20, t('validation.usernameLength'))
        .required(t('common.required')),
      password: yup
        .string()
        .min(6, t('validation.passwordLength'))
        .required(t('common.required')),
      confirmPassword: yup
        .string()
        .required(t('common.required'))
        .oneOf([yup.ref('password')], t('validation.passwordsMatch')),
    }),
    [t],
  )

  if (getToken()) {
    return <Navigate to="/" replace />
  }

  return (
    <main>
      <h1>{t('auth.signupTitle')}</h1>
      <Formik
        initialValues={{ username: '', password: '', confirmPassword: '' }}
        validationSchema={signupSchema}
        onSubmit={async (
          { username, password },
          { setStatus, setSubmitting },
        ) => {
          setStatus(null)

          try {
            const response = await fetch('/api/v1/signup', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ username: username.trim(), password }),
            })

            if (response.status === 409) {
              setStatus(t('auth.userExists'))
              setSubmitting(false)
              return
            }

            if (!response.ok) {
              throw new Error('Signup failed')
            }

            const data = await response.json()
            localStorage.setItem(tokenKey, data.token)
            localStorage.setItem(usernameKey, data.username)
            navigate('/')
          } catch {
            setStatus(t('auth.signupFailed'))
            setSubmitting(false)
          }
        }}
      >
        {({
          handleSubmit,
          handleChange,
          values,
          errors,
          touched,
          isSubmitting,
          status,
        }) => (
          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="signup-username">{t('auth.signupUsername')}</label>
              <input
                id="signup-username"
                name="username"
                type="text"
                onChange={handleChange}
                value={values.username}
              />
              {touched.username && errors.username && (
                <p className="form-error">{errors.username}</p>
              )}
            </div>
            <div>
              <label htmlFor="signup-password">{t('auth.password')}</label>
              <input
                id="signup-password"
                name="password"
                type="password"
                onChange={handleChange}
                value={values.password}
              />
              {touched.password && errors.password && (
                <p className="form-error">{errors.password}</p>
              )}
            </div>
            <div>
              <label htmlFor="signup-confirm-password">{t('auth.confirmPassword')}</label>
              <input
                id="signup-confirm-password"
                name="confirmPassword"
                type="password"
                onChange={handleChange}
                value={values.confirmPassword}
              />
              {touched.confirmPassword && errors.confirmPassword && (
                <p className="form-error">{errors.confirmPassword}</p>
              )}
            </div>
            {status && <p className="form-error">{status}</p>}
            <button type="submit" disabled={isSubmitting}>
              {t('auth.register')}
            </button>
          </form>
        )}
      </Formik>
      <p>
        {t('auth.hasAccount')} <Link to="/login">{t('auth.logInLink')}</Link>
      </p>
    </main>
  )
}

const NotFoundPage = () => (
  <main>
    <NotFoundContent />
  </main>
)

const NotFoundContent = () => {
  const { t } = useTranslation()

  return (
    <>
      <h1>{t('notFound.title')}</h1>
      <p>{t('notFound.text')}</p>
      <Link to="/">{t('header.brand')}</Link>
    </>
  )
}

function App() {
  return (
    <>
      <AppHeader />
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
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  )
}

export default App
